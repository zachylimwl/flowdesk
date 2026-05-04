import { uuidv7 } from 'uuidv7'
import { Prisma } from '../generated/prisma'
import type { Workspace } from '../generated/prisma'
import { BaseRepository } from './base.repository'

const workspaceWithMemberRoleArgs = {
  include: { members: true },
} satisfies Prisma.WorkspaceDefaultArgs

export type WorkspaceWithMemberRole = Prisma.WorkspaceGetPayload<
  typeof workspaceWithMemberRoleArgs
>

export class WorkspaceRepository extends BaseRepository {
  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
    })
  }

  async findByMember(userId: string): Promise<WorkspaceWithMemberRole[]> {
    return this.prisma.workspace.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: { where: { userId } },
      },
    })
  }

  async create(data: {
    name: string
    slug: string
    ownerId: string
  }): Promise<Workspace> {
    return this.prisma.$transaction(async (tx) => {
      return tx.workspace.create({
        data: {
          id: uuidv7(),
          name: data.name,
          slug: data.slug,
          members: {
            create: {
              id: uuidv7(),
              userId: data.ownerId,
              role: 'OWNER',
            },
          },
        },
      })
    })
  }

  async update(
    id: string,
    data: Partial<{ name: string; logoUrl: string }>,
  ): Promise<Workspace> {
    return this.prisma.workspace.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workspace.delete({ where: { id } })
  }
}

export const workspaceRepository = new WorkspaceRepository()
