import { Controller, Get, Post, Put, Patch, Body, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RbacGuard } from '../rbac/rbac.guard';
import { RequirePermission } from '../rbac/rbac.decorator';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @RequirePermission('tasks', 'tasks.create')
  @Post()
  async createProject(@Req() req: any, @Body() body: any) {
    if (!req.user?.tenantId) throw new BadRequestException('Invalid user context');
    return this.projectsService.createProject(req.user, body);
  }

  @RequirePermission('tasks', 'tasks.view')
  @Get()
  async getProjects(@Req() req: any) {
    if (!req.user?.tenantId) throw new BadRequestException('Invalid user context');
    return this.projectsService.getProjects(req.user);
  }

  @RequirePermission('tasks', 'tasks.view')
  @Get(':id')
  async getProjectById(@Req() req: any, @Param('id') id: string) {
    if (!req.user?.tenantId) throw new BadRequestException('Invalid user context');
    return this.projectsService.getProjectById(req.user, id);
  }

  @RequirePermission('tasks', 'tasks.edit')
  @Put(':id')
  async updateProject(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (!req.user?.tenantId) throw new BadRequestException('Invalid user context');
    return this.projectsService.updateProject(req.user, id, body);
  }

  @RequirePermission('tasks', 'tasks.delete')
  @Patch(':id/archive')
  async archiveProject(@Req() req: any, @Param('id') id: string) {
    if (!req.user?.tenantId) throw new BadRequestException('Invalid user context');
    return this.projectsService.archiveProject(req.user, id);
  }
}
