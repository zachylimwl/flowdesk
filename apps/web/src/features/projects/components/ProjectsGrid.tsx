import { Grid } from '@mui/material'
import { ProjectCard } from '@/features/projects/components/ProjectCard'
import type { ProjectSummary } from '@/features/projects/hooks/useProjects'

export interface ProjectsGridProps {
  projects: ProjectSummary[]
  onEdit: (project: ProjectSummary) => void
  onDelete: (project: ProjectSummary) => void
}

export function ProjectsGrid({ projects, onEdit, onDelete }: ProjectsGridProps) {
  return (
    <Grid container spacing={3}>
      {projects.map((project) => (
        <Grid key={project.id} size={{ xs: 12, sm: 6, md: 4 }}>
          <ProjectCard
            project={project}
            onEdit={() => onEdit(project)}
            onDelete={() => onDelete(project)}
          />
        </Grid>
      ))}
    </Grid>
  )
}
