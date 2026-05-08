import type { WorkspaceMember, WorkspaceRole as Role } from '../generated/prisma'
import { BaseRepository } from './base.repository'

export class WorkspaceMemberRepository extends BaseRepository {
  async getMemberRole(userId: string, workspaceId: string): Promise<Role | null> {
    const row = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    })
    return row?.role ?? null
  }

  async getWorkspaceMember(userId: string, workspaceId: string): Promise<WorkspaceMember | null> {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    })
  }

  async setMemberRole(userId: string, workspaceId: string, role: Role): Promise<WorkspaceMember> {
    return this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
    })
  }

  async removeMember(userId: string, workspaceId: string): Promise<void> {
    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    })
  }
}

export const workspaceMemberRepository = new WorkspaceMemberRepository()
