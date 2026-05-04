import { uuidv7 } from 'uuidv7'
import type { Project } from '../generated/prisma'
import { ProjectStatus } from '../generated/prisma'
import { BaseRepository } from './base.repository'

export class ProjectRepository extends BaseRepository {
  async findById(id: string): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    })
  }

  async findByWorkspace(
    workspaceId: string,
    options?: { status?: ProjectStatus; limit?: number; offset?: number },
  ): Promise<{ projects: Project[]; total: number }> {
    const limit = Math.min(options?.limit ?? 20, 100)
    const offset = options?.offset ?? 0

    const where = {
      workspaceId,
      deletedAt: null,
      ...(options?.status !== undefined ? { status: options.status } : {}),
    }

    const [projects, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({ where, skip: offset, take: limit }),
      this.prisma.project.count({ where }),
    ])

    return { projects, total }
  }

  async create(data: {
    name: string
    slug: string
    description?: string
    workspaceId: string
    ownerId: string
    status?: ProjectStatus
  }): Promise<Project> {
    return this.prisma.project.create({
      data: {
        id: uuidv7(),
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        workspaceId: data.workspaceId,
        createdById: data.ownerId,
        status: data.status ?? ProjectStatus.ACTIVE,
      },
    })
  }

  async update(
    id: string,
    workspaceId: string,
    data: Partial<{ name: string; description: string; status: ProjectStatus }>,
  ): Promise<Project> {
    return this.prisma.project.update({
      where: { id, workspaceId },
      data,
    })
  }

  async softDelete(id: string, workspaceId: string): Promise<void> {
    await this.prisma.project.update({
      where: { id, workspaceId },
      data: { deletedAt: new Date() },
    })
  }
}

export const projectRepository = new ProjectRepository()
