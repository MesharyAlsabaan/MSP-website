import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Accounts, applications and documents are personal data: never cacheable by
 * browsers, Cloudflare (CDN-Cache-Control) or any proxy in between.
 */
@Injectable()
export class NoStoreMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('CDN-Cache-Control', 'no-store');
    next();
  }
}
