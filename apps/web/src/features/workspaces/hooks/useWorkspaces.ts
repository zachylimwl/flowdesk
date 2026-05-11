import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/auth.store'
import { useWorkspaceStore } from '@/stores/workspace.store'

// Temporary local types — move to packages/shared once that package is populated
export interface Workspace {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

interface ListWorkspacesResponse {
  workspaces: Workspace[]
}

export function useWorkspaces() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.workspaces.all(),
    queryFn: () =>
      apiClient
        .get<ListWorkspacesResponse>('/workspaces')
        .then((res) => res.data.workspaces),
    enabled: isAuthenticated,
  })
}

export function useInitializeWorkspace() {
  const { data: workspaces } = useWorkspaces()
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)

  useEffect(() => {
    const [first] = workspaces ?? []
    if (first && activeWorkspaceId === null) {
      setActiveWorkspace(first.id)
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspace])
}
