import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface PublicRequest {
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
  user?: unknown;
}

/** The admin's draft/inactive preview flags on public list endpoints. */
function wantsUnpublished(request: PublicRequest): boolean {
  return request.query?.['includeDrafts'] === 'true' || request.query?.['includeInactive'] === 'true';
}

/**
 * Global guard: every route requires a valid JWT unless decorated with
 * @Public(). Registered as an APP_GUARD in AppModule.
 *
 * On @Public() routes a bearer token is optional: when a valid one is sent
 * (the admin previewing drafts), request.user is set so the handler can
 * widen what it returns; a missing, expired or invalid token leaves the
 * request anonymous. One exception: a request that sends a token AND asks
 * for unpublished content (`includeDrafts` / `includeInactive`) gets a 401
 * when that token is expired or invalid, so the admin refreshes its session
 * and retries instead of silently seeing published items only.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.isPublic(context)) return (await super.canActivate(context)) as boolean;

    const request = context.switchToHttp().getRequest<PublicRequest>();
    if (!request.headers?.['authorization']) return true;
    try {
      await super.canActivate(context);
    } catch {
      // Treated as anonymous below.
    }
    if (!request.user && wantsUnpublished(request)) {
      throw new UnauthorizedException('Session expired');
    }
    return true;
  }

  handleRequest<TUser>(err: unknown, user: TUser, info: unknown, context: ExecutionContext): TUser {
    if (this.isPublic(context)) return (user || undefined) as TUser;
    return super.handleRequest(err, user, info, context);
  }

  private isPublic(context: ExecutionContext): boolean {
    return !!this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
