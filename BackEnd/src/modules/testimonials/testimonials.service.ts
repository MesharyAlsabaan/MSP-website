import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated } from '../../common/dto/paginated.dto';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { QueryTestimonialDto } from './dto/query-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { Testimonial } from './entities/testimonial.entity';

@Injectable()
export class TestimonialsService {
  constructor(
    @InjectRepository(Testimonial) private readonly repo: Repository<Testimonial>,
  ) {}

  async findAll(query: QueryTestimonialDto, preview = false): Promise<Paginated<Testimonial>> {
    const { page, pageSize, includeDrafts, search } = query;
    const qb = this.repo.createQueryBuilder('t');

    if (!(preview && includeDrafts === 'true')) {
      qb.andWhere('t.published = true');
    }
    if (search) {
      qb.andWhere(
        "(t.clientName ILIKE :s OR t.quote ->> 'en' ILIKE :s OR t.quote ->> 'ar' ILIKE :s)",
        { s: `%${search}%` },
      );
    }

    qb.orderBy('t.sortOrder', 'ASC').addOrderBy('t.createdAt', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, pageSize);
  }

  async findOne(id: string, preview = false): Promise<Testimonial> {
    const testimonial = await this.repo.findOne({
      where: preview ? { id } : { id, published: true },
    });
    if (!testimonial) throw new NotFoundException('Testimonial not found');
    return testimonial;
  }

  create(dto: CreateTestimonialDto): Promise<Testimonial> {
    return this.repo.save(this.repo.create(dto as Partial<Testimonial>));
  }

  async update(id: string, dto: UpdateTestimonialDto): Promise<Testimonial> {
    const testimonial = await this.findOne(id, true);
    Object.assign(testimonial, dto);
    return this.repo.save(testimonial);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Testimonial not found');
  }
}
