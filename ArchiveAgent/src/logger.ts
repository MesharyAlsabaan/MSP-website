import { appendFile, mkdir, rename, stat } from 'fs/promises';
import { join } from 'path';

const MAX_BYTES = 5 * 1024 * 1024;
const KEY_RE = /(msparch_[A-Za-z0-9_-]+|leaseToken=[A-Za-z0-9]+|X-Archive-Key:\s*\S+)/g;

/**
 * Plain rolling log file. Secrets that could ever appear in a message (the
 * agent key, lease tokens) are masked before writing. Vendor contact data is
 * never logged — messages refer to jobs by id and vendor number only.
 */
export class Logger {
  constructor(private readonly dir: string, private readonly echo = true) {}

  info(msg: string): Promise<void> { return this.write('INFO', msg); }
  warn(msg: string): Promise<void> { return this.write('WARN', msg); }
  error(msg: string): Promise<void> { return this.write('ERROR', msg); }

  private async write(level: string, msg: string): Promise<void> {
    const line = `${new Date().toISOString()} ${level} ${msg.replace(KEY_RE, '***')}\n`;
    if (this.echo) process.stdout.write(line);
    try {
      await mkdir(this.dir, { recursive: true });
      const file = join(this.dir, 'agent.log');
      const size = await stat(file).then((s) => s.size, () => 0);
      if (size > MAX_BYTES) await rename(file, join(this.dir, `agent-${Date.now()}.log`)).catch(() => undefined);
      await appendFile(file, line, 'utf8');
    } catch {
      /* logging must never take the agent down */
    }
  }
}
