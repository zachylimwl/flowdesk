import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/queryKeys'
import {
  projectsOptions,
  projectDetailOptions,
} from '@/features/projects/queries'

// Temporary local types — move to packages/shared once that package is populated
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
export type ProjectRole = 'LEAD' | 'MEMBER' | 'VIEWER'

export interface ProjectMember {
  userId: string
  projectId: string
  workspaceId: string
  role: ProjectRole
  user: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

export interface ProjectSummary {
  id: string
  workspaceId: string
  name: string
  slug: string
  description: string | null
  color: string | null
  status: ProjectStatus
  taskCount: number
  createdAt: string
  updatedAt: string
}

export interface ProjectDetail extends ProjectSummary {
  members: ProjectMember[]
}

export interface ListProjectsResponse {
  projects: ProjectSummary[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

interface CreateProjectBody {
  name: string
  slug: string
  description?: string
  color?: string
  status?: ProjectStatus
}

interface UpdateProjectBody {
  name?: string
  description?: string
  status?: ProjectStatus
}

export function useProjects(workspaceId: string) {
  const { data, isLoading, error } = useQuery(projectsOptions(workspaceId))
  return { projects: data?.projects, isLoading, error }
}

export function useProject(workspaceId: string, projectId: string) {
  return useQuery(projectDetailOptions(workspaceId, projectId))
}

export function useCreateProject(workspaceId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateProjectBody) =>
      apiClient
        .post<ProjectDetail>(`/workspaces/${workspaceId}/projects`, body)
        .then((res) => res.data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.projects.list(workspaceId) })
    },
  })
}

export function useUpdateProject(workspaceId: string, projectId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateProjectBody) =>
      apiClient
        .patch<ProjectDetail>(
          `/workspaces/${workspaceId}/projects/${projectId}`,
          body,
        )
        .then((res) => res.data),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.projects.list(workspaceId) }),
        qc.invalidateQueries({ queryKey: queryKeys.projects.detail(workspaceId, projectId) }),
      ])
    },
  })
}

export function useDeleteProject(workspaceId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) =>
      apiClient
        .delete(`/workspaces/${workspaceId}/projects/${projectId}`)
        .then((res) => res.data),
    onMutate: async (projectId) => {
      await qc.cancelQueries({ queryKey: queryKeys.projects.list(workspaceId) })
      const previous = qc.getQueryData<ListProjectsResponse>(
        queryKeys.projects.list(workspaceId),
      )
      qc.setQueryData<ListProjectsResponse>(
        queryKeys.projects.list(workspaceId),
        (old) => {
          if (!old) return old
          return { ...old, projects: old.projects.filter((p) => p.id !== projectId) }
        },
      )
      return { previous }
    },
    onError: (_err, _projectId, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.projects.list(workspaceId), context.previous)
      }
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.projects.list(workspaceId) })
    },
  })
}
