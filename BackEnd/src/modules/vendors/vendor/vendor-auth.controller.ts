import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, Length } from 'class-validator';
import { CurrentVendor, VendorRequestUser } from '../../../common/decorators/current-vendor.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { VendorAuth } from '../../../vendor-service/vendor-service-auth.guard';
import { VendorAccountsService } from '../accounts/vendor-accounts.service';

class RegisterDto {
  @IsEmail() email: string;
  @IsString() @Length(8, 128) password: string;
  @IsString() @Length(1, 200) contactName: string;
}
class LoginDto {
  @IsEmail() email: string;
  @IsString() @Length(1, 128) password: string;
}
class EmailDto {
  @IsEmail() email: string;
}
class TokenDto {
  @IsString() @Length(1, 128) token: string;
}
class ResetDto extends TokenDto {
  @IsString() @Length(8, 128) password: string;
}
class ChangePasswordDto {
  @IsString() @Length(1, 128) currentPassword: string;
  @IsString() @Length(8, 128) newPassword: string;
}

/** Vendor account lifecycle. Tokens travel in the request body, never in the URL, so they stay out of logs. */
@ApiTags('Vendor account')
@Controller('vendor/auth')
export class VendorAuthController {
  constructor(private readonly accounts: VendorAccountsService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a vendor account; a verification e-mail is sent' })
  async register(@Body() dto: RegisterDto) {
    const a = await this.accounts.register(dto);
    return { id: a.id, email: a.email, contactName: a.contactName, verificationRequired: true };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async resend(@Body() dto: EmailDto) {
    await this.accounts.resendVerification(dto.email);
    return { ok: true };
  }

  @Public()
  @Post('verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verify(@Body() dto: TokenDto) {
    await this.accounts.verifyEmail(dto.token);
    return { ok: true };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto) {
    const { accessToken, account } = await this.accounts.login(dto.email, dto.password);
    return { accessToken, account: { id: account.id, email: account.email, contactName: account.contactName } };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Always 200 — never reveals whether the address exists' })
  async forgot(@Body() dto: EmailDto) {
    await this.accounts.requestPasswordReset(dto.email);
    return { ok: true };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async reset(@Body() dto: ResetDto) {
    await this.accounts.resetPassword(dto.token, dto.password);
    return { ok: true };
  }

  @VendorAuth()
  @Post('change-password')
  @HttpCode(200)
  async change(@CurrentVendor() me: VendorRequestUser, @Body() dto: ChangePasswordDto) {
    await this.accounts.changePassword(me.accountId, dto.currentPassword, dto.newPassword);
    return { ok: true };
  }
}
