import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { canPreviewContent } from '../../common/auth/content-preview';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { QueryTestimonialDto } from './dto/query-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { TestimonialsService } from './testimonials.service';

@ApiTags('Testimonials')
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Public()
  @Get()
  findAll(@Query() query: QueryTestimonialDto, @CurrentUser() user?: AuthUser) {
    return this.testimonials.findAll(query, canPreviewContent(user));
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.testimonials.findOne(id, canPreviewContent(user));
  }

  @ApiBearerAuth()
  @Roles(Role.ContentManager, Role.Editor)
  @Post()
  create(@Body() dto: CreateTestimonialDto) {
    return this.testimonials.create(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ContentManager, Role.Editor)
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestimonialDto) {
    return this.testimonials.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ContentManager)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testimonials.remove(id);
  }
}
