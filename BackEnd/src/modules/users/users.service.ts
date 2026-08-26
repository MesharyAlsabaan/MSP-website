import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Includes the password hash — used by the auth flow only. Matches
   * case-insensitively: email is not case-sensitive in practice, and people
   * type their address in whatever case their keyboard produces.
   */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = :email', { email: normalizeEmail(email) })
      .getOne();
  }

  async create(dto: CreateUserDto): Promise<User> {
    const email = normalizeEmail(dto.email);
    if (await this.findByEmail(email)) {
      throw new ConflictException('Email already in use');
    }
    const user = this.repo.create({
      email,
      name: dto.name,
      role: dto.role,
      active: dto.active ?? true,
      passwordHash: await bcrypt.hash(dto.password, 10),
    });
    return this.repo.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (dto.email) {
      const email = normalizeEmail(dto.email);
      const clash = await this.findByEmail(email);
      if (clash && clash.id !== user.id) {
        throw new ConflictException('Email already in use');
      }
      user.email = email;
    }
    if (dto.name) user.name = dto.name;
    if (dto.role) user.role = dto.role;
    if (dto.active !== undefined) user.active = dto.active;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 10);
    return this.repo.save(user);
  }

  /** Case-insensitive lookup used by the uniqueness checks. */
  private findByEmail(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email: normalizeEmail(email) })
      .getOne();
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('User not found');
  }
}

/** Emails are stored and compared lowercase, so case never blocks a sign-in. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
