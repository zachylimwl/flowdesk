import { Grid, Card, CardContent, Skeleton } from '@mui/material'

export function ProjectsSkeleton() {
  return (
    <Grid container spacing={3}>
      {[0, 1, 2].map((i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Skeleton variant="rectangular" height={180} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}
