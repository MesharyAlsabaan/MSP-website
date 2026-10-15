import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated } from '../../common/dto/paginated.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, ProjectStatus } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly repo: Repository<Project>,
  ) {}

  async findAll(query: QueryProjectDto, preview = false): Promise<Paginated<Project>> {
    const { page, pageSize, typology, featured, includeDrafts, search } = query;
    const qb = this.repo.createQueryBuilder('p');

    if (!(preview && includeDrafts === 'true')) {
      qb.andWhere('p.status = :status', { status: ProjectStatus.Published });
    }
    if (typology) {
      qb.andWhere("p.typology ->> 'key' = :typology", { typology });
    }
    if (featured === 'true') {
      qb.andWhere('p.featured = true');
    }
    if (search) {
      qb.andWhere(
        "(p.title ->> 'en' ILIKE :s OR p.title ->> 'ar' ILIKE :s OR p.slug ILIKE :s)",
        { s: `%${search}%` },
      );
    }

    qb.orderBy('p.sortOrder', 'ASC').addOrderBy('p.createdAt', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, pageSize);
  }

  async findBySlug(slug: string, preview = false): Promise<Project> {
    const project = await this.repo.findOne({
      where: preview ? { slug } : { slug, status: ProjectStatus.Published },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async findOne(id: string, preview = false): Promise<Project> {
    const project = await this.repo.findOne({
      where: preview ? { id } : { id, status: ProjectStatus.Published },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  create(dto: CreateProjectDto): Promise<Project> {
    return this.repo.save(this.repo.create(dto as Partial<Project>));
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id, true);
    Object.assign(project, dto);
    return this.repo.save(project);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Project not found');
  }
}
