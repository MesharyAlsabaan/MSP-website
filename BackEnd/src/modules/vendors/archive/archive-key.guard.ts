import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ArchiveJobsService } from './archive-jobs.service';

export const ARCHIVE_KEY_HEADER = 'x-archive-key';

/**
 * Authenticates the office archive agent by its service key (header
 * `X-Archive-Key`). Independent of the staff JWT: an agent key can do nothing
 * except the archive endpoints, and a staff token cannot call them.
 */
@Injectable()
export class ArchiveKeyGuard implements CanActivate {
  constructor(private readonly jobs: ArchiveJobsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const key = req.headers[ARCHIVE_KEY_HEADER];
    if (typeof key !== 'string') throw new UnauthorizedException('Missing archive key');
    req.archiveAgent = await this.jobs.authenticate(key);
    req.archiveKey = key;
    return true;
  }
}
