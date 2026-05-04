import { uuidv7 } from 'uuidv7'
import type { Prisma, Task } from '../generated/prisma'
import { TaskStatus, TaskPriority } from '../generated/prisma'
import { BaseRepository } from './base.repository'

const taskWithAssigneesInclude = {
  include: {
    assignees: {
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    },
  },
} satisfies Prisma.TaskDefaultArgs

type TaskWithAssignees = Prisma.TaskGetPayload<typeof taskWithAssigneesInclude>

export class TaskRepository extends BaseRepository {
  async findById(id: string, workspaceId: string): Promise<Task | null> {
    return this.prisma.task.findFirst({
      where: { id, deletedAt: null, project: { workspaceId } },
    })
  }

  async findByProject(
    projectId: string,
    options?: {
      status?: TaskStatus
      assigneeId?: string
      limit?: number
      offset?: number
    },
  ): Promise<{ tasks: TaskWithAssignees[]; total: number }> {
    const limit = Math.min(options?.limit ?? 20, 100)
    const offset = options?.offset ?? 0

    const where: Prisma.TaskWhereInput = {
      projectId,
      deletedAt: null,
      ...(options?.status !== undefined ? { status: options.status } : {}),
      ...(options?.assigneeId !== undefined
        ? { assignees: { some: { userId: options.assigneeId } } }
        : {}),
    }

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip: offset,
        take: limit,
        ...taskWithAssigneesInclude,
      }),
      this.prisma.task.count({ where }),
    ])

    return { tasks, total }
  }

  async findByAssignee(userId: string, workspaceId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        assignees: { some: { userId } },
        project: { deletedAt: null },
      },
      orderBy: { dueDate: { sort: 'asc', nulls: 'last' } },
    })
  }

  async create(data: {
    title: string
    description?: string
    projectId: string
    workspaceId: string
    createdById: string
    assigneeId?: string
    priority?: TaskPriority
    dueDate?: Date
    status?: TaskStatus
  }): Promise<Task> {
    const taskId = uuidv7()

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          id: taskId,
          title: data.title,
          description: data.description ?? null,
          projectId: data.projectId,
          workspaceId: data.workspaceId,
          createdById: data.createdById,
          priority: data.priority ?? TaskPriority.NONE,
          dueDate: data.dueDate ?? null,
          status: data.status ?? TaskStatus.BACKLOG,
          position: 0,
        },
      })

      if (data.assigneeId !== undefined) {
        await tx.taskAssignee.create({
          data: {
            id: uuidv7(),
            taskId,
            userId: data.assigneeId,
            workspaceId: data.workspaceId,
            assignedById: data.createdById,
          },
        })
      }

      return task
    })
  }

  async update(
    id: string,
    projectId: string,
    data: Partial<{
      title: string
      description: string
      status: TaskStatus
      assigneeId: string | null
      priority: TaskPriority
      dueDate: Date | null
      position: number
    }>,
  ): Promise<Task> {
    // assigneeId is not a direct Task column — assignment changes go through TaskAssignee at the service layer
    const { assigneeId: _assigneeId, ...taskFields } = data
    return this.prisma.task.update({
      where: { id, projectId },
      data: taskFields,
    })
  }

  async softDelete(id: string, projectId: string): Promise<void> {
    await this.prisma.task.update({
      where: { id, projectId },
      data: { deletedAt: new Date() },
    })
  }

  async updatePosition(id: string, projectId: string, position: number): Promise<Task> {
    return this.prisma.task.update({
      where: { id, projectId },
      data: { position },
    })
  }
}

export const taskRepository = new TaskRepository()
