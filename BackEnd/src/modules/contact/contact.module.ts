import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactMessage } from './entities/contact-message.entity';
import { Subscriber } from './entities/subscriber.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContactMessage, Subscriber])],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
