import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorsAdminController } from './admin/vendors-admin.controller';
import { ArchiveJobsService } from './archive/archive-jobs.service';
import { ArchiveKeyGuard } from './archive/archive-key.guard';
import { ArchiveController } from './archive/archive.controller';
import { CompletionTokenService } from './completion-token.service';
import * as entities from './entities';
import { NumberingService } from './numbering.service';
import { VendorsPublicController } from './public/vendors-public.controller';
import { ReviewService } from './review.service';
import { DOCUMENT_STORAGE } from './storage/document-storage';
import { LocalDiskStorage } from './storage/local-disk.storage';
import { VENDORS_PUBLIC_CONFIG, VendorsPublicConfig, VendorsService } from './vendors.service';

/**
 * Vendor qualification: public registration, staff review, and the archive
 * hand-off to the office agent. The DocumentStorage binding is the one place
 * to swap the backing store for pending documents.
 */
@Module({
  imports: [TypeOrmModule.forFeature(Object.values(entities))],
  controllers: [VendorsPublicController, VendorsAdminController, ArchiveController],
  providers: [
    NumberingService,
    CompletionTokenService,
    VendorsService,
    ReviewService,
    ArchiveJobsService,
    ArchiveKeyGuard,
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
  ],
})
export class VendorsModule {}
