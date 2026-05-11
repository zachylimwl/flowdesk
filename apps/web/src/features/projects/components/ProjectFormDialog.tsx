import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { projectNameSchema } from '@flowdesk/shared'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
} from '@mui/material'
import {
  useCreateProject,
  useUpdateProject,
} from '@/features/projects/hooks/useProjects'
import type { ProjectStatus, ProjectSummary } from '@/features/projects/hooks/useProjects'
import { useWorkspaceStore } from '@/stores/workspace.store'

// Dialog exposes only ACTIVE / ARCHIVED; the broader ProjectStatus union will gain
// ARCHIVED once types move to packages/shared.
const DIALOG_STATUSES = ['ACTIVE', 'ARCHIVED'] as const
type DialogStatus = (typeof DIALOG_STATUSES)[number]

const nameSchema = projectNameSchema

const descriptionSchema = z
  .string()
  .max(500, 'Description must be 500 characters or fewer.')

function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return slug || 'project'
}

function extractErrors(errors: unknown[]): string {
  return errors
    .map((e) => {
      if (typeof e === 'string') return e
      if (typeof e === 'object' && e !== null && 'message' in e) return String((e as { message: unknown }).message)
      return ''
    })
    .filter(Boolean)
    .join(' ')
}

export interface UseProjectFormSnackbarResult {
  snackbarOpen: boolean
  snackbarMessage: string
  showSnackbar: (message: string) => void
  closeSnackbar: () => void
}

export function useProjectFormSnackbar(): UseProjectFormSnackbarResult {
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  return {
    snackbarOpen,
    snackbarMessage,
    showSnackbar(message) {
      setSnackbarMessage(message)
      setSnackbarOpen(true)
    },
    closeSnackbar() {
      setSnackbarOpen(false)
    },
  }
}

export interface ProjectFormDialogProps {
  open: boolean
  onClose: () => void
  project?: ProjectSummary
}

export function ProjectFormDialog({ open, onClose, project }: ProjectFormDialogProps) {
  const isEditMode = project !== undefined
  const [apiError, setApiError] = useState<string | null>(null)
  const { snackbarOpen, snackbarMessage, showSnackbar, closeSnackbar } =
    useProjectFormSnackbar()

  // activeWorkspaceId is non-null here — this dialog is only rendered inside
  // authenticated workspace routes that set activeWorkspaceId before mount.
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) ?? ''
  const projectId = project?.id ?? ''

  const createMutation = useCreateProject(workspaceId)
  const updateMutation = useUpdateProject(workspaceId, projectId)
  const isPending = createMutation.isPending || updateMutation.isPending

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      status: 'ACTIVE' as DialogStatus,
    },
    onSubmit: async ({ value }) => {
      setApiError(null)
      try {
        if (isEditMode) {
          await updateMutation.mutateAsync({
            name: value.name,
            // ARCHIVED is not yet in ProjectStatus — safe cast until types land in packages/shared
            status: value.status as ProjectStatus,
            ...(value.description ? { description: value.description } : {}),
          })
          showSnackbar('Project updated')
        } else {
          await createMutation.mutateAsync({
            name: value.name,
            slug: generateSlug(value.name),
            ...(value.description ? { description: value.description } : {}),
          })
          showSnackbar('Project created')
        }
        form.reset()
        onClose()
      } catch (err) {
        const apiMessage = isAxiosError(err)
          ? (err.response?.data as { error?: { message?: string } } | undefined)
              ?.error?.message
          : undefined
        setApiError(apiMessage ?? 'Something went wrong. Please try again.')
      }
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: project?.name ?? '',
      description: project?.description ?? '',
      status: (project?.status ?? 'ACTIVE') as DialogStatus,
    })
    setApiError(null)
    // form is a stable reference; project?.id tracks which project is being edited
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id])

  function handleClose() {
    if (isPending) return
    form.reset()
    setApiError(null)
    onClose()
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{isEditMode ? 'Edit project' : 'Create project'}</DialogTitle>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {apiError !== null && <Alert severity="error">{apiError}</Alert>}

            <form.Field
              name="name"
              validators={{ onChange: nameSchema, onSubmit: nameSchema }}
            >
              {(field) => {
                const showError =
                  (field.state.meta.isTouched || form.state.submissionAttempts > 0) &&
                  !field.state.meta.isValid
                return (
                  <TextField
                    label="Name"
                    required
                    fullWidth
                    disabled={isPending}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={showError}
                    helperText={showError ? extractErrors(field.state.meta.errors) : undefined}
                  />
                )
              }}
            </form.Field>

            <form.Field
              name="description"
              validators={{ onChange: descriptionSchema, onSubmit: descriptionSchema }}
            >
              {(field) => {
                const showError =
                  (field.state.meta.isTouched || form.state.submissionAttempts > 0) &&
                  !field.state.meta.isValid
                return (
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                    disabled={isPending}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={showError}
                    helperText={showError ? extractErrors(field.state.meta.errors) : undefined}
                  />
                )
              }}
            </form.Field>

            {isEditMode && (
              <form.Field name="status">
                {(field) => {
                  const showError =
                    (field.state.meta.isTouched || form.state.submissionAttempts > 0) &&
                    !field.state.meta.isValid
                  return (
                    <FormControl fullWidth disabled={isPending} error={showError}>
                      <InputLabel id="project-status-label">Status</InputLabel>
                      <Select
                        labelId="project-status-label"
                        label="Status"
                        value={field.state.value}
                        onChange={(e) =>
                          field.handleChange(e.target.value as DialogStatus)
                        }
                        onBlur={field.handleBlur}
                      >
                        <MenuItem value="ACTIVE">Active</MenuItem>
                        <MenuItem value="ARCHIVED">Archived</MenuItem>
                      </Select>
                      {showError && (
                        <FormHelperText>
                          {extractErrors(field.state.meta.errors)}
                        </FormHelperText>
                      )}
                    </FormControl>
                  )
                }}
              </form.Field>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isPending}
              sx={{ minWidth: 80 }}
            >
              {isPending ? (
                <CircularProgress size={22} color="inherit" />
              ) : isEditMode ? (
                'Save'
              ) : (
                'Create'
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        message={snackbarMessage}
      />
    </>
  )
}
