import { useState } from 'react'
import { isAxiosError } from 'axios'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Typography,
} from '@mui/material'
import { useDeleteProject } from '@/features/projects/hooks/useProjects'
import type { ProjectSummary } from '@/features/projects/hooks/useProjects'
import { useWorkspaceStore } from '@/stores/workspace.store'

export interface DeleteProjectDialogProps {
  open: boolean
  onClose: () => void
  project: ProjectSummary | null
}

export function DeleteProjectDialog({ open, onClose, project }: DeleteProjectDialogProps) {
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  // activeWorkspaceId is non-null here — dialog only renders inside authenticated workspace routes.
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) ?? ''
  const deleteMutation = useDeleteProject(workspaceId)
  const isPending = deleteMutation.isPending

  async function handleDelete() {
    if (!project) return
    try {
      await deleteMutation.mutateAsync(project.id)
      setSnackbar({ open: true, message: 'Project deleted', severity: 'success' })
    } catch (err) {
      const apiMessage = isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)
            ?.error?.message
        : undefined
      setSnackbar({
        open: true,
        message: apiMessage ?? 'Failed to delete project. Please try again.',
        severity: 'error',
      })
    } finally {
      onClose()
    }
  }

  function handleSnackbarClose() {
    setSnackbar((s) => ({ ...s, open: false }))
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={isPending ? undefined : onClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete project?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete &ldquo;{project?.name}&rdquo;? This action cannot be undone and will
            also delete all tasks within the project.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={isPending}
            sx={{ minWidth: 80 }}
          >
            {isPending ? <CircularProgress size={22} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
      >
        <Alert severity={snackbar.severity} onClose={handleSnackbarClose}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
