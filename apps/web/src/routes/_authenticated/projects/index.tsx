import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Typography, Box, Button } from '@mui/material'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { ProjectsGrid } from '@/features/projects/components/ProjectsGrid'
import { ProjectsSkeleton } from '@/features/projects/components/ProjectsSkeleton'
import { ProjectFormDialog } from '@/features/projects/components/ProjectFormDialog'
import { DeleteProjectDialog } from '@/features/projects/components/DeleteProjectDialog'
import type { ProjectSummary } from '@/features/projects/hooks/useProjects'

export const Route = createFileRoute('/_authenticated/projects/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const { projects, isLoading } = useProjects(activeWorkspaceId ?? '')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null)
  const [deletingProject, setDeletingProject] = useState<ProjectSummary | null>(null)

  function handleEdit(project: ProjectSummary) {
    setEditingProject(project)
    setIsFormOpen(true)
  }

  function handleDelete(project: ProjectSummary) {
    setDeletingProject(project)
  }

  function handleFormClose() {
    setIsFormOpen(false)
    setEditingProject(null)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Projects</Typography>
        <Button variant="contained" onClick={() => setIsFormOpen(true)}>New project</Button>
      </Box>

      {isLoading && <ProjectsSkeleton />}

      {!isLoading && (!projects || projects.length === 0) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
          <Typography color="text.secondary">No projects yet</Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => setIsFormOpen(true)}>
            Create project
          </Button>
        </Box>
      )}

      {!isLoading && projects && projects.length > 0 && (
        <ProjectsGrid
          projects={projects}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <ProjectFormDialog
        open={isFormOpen}
        onClose={handleFormClose}
        {...(editingProject ? { project: editingProject } : {})}
      />

      <DeleteProjectDialog
        open={deletingProject !== null}
        onClose={() => setDeletingProject(null)}
        project={deletingProject}
      />
    </Box>
  )
}
