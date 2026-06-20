import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from '../schemas/project.schema';
import { User } from '../schemas/rbac/user.schema';
import { Notification } from '../schemas/notification.schema';
import { Admin } from '../schemas/admin.schema';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(Admin.name) private adminModel: Model<Admin>
  ) {}

  private async createNotification(tenantId: string, project: Project, title: string, message: string) {
    const recipients = new Set<string>();

    // Add Assigned Team Members and Clients
    if (project.assignedClients) {
      project.assignedClients.forEach(id => recipients.add(id.toString()));
    }
    if (project.assignedTeamMembers) {
      project.assignedTeamMembers.forEach(id => recipients.add(id.toString()));
    }

    // Add Admins and SuperAdmins
    const superAdmins = await this.adminModel.find({});
    superAdmins.forEach(admin => recipients.add(admin._id.toString()));

    const admins = await this.userModel.find({ tenantId: new Types.ObjectId(tenantId), userType: 'admin' });
    admins.forEach(admin => recipients.add(admin._id.toString()));

    const notifications = Array.from(recipients).map(userId => ({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
      title,
      message,
      type: 'project_notification',
      isRead: false,
    }));

    if (notifications.length > 0) {
      await this.notificationModel.insertMany(notifications).catch(e => console.error(e));
    }
  }

  async createProject(user: any, payload: any): Promise<Project> {
    const tenantId = user.tenantId;
    const project = new this.projectModel({
      tenantId: new Types.ObjectId(tenantId),
      ...payload,
      assignedClients: (payload.assignedClients || []).map((id: string) => new Types.ObjectId(id)),
      assignedTeamMembers: (payload.assignedTeamMembers || []).map((id: string) => new Types.ObjectId(id)),
    });
    
    const saved = await project.save();

    // Update assigned clients with this projectId
    if (saved.assignedClients.length > 0) {
      await this.userModel.updateMany(
        { _id: { $in: saved.assignedClients }, tenantId: new Types.ObjectId(tenantId) },
        { $set: { projectId: saved._id } }
      );
    }
    
    await this.createNotification(tenantId, saved, 'New Project Created', `Project "${saved.projectName}" has been created.`);

    return saved;
  }

  async getProjects(user: any): Promise<Project[]> {
    const tenantId = user.tenantId;
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    const role = user.role || '';
    const userType = user.userType || '';
    const isAdmin = role === 'Super Admin' || role === 'Admin' || userType === 'admin';

    if (!isAdmin) {
      if (userType === 'client' || role === 'Client') {
        query.assignedClients = new Types.ObjectId(user.id);
      } else {
        query.assignedTeamMembers = new Types.ObjectId(user.id);
      }
    }

    return this.projectModel
      .find(query)
      .populate('assignedClients', 'name email')
      .populate('assignedTeamMembers', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getProjectById(user: any, projectId: string): Promise<Project> {
    const tenantId = user.tenantId;
    const query: any = { _id: new Types.ObjectId(projectId), tenantId: new Types.ObjectId(tenantId) };

    const role = user.role || '';
    const userType = user.userType || '';
    const isAdmin = role === 'Super Admin' || role === 'Admin' || userType === 'admin';

    if (!isAdmin) {
      if (userType === 'client' || role === 'Client') {
        query.assignedClients = new Types.ObjectId(user.id);
      } else {
        query.assignedTeamMembers = new Types.ObjectId(user.id);
      }
    }

    const project = await this.projectModel
      .findOne(query)
      .populate('assignedClients', 'name email')
      .populate('assignedTeamMembers', 'name email')
      .exec();

    if (!project) throw new NotFoundException('Project not found or unauthorized');
    return project;
  }

  async updateProject(user: any, projectId: string, payload: any): Promise<Project> {
    const tenantId = user.tenantId;
    const oldProject = await this.projectModel.findOne({ _id: new Types.ObjectId(projectId), tenantId: new Types.ObjectId(tenantId) });
    if (!oldProject) throw new NotFoundException('Project not found');

    const updateData = { ...payload };
    
    if (payload.assignedClients) {
      updateData.assignedClients = payload.assignedClients.map((id: string) => new Types.ObjectId(id));
    }
    if (payload.assignedTeamMembers) {
      updateData.assignedTeamMembers = payload.assignedTeamMembers.map((id: string) => new Types.ObjectId(id));
    }

    const project = await this.projectModel.findOneAndUpdate(
      { _id: new Types.ObjectId(projectId), tenantId: new Types.ObjectId(tenantId) },
      { $set: updateData },
      { new: true }
    );

    if (!project) throw new NotFoundException('Project not found');

    if (payload.assignedClients) {
      await this.userModel.updateMany(
        { _id: { $in: updateData.assignedClients }, tenantId: new Types.ObjectId(tenantId) },
        { $set: { projectId: project._id } }
      );
    }

    let notificationMessage = `Project "${project.projectName}" has been updated.`;
    if (oldProject.status !== project.status) {
      notificationMessage = `Project "${project.projectName}" status changed to ${project.status}.`;
    }

    await this.createNotification(tenantId, project, 'Project Updated', notificationMessage);

    return project;
  }

  async archiveProject(user: any, projectId: string): Promise<Project> {
    const tenantId = user.tenantId;
    const project = await this.projectModel.findOneAndUpdate(
      { _id: new Types.ObjectId(projectId), tenantId: new Types.ObjectId(tenantId) },
      { $set: { status: 'Archived' } },
      { new: true }
    );
    if (!project) throw new NotFoundException('Project not found');

    await this.createNotification(tenantId, project, 'Project Deleted', `Project "${project.projectName}" has been archived/deleted.`);

    return project;
  }
}
