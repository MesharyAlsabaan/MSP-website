import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { SubscribeDto } from './dto/subscribe.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  submit(@Body() dto: CreateContactDto) {
    return this.contact.submit(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto) {
    return this.contact.subscribe(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ContentManager)
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.contact.findAll(query);
  }

  @ApiBearerAuth()
  @Roles(Role.ContentManager)
  @Get('subscribers')
  subscribers() {
    return this.contact.listSubscribers();
  }

  @ApiBearerAuth()
  @Roles(Role.ContentManager)
  @Patch(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.contact.markRead(id);
  }

  @ApiBearerAuth()
  @Roles(Role.ContentManager)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contact.remove(id);
  }
}
