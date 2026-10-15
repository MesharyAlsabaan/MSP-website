import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { existsSync } from 'fs';
import { extname, join } from 'path';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { generateVariants } from './image-variants';

const ALLOWED = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

/**
 * A safe, collision-free filename that keeps the SEO value of the name the
 * office prepared. Only unsafe characters are folded to hyphens; the full
 * keyword-rich slug survives (up to a filesystem-safe length) rather than
 * being cut to a fixed prefix and stamped, which used to strip the keywords
 * and make several differently-named photos collide on one truncated stem.
 * A numeric suffix is added only when a file of that name already exists, so
 * a re-upload never overwrites and clean names stay clean.
 */
function safeName(original: string): string {
  const ext = extname(original).toLowerCase();
  const base =
    original
      .slice(0, original.length - ext.length)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'file';

  let name = `${base}${ext}`;
  for (let n = 2; existsSync(join(UPLOAD_DIR, name)); n += 1) {
    name = `${base}-${n}${ext}`;
  }
  return name;
}

@ApiTags('Uploads')
@ApiBearerAuth()
@Roles(Role.ContentManager, Role.Editor)
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly config: ConfigService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
      }),
      limits: { fileSize: (parseInt(process.env.MAX_UPLOAD_MB ?? '5', 10)) * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED.test(file.originalname)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: { filename: string; size: number }) {
    if (!file) throw new BadRequestException('No file provided');
    // Responsive web copies beside the untouched original. A failure here must
    // not lose the upload: the site falls back to the original until the
    // backfill script (`npm run images:variants`) fills the gap.
    try {
      await generateVariants(UPLOAD_DIR, file.filename);
    } catch (err) {
      this.logger.warn(`Could not create web copies of ${file.filename}: ${(err as Error).message}`);
    }
    const prefix = this.config.get<string>('apiPrefix');
    return {
      filename: file.filename,
      url: `/${prefix}/uploads/${file.filename}`,
      size: file.size,
    };
  }
}
