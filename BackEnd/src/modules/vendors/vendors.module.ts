import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VENDOR_ACCOUNTS_CONFIG, VendorAccountsConfig, VendorAccountsService } from './accounts/vendor-accounts.service';
import { VendorsAdminController } from './admin/vendors-admin.controller';
import { ArchiveJobsService } from './archive/archive-jobs.service';
import { ArchiveKeyGuard } from './archive/archive-key.guard';
import { ArchiveController } from './archive/archive.controller';
import { LoopbackOnlyGuard } from './archive/loopback-only.guard';
import * as entities from './entities';
import { NumberingService } from './numbering.service';
import { ReviewService } from './review.service';
import { DOCUMENT_STORAGE } from './storage/document-storage';
import { LocalDiskStorage } from './storage/local-disk.storage';
import { VendorAuthController } from './vendor/vendor-auth.controller';
import { VendorPortalController } from './vendor/vendor-portal.controller';
import { VENDORS_PUBLIC_CONFIG, VendorsPublicConfig, VendorsService } from './vendors.service';

const ENTITY_CLASSES = Object.values(entities).filter((e) => typeof e === 'function') as Parameters<typeof TypeOrmModule.forFeature>[0];

/**
 * Vendor qualification, hosted by the OFFICE vendor service (never by the
 * website): vendor accounts and portal, staff review, and the archive
 * hand-off. The DocumentStorage binding is where pending document bytes go
 * (a folder on the office host, outside the approved archive).
 */
@Module({
  imports: [TypeOrmModule.forFeature(ENTITY_CLASSES), JwtModule.register({})],
  controllers: [VendorAuthController, VendorPortalController, VendorsAdminController, ArchiveController],
  providers: [
    NumberingService,
    VendorsService,
    ReviewService,
    ArchiveJobsService,
    ArchiveKeyGuard,
    LoopbackOnlyGuard,
    VendorAccountsService,
    {
      provide: DOCUMENT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new LocalDiskStorage(config.get<string>('vendorDocs.dir', 'vendor-docs')),
    },
    {
      provide: VENDORS_PUBLIC_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService): VendorsPublicConfig => ({
        publicUrl: config.get<string>('publicUrl', 'http://localhost:4200'),
        reviewInbox: config.get<string>('vendorDocs.reviewInbox', ''),
      }),
    },
    {
      provide: VENDOR_ACCOUNTS_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService): VendorAccountsConfig => ({
        jwtSecret: config.get<string>('vendorAuth.jwtSecret', ''),
        publicUrl: config.get<string>('publicUrl', 'http://localhost:4200'),
        tokenTtl: config.get<string>('vendorAuth.tokenTtl', '12h'),
      }),
    },
  ],
  exports: [VendorAccountsService],
})
export class VendorsModule {}
