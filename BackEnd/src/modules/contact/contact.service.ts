import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated } from '../../common/dto/paginated.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { ContactMessage } from './entities/contact-message.entity';
import { Subscriber } from './entities/subscriber.entity';
import { InquiryNotifier } from './inquiry-notifier.service';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly messages: Repository<ContactMessage>,
    @InjectRepository(Subscriber)
    private readonly subscribers: Repository<Subscriber>,
    private readonly notifier: InquiryNotifier,
  ) {}

  /** Saves the enquiry, then alerts the office by email (if configured) without waiting on it. */
  async submit(dto: CreateContactDto): Promise<ContactMessage> {
    const saved = await this.messages.save(this.messages.create(dto));
    void this.notifier.notify(saved);
    return saved;
  }

  async subscribe(dto: SubscribeDto): Promise<Subscriber> {
    const existing = await this.subscribers.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      existing.active = true;
      return this.subscribers.save(existing);
    }
    return this.subscribers.save(this.subscribers.create({ email: dto.email }));
  }

  async findAll(query: PaginationQueryDto): Promise<Paginated<ContactMessage>> {
    const { page, pageSize } = query;
    const [data, total] = await this.messages.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return paginate(data, total, page, pageSize);
  }

  async markRead(id: string): Promise<ContactMessage> {
    const msg = await this.messages.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    msg.read = true;
    return this.messages.save(msg);
  }

  async remove(id: string): Promise<void> {
    const result = await this.messages.delete(id);
    if (!result.affected) throw new NotFoundException('Message not found');
  }

  listSubscribers(): Promise<Subscriber[]> {
    return this.subscribers.find({ order: { createdAt: 'DESC' } });
  }
}
