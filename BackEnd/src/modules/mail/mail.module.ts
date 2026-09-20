import { Global, Module } from '@nestjs/common';
import { MailService, mailOptionsFromEnv } from './mail.service';

@Global()
@Module({
  providers: [{ provide: MailService, useFactory: () => new MailService(mailOptionsFromEnv()) }],
  exports: [MailService],
})
export class MailModule {}
