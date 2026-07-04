import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUiController } from './admin-ui.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, AdminUiController],
  providers: [AdminService],
})
export class AdminModule {}
