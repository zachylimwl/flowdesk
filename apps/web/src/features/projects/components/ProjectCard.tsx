import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
} from '@mui/material'
import type { ProjectSummary, ProjectStatus } from '@/features/projects/hooks/useProjects'

export interface ProjectCardProps {
  project: ProjectSummary
  onEdit?: () => void
  onDelete?: () => void
}

function statusChipColor(status: ProjectStatus): 'success' | 'default' {
  return status === 'ACTIVE' ? 'success' : 'default'
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{project.name}</Typography>
        {project.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {project.description}
          </Typography>
        )}
        <Chip
          label={project.status}
          color={statusChipColor(project.status)}
          size="small"
          sx={{ mt: 1 }}
        />
      </CardContent>
      {(onEdit || onDelete) && (
        <CardActions>
          {onEdit && (
            <Button size="small" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button size="small" color="error" onClick={onDelete}>
              Delete
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  )
}
