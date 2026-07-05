import { Injectable, Logger } from '@nestjs/common';
import { ConversationSession } from '@prisma/client';
import { CvParseError } from '../cv-parser/cv-parser.types';
import { CvParserService } from '../cv-parser/cv-parser.service';
import { TrabajoyaService } from '../trabajoya/trabajoya.service';
import {
  TrabajoyaApiError,
  TrabajoyaNotConfiguredError,
} from '../trabajoya/trabajoya.types';
import {
  buildInboundMediaDebug,
  isDocumentInbound,
  normalizeZavuInboundData,
  resolveInboundSelection,
} from '../zavu/zavu-inbound.util';
import { ZavuService } from '../zavu/zavu.service';
import { ZavuInboundMessageData } from '../zavu/zavu.types';
import { ConversationCopy } from './conversation.copy';
import {
  ConversationStep,
  MenuOption,
} from './conversation.constants';
import { buildMainMenuInteractive } from './conversation.menu';
import { resolveMenuOptionFromInbound } from './conversation.menu-options';
import {
  ConversationContext,
  ConversationHandleResult,
  parseConversationContext,
} from './conversation.types';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly trabajoyaService: TrabajoyaService,
    private readonly cvParserService: CvParserService,
    private readonly zavuService: ZavuService,
  ) {}

  async handle(
    session: ConversationSession,
    data: ZavuInboundMessageData,
    waNumber: string,
  ): Promise<ConversationHandleResult> {
    const normalized = normalizeZavuInboundData(data);
    const context = parseConversationContext(session.context);
    const inbound = resolveInboundSelection(normalized);
    const menuOption = resolveMenuOptionFromInbound(normalized);

    if (isResetCommand(inbound) || menuOption === MenuOption.RESET) {
      return this.handleReset();
    }

    if (isMenuCommand(inbound)) {
      return this.handleMenuCommand(session.currentStep, context);
    }

    if (menuOption === MenuOption.PROFILE && context.intakeUrl) {
      return this.showProfileLink(context);
    }

    switch (session.currentStep) {
      case ConversationStep.MENU_ROOT:
        return this.handleMenuRoot();
      case ConversationStep.ASK_FULL_NAME:
        return this.handleAskFullName(normalized);
      case ConversationStep.ASK_CV:
        return this.handleAskCv(normalized, context, waNumber);
      case ConversationStep.INTAKE_REGISTERED:
      case ConversationStep.MENU_MAIN:
        return this.showMainMenu(context);
      default:
        this.logger.warn(
          `Unknown step "${session.currentStep}" for session ${session.id}, resetting to MENU_ROOT`,
        );
        return this.handleMenuRoot();
    }
  }

  private handleMenuRoot(): ConversationHandleResult {
    return {
      replyText: ConversationCopy.welcome,
      nextStep: ConversationStep.ASK_FULL_NAME,
    };
  }

  private handleAskFullName(
    data: ZavuInboundMessageData,
  ): ConversationHandleResult {
    if (data.buttonReply || data.listReply) {
      return {
        replyText: ConversationCopy.invalidName,
        nextStep: ConversationStep.ASK_FULL_NAME,
      };
    }

    const fullName = data.text?.trim() ?? '';
    if (!isValidFullName(fullName)) {
      return {
        replyText: ConversationCopy.invalidName,
        nextStep: ConversationStep.ASK_FULL_NAME,
      };
    }

    return {
      replyText: ConversationCopy.askCv(fullName),
      nextStep: ConversationStep.ASK_CV,
      contextPatch: { fullName },
    };
  }

  private async handleAskCv(
    data: ZavuInboundMessageData,
    context: ConversationContext,
    waNumber: string,
  ): Promise<ConversationHandleResult> {
    const fullName = context.fullName;
    if (!fullName) {
      return this.handleMenuRoot();
    }

    if (isSkipCvCommand(data.text)) {
      return this.completeRegistration(waNumber, fullName);
    }

    if (data.buttonReply || data.listReply) {
      return {
        replyText: ConversationCopy.invalidCv,
        nextStep: ConversationStep.ASK_CV,
      };
    }

    if (!isDocumentInbound(data)) {
      return {
        replyText: ConversationCopy.invalidCv,
        nextStep: ConversationStep.ASK_CV,
        processingMeta: {
          step: ConversationStep.ASK_CV,
          result: 'invalid_cv_input',
          inbound: buildInboundMediaDebug(data),
        },
      };
    }

    const media = await this.zavuService.resolveInboundMedia(data);
    if (!media.url) {
      this.logger.warn(
        `CV media unresolved for ${waNumber}: ${JSON.stringify(media.debug)}`,
      );

      return {
        replyText: ConversationCopy.cvParseFailed,
        nextStep: ConversationStep.ASK_CV,
        processingMeta: {
          step: ConversationStep.ASK_CV,
          result: 'missing_media_url',
          inbound: buildInboundMediaDebug(data),
          media: media.debug,
        },
      };
    }

    try {
      const parsed = await this.cvParserService.convertFromUrl(
        media.url,
        media.filename,
        media.mimeType,
      );

      return this.completeRegistration(
        waNumber,
        fullName,
        parsed.text,
        parsed.fileName,
        {
          step: ConversationStep.ASK_CV,
          result: 'cv_parsed',
          inbound: buildInboundMediaDebug(data),
          media: media.debug,
          cvFileName: parsed.fileName,
          cvTextLength: parsed.text.length,
        },
      );
    } catch (error) {
      if (error instanceof CvParseError) {
        this.logger.warn(
          `CV parse failed for ${waNumber} (${error.code}): ${error.message}`,
        );

        if (error.code === 'unsupported_format') {
          return {
            replyText: ConversationCopy.cvUnsupportedFormat,
            nextStep: ConversationStep.ASK_CV,
            processingMeta: {
              step: ConversationStep.ASK_CV,
              result: 'unsupported_format',
              errorCode: error.code,
              inbound: buildInboundMediaDebug(data),
              media: media.debug,
            },
          };
        }

        return {
          replyText: ConversationCopy.cvParseFailed,
          nextStep: ConversationStep.ASK_CV,
          processingMeta: {
            step: ConversationStep.ASK_CV,
            result: 'cv_parse_failed',
            errorCode: error.code,
            errorMessage: error.message,
            inbound: buildInboundMediaDebug(data),
            media: media.debug,
          },
        };
      }

      this.logger.error(`Unexpected CV parse error: ${String(error)}`);
      return {
        replyText: ConversationCopy.cvParseFailed,
        nextStep: ConversationStep.ASK_CV,
        processingMeta: {
          step: ConversationStep.ASK_CV,
          result: 'cv_parse_failed',
          errorCode: 'unexpected_error',
          inbound: buildInboundMediaDebug(data),
          media: media.debug,
        },
      };
    }
  }

  private async completeRegistration(
    waNumber: string,
    fullName: string,
    cvText?: string,
    cvFileName?: string,
    processingMeta?: Record<string, unknown>,
  ): Promise<ConversationHandleResult> {
    try {
      return await this.createIntakeAndReply(
        waNumber,
        fullName,
        cvText,
        cvFileName,
        processingMeta,
      );
    } catch (error) {
      if (!cvText) {
        return this.handleIntakeError(error, processingMeta);
      }

      this.logger.warn(
        `Intake with CV failed for ${waNumber}, retrying without CV: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      try {
        return await this.createIntakeAndReply(
          waNumber,
          fullName,
          undefined,
          undefined,
          {
            ...(processingMeta ?? {}),
            cvFallback: true,
            cvFallbackReason:
              error instanceof Error ? error.message : String(error),
          },
          true,
        );
      } catch (retryError) {
        return this.handleIntakeError(retryError, {
          ...(processingMeta ?? {}),
          cvFallbackAttempted: true,
          cvFallbackReason:
            error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async createIntakeAndReply(
    waNumber: string,
    fullName: string,
    cvText?: string,
    cvFileName?: string,
    processingMeta?: Record<string, unknown>,
    withoutCv = false,
  ): Promise<ConversationHandleResult> {
    const result = await this.trabajoyaService.createIntake({
      phone: waNumber,
      fullName,
      cvText,
      cvFileName,
      cvSource: cvText ? 'whatsapp' : undefined,
    });

    const replyText = withoutCv
      ? ConversationCopy.registrationSuccessWithoutCv(fullName, result.url)
      : ConversationCopy.registrationSuccess(fullName, result.url);

    return {
      replyText,
      nextStep: ConversationStep.MENU_MAIN,
      contextPatch: {
        fullName,
        intakeCode: result.code,
        intakeUrl: result.url,
        cvFileName: withoutCv ? undefined : cvFileName,
        cvSkipped: withoutCv || !cvText,
      },
      processingMeta,
    };
  }

  private handleMenuCommand(
    currentStep: string,
    context: ConversationContext,
  ): ConversationHandleResult {
    if (context.intakeUrl) {
      return this.showMainMenu(context);
    }

    if (currentStep === ConversationStep.MENU_ROOT) {
      return this.handleMenuRoot();
    }

    return {
      replyText: ConversationCopy.completeRegistrationFirst,
      nextStep: currentStep,
    };
  }

  private showMainMenu(_context: ConversationContext): ConversationHandleResult {
    return {
      replyText: '',
      replyInteractive: buildMainMenuInteractive(ConversationCopy.mainMenuPrompt),
      nextStep: ConversationStep.MENU_MAIN,
    };
  }

  private showProfileLink(context: ConversationContext): ConversationHandleResult {
    const url = context.intakeUrl ?? '';

    return {
      replyText: ConversationCopy.profileLink(url),
      replyInteractive: buildMainMenuInteractive(
        ConversationCopy.mainMenuPrompt,
      ),
      nextStep: ConversationStep.MENU_MAIN,
    };
  }

  private handleReset(): ConversationHandleResult {
    return {
      replyText: `${ConversationCopy.resetDone}\n\n${ConversationCopy.welcome}`,
      nextStep: ConversationStep.ASK_FULL_NAME,
      resetSession: true,
    };
  }

  private handleIntakeError(
    error: unknown,
    processingMeta?: Record<string, unknown>,
  ): ConversationHandleResult {
    const baseMeta: Record<string, unknown> = {
      ...(processingMeta ?? {}),
      step: processingMeta?.step ?? ConversationStep.ASK_CV,
      result: 'intake_create_failed',
    };

    if (error instanceof TrabajoyaNotConfiguredError) {
      return {
        replyText: ConversationCopy.serviceUnavailable,
        nextStep: ConversationStep.ASK_CV,
        processingMeta: {
          ...baseMeta,
          errorCode: 'trabajoya_not_configured',
        },
      };
    }

    if (error instanceof TrabajoyaApiError) {
      const meta = {
        ...baseMeta,
        trabajoyaStatus: error.statusCode,
        trabajoyaError: error.publicError ?? error.message,
      };

      if (
        error.publicError === 'invalid_phone' ||
        error.publicError?.includes('telefono de El Salvador')
      ) {
        return {
          replyText: ConversationCopy.invalidPhone,
          nextStep: ConversationStep.ASK_CV,
          processingMeta: meta,
        };
      }

      if (error.statusCode === 401) {
        this.logger.error('TrabajoYa API key rejected');
        return {
          replyText: ConversationCopy.serviceUnavailable,
          nextStep: ConversationStep.ASK_CV,
          processingMeta: meta,
        };
      }

      if (
        error.statusCode === 0 ||
        error.statusCode >= 500 ||
        error.publicError?.includes('Postgres')
      ) {
        return {
          replyText: ConversationCopy.serviceUnavailable,
          nextStep: ConversationStep.ASK_CV,
          processingMeta: meta,
        };
      }

      if (error.publicError && isUserFacingTrabajoyaError(error.publicError)) {
        return {
          replyText: error.publicError,
          nextStep: ConversationStep.ASK_CV,
          processingMeta: meta,
        };
      }

      this.logger.error(
        `TrabajoYa intake failed: status=${error.statusCode} error=${error.publicError ?? error.message}`,
      );

      return {
        replyText: ConversationCopy.registrationFailed,
        nextStep: ConversationStep.ASK_CV,
        processingMeta: meta,
      };
    }

    this.logger.error(`Unexpected intake error: ${String(error)}`);

    return {
      replyText: ConversationCopy.registrationFailed,
      nextStep: ConversationStep.ASK_CV,
      processingMeta: {
        ...baseMeta,
        errorCode: 'unexpected_error',
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function isValidFullName(value: string): boolean {
  if (value.length < 3) {
    return false;
  }

  const words = value.split(/\s+/).filter(Boolean);
  return words.length >= 2;
}

function normalizeCommand(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.trim().toLowerCase().replace(/\*/g, '');
}

function isMenuCommand(value: string | undefined): boolean {
  return normalizeCommand(value) === 'menu';
}

function isResetCommand(value: string | undefined): boolean {
  const normalized = normalizeCommand(value);
  return normalized === 'reiniciar' || normalized === 'reset';
}

function isSkipCvCommand(text: string | undefined): boolean {
  const normalized = normalizeCommand(text);
  return normalized === 'omitir' || normalized === 'omitir cv' || normalized === 'skip';
}

function isUserFacingTrabajoyaError(message: string): boolean {
  if (message.length > 240) {
    return false;
  }

  const blockedPatterns = [
    /duplicate key/i,
    /violates/i,
    /syntax error/i,
    /invalid response/i,
    /ECONNREFUSED/i,
  ];

  return !blockedPatterns.some((pattern) => pattern.test(message));
}
