import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessageDirection, SessionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';

@Controller('admin/api')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('sessions')
  listSessions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: SessionStatus,
    @Query('search') search?: string,
  ) {
    return this.adminService.listSessions({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      search,
    });
  }

  @Get('sessions/:waNumber')
  getSession(@Param('waNumber') waNumber: string) {
    return this.adminService.getSession(decodeURIComponent(waNumber));
  }

  @Get('messages')
  listMessages(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('direction') direction?: MessageDirection,
    @Query('sessionId') sessionId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listMessages({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      direction,
      sessionId,
      search,
    });
  }

  @Get('analytics/funnel')
  getFunnel() {
    return this.adminService.getFunnel();
  }

  @Get('webhook-events')
  listWebhookEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listWebhookEvents({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
