import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/queryKeys'
import type { ProjectDetail, ListProjectsResponse } from '@/features/projects/hooks/useProjects'

export const projectsOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: queryKeys.projects.list(workspaceId),
    queryFn: () =>
      apiClient
        .get<ListProjectsResponse>(`/workspaces/${workspaceId}/projects`)
        .then((res) => res.data),
    enabled: !!workspaceId,
  })

export const projectDetailOptions = (workspaceId: string, projectId: string) =>
  queryOptions({
    queryKey: queryKeys.projects.detail(workspaceId, projectId),
    queryFn: () =>
      apiClient
        .get<ProjectDetail>(`/workspaces/${workspaceId}/projects/${projectId}`)
        .then((res) => res.data),
    enabled: !!workspaceId && !!projectId,
  })
