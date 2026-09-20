import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { dataSourceOptions } from './database/data-source';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { BlogModule } from './modules/blog/blog.module';
import { ContactModule } from './modules/contact/contact.module';
import { PartnersModule } from './modules/partners/partners.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ServicesModule } from './modules/services/services.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TeamModule } from './modules/team/team.module';
import { TestimonialsModule } from './modules/testimonials/testimonials.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { MailModule } from './modules/mail/mail.module';
import { VendorsModule } from './modules/vendors/vendors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      useFactory: () => dataSourceOptions,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    // Feature modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    ServicesModule,
    TeamModule,
    TestimonialsModule,
    PartnersModule,
    BlogModule,
    ContactModule,
    SettingsModule,
    UploadsModule,
    MailModule,
    VendorsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
