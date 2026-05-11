import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface WorkspaceState {
  // Persisted (localStorage via zustand/persist)
  activeWorkspaceId: string | null
}

interface WorkspaceActions {
  setActiveWorkspace: (id: string) => void
  clearWorkspace: () => void
}

type WorkspaceStore = WorkspaceState & WorkspaceActions

const initialState: WorkspaceState = {
  activeWorkspaceId: null,
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      ...initialState,

      setActiveWorkspace: (id) => {
        set({ activeWorkspaceId: id })
      },

      clearWorkspace: () => {
        set({ activeWorkspaceId: null })
      },
    }),
    {
      name: 'flowdesk-workspace',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId }),
    }
  )
)
