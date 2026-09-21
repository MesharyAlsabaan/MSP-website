import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../common/guards/roles.guard';
import configuration from '../config/configuration';
import { vendorDataSourceOptions } from '../database/vendor-data-source';
import { StaffTokenService, staffTokenOptionsFromEnv } from '../modules/auth/staff-token.service';
import { MailModule } from '../modules/mail/mail.module';
import { VendorsModule } from '../modules/vendors/vendors.module';
import { NoStoreMiddleware } from './no-store.middleware';
import { VendorServiceAuthGuard } from './vendor-service-auth.guard';

/**
 * Root module of the OFFICE vendor service — a separate process with its own
 * database and document folder, run inside the office network and reached
 * by the website through a Cloudflare Tunnel. It holds no CMS content and
 * the website holds no vendor data.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({ useFactory: () => vendorDataSourceOptions }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    JwtModule.register({}),
    MailModule,
    VendorsModule,
  ],
  providers: [
    {
      // Verifies STAFF tokens with the website's PUBLIC key only. JWT_PRIVATE_KEY
      // must not exist on this host; JWT_SECRET is the dev-only HS256 fallback.
      provide: StaffTokenService,
      inject: [JwtService, ConfigService],
      useFactory: (jwt: JwtService, config: ConfigService) =>
        new StaffTokenService(jwt, { ...staffTokenOptionsFromEnv(process.env, config.get<string>('jwt.secret')), privateKey: undefined }),
    },
    { provide: APP_GUARD, useClass: VendorServiceAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class VendorServiceModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(NoStoreMiddleware).forRoutes('*');
  }
}
