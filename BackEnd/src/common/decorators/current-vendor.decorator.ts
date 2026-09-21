import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface VendorRequestUser {
  accountId: string;
  email: string;
}

/** Injects the authenticated VENDOR account (set by VendorServiceAuthGuard on @VendorAuth routes). */
export const CurrentVendor = createParamDecorator((_data: unknown, ctx: ExecutionContext): VendorRequestUser => {
  return ctx.switchToHttp().getRequest().vendorAccount as VendorRequestUser;
});
