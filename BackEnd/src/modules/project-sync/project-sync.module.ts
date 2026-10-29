import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { ProjectSyncControl, ProjectSyncItem, ProjectSyncRun } from './entities/project-sync.entity';
import { ProjectSyncController } from './project-sync.controller';
import { ProjectSyncService } from './project-sync.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectSyncRun, ProjectSyncItem, ProjectSyncControl])],
  controllers: [ProjectSyncController],
  providers: [ProjectSyncService],
})
export class ProjectSyncModule {}
