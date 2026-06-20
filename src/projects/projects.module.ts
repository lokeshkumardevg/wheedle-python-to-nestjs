import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project, ProjectSchema } from '../schemas/project.schema';
import { User, UserSchema } from '../schemas/rbac/user.schema';
import { Notification, NotificationSchema } from '../schemas/notification.schema';
import { Admin, AdminSchema } from '../schemas/admin.schema';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
    RbacModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
