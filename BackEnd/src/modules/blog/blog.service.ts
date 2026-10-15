import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated } from '../../common/dto/paginated.dto';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { QueryBlogPostDto } from './dto/query-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogPost, BlogStatus } from './entities/blog-post.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost) private readonly repo: Repository<BlogPost>,
  ) {}

  async findAll(query: QueryBlogPostDto, preview = false): Promise<Paginated<BlogPost>> {
    const { page, pageSize, category, includeDrafts, search } = query;
    const qb = this.repo.createQueryBuilder('post');

    if (!(preview && includeDrafts === 'true')) {
      qb.andWhere('post.status = :status', { status: BlogStatus.Published });
    }
    if (category) {
      qb.andWhere('post.category = :category', { category });
    }
    if (search) {
      qb.andWhere(
        "(post.title ->> 'en' ILIKE :s OR post.title ->> 'ar' ILIKE :s OR post.slug ILIKE :s)",
        { s: `%${search}%` },
      );
    }

    qb.orderBy('post.publishedAt', 'DESC', 'NULLS LAST').addOrderBy(
      'post.createdAt',
      'DESC',
    );
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, pageSize);
  }

  async findBySlug(slug: string, preview = false): Promise<BlogPost> {
    const post = await this.repo.findOne({
      where: preview ? { slug } : { slug, status: BlogStatus.Published },
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async findOne(id: string, preview = false): Promise<BlogPost> {
    const post = await this.repo.findOne({
      where: preview ? { id } : { id, status: BlogStatus.Published },
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  create(dto: CreateBlogPostDto): Promise<BlogPost> {
    return this.repo.save(this.repo.create(dto as Partial<BlogPost>));
  }

  async update(id: string, dto: UpdateBlogPostDto): Promise<BlogPost> {
    const post = await this.findOne(id, true);
    Object.assign(post, dto);
    return this.repo.save(post);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Blog post not found');
  }
}
