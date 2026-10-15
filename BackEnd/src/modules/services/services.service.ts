import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated } from '../../common/dto/paginated.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service) private readonly repo: Repository<Service>,
  ) {}

  async findAll(query: QueryServiceDto, preview = false): Promise<Paginated<Service>> {
    const { page, pageSize, featured, includeDrafts, search } = query;
    const qb = this.repo.createQueryBuilder('s');

    if (!(preview && includeDrafts === 'true')) {
      qb.andWhere('s.published = true');
    }
    if (featured === 'true') {
      qb.andWhere('s.featured = true');
    }
    if (search) {
      qb.andWhere(
        "(s.title ->> 'en' ILIKE :s OR s.title ->> 'ar' ILIKE :s OR s.slug ILIKE :s)",
        { s: `%${search}%` },
      );
    }

    qb.orderBy('s.sortOrder', 'ASC').addOrderBy('s.createdAt', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, pageSize);
  }

  async findBySlug(slug: string, preview = false): Promise<Service> {
    const service = await this.repo.findOne({
      where: preview ? { slug } : { slug, published: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async findOne(id: string, preview = false): Promise<Service> {
    const service = await this.repo.findOne({
      where: preview ? { id } : { id, published: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  create(dto: CreateServiceDto): Promise<Service> {
    return this.repo.save(this.repo.create(dto as Partial<Service>));
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.findOne(id, true);
    Object.assign(service, dto);
    return this.repo.save(service);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Service not found');
  }
}
