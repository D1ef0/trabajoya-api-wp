import { Controller, Get, Redirect } from '@nestjs/common';

@Controller()
export class AdminUiController {
  @Get('admin')
  @Redirect('/admin/', 302)
  adminRoot() {}

  @Get('amin')
  @Redirect('/admin/', 302)
  adminTypo() {}
}
