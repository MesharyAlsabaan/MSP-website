import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated } from '../../common/dto/paginated.dto';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { QueryTeamMemberDto } from './dto/query-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { TeamMember } from './entities/team-member.entity';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(TeamMember) private readonly repo: Repository<TeamMember>,
  ) {}

  async findAll(query: QueryTeamMemberDto, preview = false): Promise<Paginated<TeamMember>> {
    const { page, pageSize, includeInactive, search } = query;
    const qb = this.repo.createQueryBuilder('t');

    if (!(preview && includeInactive === 'true')) {
      qb.andWhere('t.active = true');
    }
    if (search) {
      qb.andWhere(
        "(t.name ILIKE :s OR t.title ->> 'en' ILIKE :s OR t.title ->> 'ar' ILIKE :s)",
        { s: `%${search}%` },
      );
    }

    qb.orderBy('t.sortOrder', 'ASC').addOrderBy('t.createdAt', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, pageSize);
  }

  async findOne(id: string, preview = false): Promise<TeamMember> {
    const member = await this.repo.findOne({
      where: preview ? { id } : { id, active: true },
    });
    if (!member) throw new NotFoundException('Team member not found');
    return member;
  }

  create(dto: CreateTeamMemberDto): Promise<TeamMember> {
    return this.repo.save(this.repo.create(dto as Partial<TeamMember>));
  }

  async update(id: string, dto: UpdateTeamMemberDto): Promise<TeamMember> {
    const member = await this.findOne(id, true);
    Object.assign(member, dto);
    return this.repo.save(member);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Team member not found');
  }
}
