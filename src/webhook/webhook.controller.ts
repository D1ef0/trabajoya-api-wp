import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common/interfaces';
import { Request } from 'express';
import { WebhookService } from './webhook.service';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('zavu')
  @HttpCode(200)
  async handleZavuWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-zavu-signature') signature?: string,
  ) {
    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new UnauthorizedException('Missing raw body for signature check');
    }

    await this.webhookService.handleInbound(rawBody, signature);
    return 'OK';
  }
}
