import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, Matches } from 'class-validator';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentVendor, VendorRequestUser } from '../../../common/decorators/current-vendor.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { VendorAuth } from '../../../vendor-service/vendor-service-auth.guard';
import { UPLOAD_LIMITS } from '../file-validation';
import { decodeMultipartFilename } from '../filename-encoding';
import { DraftInput, VendorsService } from '../vendors.service';

class UploadMetaDto {
  @IsString() @Matches(/^[a-z0-9-]{1,64}$/) docTypeKey: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) expiresAt?: string;
}

interface MulterFile { originalname: string; buffer: Buffer; size: number; }

/**
 * The vendor's own portal: dashboard, draft editing, per-document upload,
 * submission. Every handler is scoped to the authenticated account — the
 * service layer never accepts a foreign vendor/application id.
 */
@ApiTags('Vendor portal')
@ApiBearerAuth()
@Controller('vendor')
export class VendorPortalController {
  constructor(private readonly vendors: VendorsService) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Categories and the documents each one requires' })
  categories() {
    return this.vendors.listCategories();
  }

  @VendorAuth()
  @Get('me/application')
  @ApiOperation({ summary: 'My vendor record, draft, submitted revision, reviewer notes and history' })
  mine(@CurrentVendor() me: VendorRequestUser) {
    return this.vendors.getMyApplication(me.accountId);
  }

  @VendorAuth()
  @Put('me/application/draft')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Save draft fields (partial, idempotent)' })
  saveDraft(@CurrentVendor() me: VendorRequestUser, @Body() body: DraftInput) {
    return this.vendors.saveDraft(me.accountId, body ?? {});
  }

  @VendorAuth()
  @Post('me/application/draft/documents')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: UPLOAD_LIMITS.maxFileBytes, files: 1, fields: 5 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Attach one document to the draft (re-sending the same file is a no-op)' })
  addDocument(@CurrentVendor() me: VendorRequestUser, @Body() meta: UploadMetaDto, @UploadedFile() file?: MulterFile) {
    if (!file) throw new BadRequestException('No file provided.');
    return this.vendors.addDraftDocument(me.accountId, meta.docTypeKey, { originalname: decodeMultipartFilename(file.originalname), buffer: file.buffer, size: file.size }, meta.expiresAt ?? null);
  }

  @VendorAuth()
  @Delete('me/application/draft/documents/:id')
  @HttpCode(200)
  async removeDocument(@CurrentVendor() me: VendorRequestUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.vendors.removeDraftDocument(me.accountId, id);
    return { ok: true };
  }

  @VendorAuth()
  @Post('me/application/submit')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Submit the draft for review (idempotent: a retry returns the same numbers)' })
  submit(@CurrentVendor() me: VendorRequestUser) {
    return this.vendors.submit(me.accountId);
  }

  @VendorAuth()
  @Get('me/documents/:id')
  async download(@CurrentVendor() me: VendorRequestUser, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const f = await this.vendors.openMyDocument(me.accountId, id);
    res.setHeader('Content-Type', f.mime);
    res.setHeader('Content-Length', String(f.sizeBytes));
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.filename)}`);
    f.stream.pipe(res);
  }
}
