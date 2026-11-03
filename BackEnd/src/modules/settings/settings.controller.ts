import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get()
  findAll() {
    return this.settings.findAll();
  }

  @Public()
  @Get(':key')
  get(@Param('key') key: string) {
    return this.settings.get(key);
  }

  @ApiBearerAuth()
  @Roles(Role.ContentManager)
  @Put(':key')
  upsert(@Param('key') key: string, @Body() dto: UpsertSettingDto) {
    return this.settings.upsert(key, dto.value);
  }

  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @Delete(':key')
  remove(@Param('key') key: string) {
    return this.settings.remove(key);
  }
}
