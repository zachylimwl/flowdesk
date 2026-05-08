import { createFileRoute } from '@tanstack/react-router'
import { Typography, Box } from '@mui/material'

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4">Dashboard</Typography>
      <Typography variant="subtitle1" color="text.secondary">
        Welcome to FlowDesk
      </Typography>
    </Box>
  )
}
