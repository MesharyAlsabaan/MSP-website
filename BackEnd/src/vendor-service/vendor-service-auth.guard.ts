import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { StaffTokenService } from '../modules/auth/staff-token.service';
import { VendorAccountsService } from '../modules/vendors/accounts/vendor-accounts.service';

export const VENDOR_AUTH_KEY = 'vendorAuth';
/** Marks a route for VENDOR accounts (their own token audience) rather than staff. */
export const VendorAuth = () => SetMetadata(VENDOR_AUTH_KEY, true);

export interface VendorRequestUser {
  accountId: string;
  email: string;
}

/**
 * The office service knows three callers and keeps them strictly apart:
 *
 *   - @Public()      no credential (categories, account registration, login…)
 *   - @VendorAuth()  a vendor session token (HS256, aud=vendor, issued here)
 *                    → req.vendorAccount; NEVER req.user
 *   - everything else: a STAFF token issued by the website, verified with the
 *                    website's PUBLIC key (RS256), iss/aud/exp checked,
 *                    audience must include `vendor-service` → req.user
 *                    (then RolesGuard applies the role rules)
 *
 * A vendor token on a staff route, or a staff token on a vendor route, is a
 * 401 — there is no cross-over.
 */
@Injectable()
export class VendorServiceAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly staffTokens: StaffTokenService,
    private readonly accounts: VendorAccountsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;
    const req = context.switchToHttp().getRequest();
    const token = bearer(req.headers?.authorization);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    if (this.reflector.getAllAndOverride<boolean>(VENDOR_AUTH_KEY, targets)) {
      const claims = await this.accounts.verifyToken(token);
      const account = await this.accounts.findById(claims.sub); // disabled accounts lose access immediately
      req.vendorAccount = { accountId: account.id, email: account.email } satisfies VendorRequestUser;
      return true;
    }

    const staff = await this.staffTokens.verifyAccess(token, 'vendor-service');
    req.user = { id: staff.sub, email: staff.email, role: staff.role, name: staff.name };
    return true;
  }
}

function bearer(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && value ? value.trim() : null;
}
