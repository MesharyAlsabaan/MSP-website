import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated } from '../../common/dto/paginated.dto';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { QueryPartnerDto } from './dto/query-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { Partner } from './entities/partner.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner) private readonly repo: Repository<Partner>,
  ) {}

  async findAll(query: QueryPartnerDto, preview = false): Promise<Paginated<Partner>> {
    const { page, pageSize, includeInactive, search } = query;
    const qb = this.repo.createQueryBuilder('p');

    if (!(preview && includeInactive === 'true')) {
      qb.andWhere('p.active = true');
    }
    if (search) {
      qb.andWhere('p.name ILIKE :s', { s: `%${search}%` });
    }

    qb.orderBy('p.sortOrder', 'ASC').addOrderBy('p.createdAt', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, pageSize);
  }

  async findOne(id: string, preview = false): Promise<Partner> {
    const partner = await this.repo.findOne({
      where: preview ? { id } : { id, active: true },
    });
    if (!partner) throw new NotFoundException('Partner not found');
    return partner;
  }

  create(dto: CreatePartnerDto): Promise<Partner> {
    return this.repo.save(this.repo.create(dto as Partial<Partner>));
  }

  async update(id: string, dto: UpdatePartnerDto): Promise<Partner> {
    const partner = await this.findOne(id, true);
    Object.assign(partner, dto);
    return this.repo.save(partner);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Partner not found');
  }
}
