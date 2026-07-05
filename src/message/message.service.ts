import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { normalizeOutboundPhone } from '../common/phone.util';
import { ZavuService } from '../zavu/zavu.service';
import { SendTextDto } from './dto/send-text.dto';

const MAX_TEXT_LENGTH = 5000;

export interface SendTextMessageResult {
  ok: true;
  messageId: string;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(private readonly zavu: ZavuService) {}

  async sendTextMessage(dto: SendTextDto): Promise<SendTextMessageResult> {
    if (!this.zavu.isConfigured()) {
      throw new ServiceUnavailableException('Zavu API is not configured');
    }

    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException(
        'Request body must be JSON with text and phone fields',
      );
    }

    const text = typeof dto.text === 'string' ? dto.text.trim() : '';
    if (!text) {
      throw new BadRequestException(
        'text is required (send JSON body, not form-data)',
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new BadRequestException(
        `text must be at most ${MAX_TEXT_LENGTH} characters`,
      );
    }

    const phone = normalizeOutboundPhone(dto.phone);

    const sendResult = await this.zavu.sendText(
      phone,
      text,
      dto.idempotencyKey,
    );

    if (!sendResult.ok) {
      throw new BadGatewayException(
        sendResult.failure.message ?? 'Failed to send WhatsApp text message',
      );
    }

    const messageId =
      (sendResult.response as { message?: { id?: string } })?.message?.id ??
      'unknown';

    this.logger.log(
      `WhatsApp text sent to ${phone} (messageId=${messageId})`,
    );

    return {
      ok: true,
      messageId,
    };
  }
}
