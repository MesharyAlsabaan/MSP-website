import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { Public } from '../../../common/decorators/public.decorator';
import { UPLOAD_LIMITS } from '../file-validation';
import { SubmitInput, UploadedDoc, VendorsService } from '../vendors.service';

/** Multer field name convention: `doc__<docTypeKey>` carries one document. */
const DOC_FIELD = /^doc__([a-z0-9-]{1,64})$/;

interface MulterFile {
  fieldname: string;
  originalname: string;
  buffer: Buffer;
  size: number;
}

/**
 * Turns the multipart body into typed input. `data` is a JSON string with the
 * profile fields; every file field named doc__<type> becomes a document of
 * that type. `company_website` is a honeypot: humans never see it, bots fill it.
 */
function parseMultipart(body: Record<string, string>, files: MulterFile[]): { input: SubmitInput; docs: UploadedDoc[] } {
  if (body.company_website) throw new BadRequestException('Invalid submission.');
  let input: SubmitInput;
  try {
    input = JSON.parse(body.data ?? '{}');
  } catch {
    throw new BadRequestException('Field "data" must be valid JSON.');
  }
  const docs: UploadedDoc[] = [];
  for (const f of files ?? []) {
    const m = DOC_FIELD.exec(f.fieldname);
    if (!m) throw new BadRequestException(`Unexpected file field "${f.fieldname}".`);
    docs.push({ docTypeKey: m[1], originalname: f.originalname, buffer: f.buffer, size: f.size });
  }
  return { input, docs };
}

const uploadInterceptor = () =>
  AnyFilesInterceptor({
    storage: memoryStorage(),
    limits: {
      fileSize: UPLOAD_LIMITS.maxFileBytes,
      files: UPLOAD_LIMITS.maxFilesPerRevision,
      fields: 20,
      fieldSize: 64 * 1024,
    },
  });

@ApiTags('Vendors (public)')
@Public()
@Controller('vendors')
export class VendorsPublicController {
  constructor(private readonly vendors: VendorsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Categories a vendor can register under, with required documents' })
  categories() {
    return this.vendors.listCategories();
  }

  @Post('applications')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(uploadInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'Field "data": JSON profile. Files: doc__<docTypeKey>.' })
  @ApiOperation({ summary: 'Register a vendor and submit the qualification request' })
  submit(@Body() body: Record<string, string>, @UploadedFiles() files: MulterFile[]) {
    const { input, docs } = parseMultipart(body, files);
    return this.vendors.submit(input, docs);
  }

  @Get('applications/resume/:token')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Open a completion link: current data, documents and what is missing' })
  resume(@Param('token') token: string) {
    return this.vendors.getResumeContext(token);
  }

  @Post('applications/resume/:token')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(uploadInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Resubmit after a completion request (creates the next revision; link is spent)' })
  resubmit(@Param('token') token: string, @Body() body: Record<string, string>, @UploadedFiles() files: MulterFile[]) {
    const { input, docs } = parseMultipart(body, files);
    return this.vendors.resubmit(token, input, docs);
  }
}
