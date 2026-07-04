import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';

const ADMIN_INDEX_HTML = join(__dirname, '..', '..', 'public', 'admin', 'index.html');

@Controller()
export class AdminUiController {
  @Get('admin')
  adminRoot(@Req() req: Request, @Res() res: Response) {
    if (req.path === '/admin/') {
      res.sendFile(ADMIN_INDEX_HTML);
      return;
    }

    res.redirect(302, '/admin/');
  }

  @Get('amin')
  adminTypo(@Res() res: Response) {
    res.redirect(302, '/admin/');
  }
}
