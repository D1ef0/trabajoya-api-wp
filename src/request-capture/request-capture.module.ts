import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestCaptureMiddleware } from './request-capture.middleware';
import { RequestCaptureService } from './request-capture.service';

@Module({
  providers: [RequestCaptureService, RequestCaptureMiddleware],
  exports: [RequestCaptureService],
})
export class RequestCaptureModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestCaptureMiddleware).forRoutes('*');
  }
}
