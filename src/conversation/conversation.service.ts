import { Injectable, Logger } from '@nestjs/common';
import { ConversationSession } from '@prisma/client';
import { TrabajoyaService } from '../trabajoya/trabajoya.service';
import {
  TrabajoyaApiError,
  TrabajoyaNotConfiguredError,
} from '../trabajoya/trabajoya.types';
import { ZavuInboundMessageData } from '../zavu/zavu.types';
import { ConversationCopy } from './conversation.copy';
import { ConversationStep } from './conversation.constants';
import {
  ConversationHandleResult,
  parseConversationContext,
} from './conversation.types';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private readonly trabajoyaService: TrabajoyaService) {}

  async handle(
    session: ConversationSession,
    data: ZavuInboundMessageData,
    waNumber: string,
  ): Promise<ConversationHandleResult> {
    const context = parseConversationContext(session.context);

    switch (session.currentStep) {
      case ConversationStep.MENU_ROOT:
        return this.handleMenuRoot();
      case ConversationStep.ASK_FULL_NAME:
        return this.handleAskFullName(data, waNumber);
      case ConversationStep.INTAKE_REGISTERED:
        return this.handleIntakeRegistered(data, context);
      case ConversationStep.MENU_MAIN:
        return this.handleMenuMain();
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

  private async handleAskFullName(
    data: ZavuInboundMessageData,
    waNumber: string,
  ): Promise<ConversationHandleResult> {
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

    try {
      const result = await this.trabajoyaService.createIntake({
        phone: waNumber,
        fullName,
      });

      return {
        replyText: ConversationCopy.registrationSuccess(fullName, result.url),
        nextStep: ConversationStep.INTAKE_REGISTERED,
        contextPatch: {
          fullName,
          intakeCode: result.code,
          intakeUrl: result.url,
        },
      };
    } catch (error) {
      return this.handleIntakeError(error);
    }
  }

  private handleIntakeRegistered(
    data: ZavuInboundMessageData,
    context: ReturnType<typeof parseConversationContext>,
  ): ConversationHandleResult {
    if (isMenuCommand(data.text)) {
      return {
        replyText: ConversationCopy.mainMenuPlaceholder,
        nextStep: ConversationStep.MENU_MAIN,
      };
    }

    const url = context.intakeUrl ?? '';
    return {
      replyText: ConversationCopy.alreadyRegistered(url),
      nextStep: ConversationStep.INTAKE_REGISTERED,
    };
  }

  private handleMenuMain(): ConversationHandleResult {
    return {
      replyText: ConversationCopy.mainMenuPlaceholder,
      nextStep: ConversationStep.MENU_MAIN,
    };
  }

  private handleIntakeError(error: unknown): ConversationHandleResult {
    if (error instanceof TrabajoyaNotConfiguredError) {
      return {
        replyText: ConversationCopy.serviceUnavailable,
        nextStep: ConversationStep.ASK_FULL_NAME,
      };
    }

    if (error instanceof TrabajoyaApiError) {
      if (error.publicError === 'invalid_phone') {
        return {
          replyText: ConversationCopy.invalidPhone,
          nextStep: ConversationStep.ASK_FULL_NAME,
        };
      }

      if (error.statusCode === 401) {
        this.logger.error('TrabajoYa API key rejected');
        return {
          replyText: ConversationCopy.serviceUnavailable,
          nextStep: ConversationStep.ASK_FULL_NAME,
        };
      }
    }

    return {
      replyText: ConversationCopy.registrationFailed,
      nextStep: ConversationStep.ASK_FULL_NAME,
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

function isMenuCommand(text: string | undefined): boolean {
  return text?.trim().toLowerCase() === 'menu';
}
