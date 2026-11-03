import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting) private readonly repo: Repository<Setting>,
  ) {}

  async findAll(): Promise<Record<string, any>> {
    const settings = await this.repo.find();
    return settings.reduce<Record<string, any>>((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  }

  async get(key: string): Promise<any> {
    const setting = await this.repo.findOne({ where: { key } });
    return setting ? setting.value : null;
  }

  async upsert(key: string, value: any): Promise<Setting> {
    let setting = await this.repo.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
    } else {
      setting = this.repo.create({ key, value });
    }
    return this.repo.save(setting);
  }

  async remove(key: string): Promise<void> {
    const result = await this.repo.delete({ key });
    if (!result.affected) throw new NotFoundException('Setting not found');
  }
}
