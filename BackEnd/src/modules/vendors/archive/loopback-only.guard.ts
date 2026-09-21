import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * The archive endpoints are for the agent running ON the office host. They
 * must never be reachable through the Cloudflare tunnel: only loopback
 * connections pass, and any request carrying Cloudflare's connecting-IP
 * header (i.e. that came through the tunnel) is refused even if proxied.
 * Set ARCHIVE_API_ALLOW_REMOTE=true only for a deliberately separate agent host.
 */
@Injectable()
export class LoopbackOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.ARCHIVE_API_ALLOW_REMOTE === 'true') return true;
    const req = context.switchToHttp().getRequest();
    const ip: string = req.socket?.remoteAddress ?? req.ip ?? '';
    const loopback = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    if (!loopback || req.headers['cf-connecting-ip']) throw new ForbiddenException('Archive API is local-only');
    return true;
  }
}
