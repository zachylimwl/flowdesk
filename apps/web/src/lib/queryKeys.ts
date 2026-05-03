export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  workspaces: {
    all: () => ['workspaces'] as const,
    detail: (workspaceId: string) => ['workspaces', workspaceId] as const,
    members: (workspaceId: string) => ['workspaces', workspaceId, 'members'] as const,
    invitations: (workspaceId: string) => ['workspaces', workspaceId, 'invitations'] as const,
  },
  projects: {
    list: (workspaceId: string) => ['workspaces', workspaceId, 'projects'] as const,
    detail: (workspaceId: string, projectId: string) =>
      ['workspaces', workspaceId, 'projects', projectId] as const,
  },
  tasks: {
    list: (workspaceId: string, projectId: string) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks'] as const,
    detail: (workspaceId: string, taskId: string) =>
      ['workspaces', workspaceId, 'tasks', taskId] as const,
  },
}
