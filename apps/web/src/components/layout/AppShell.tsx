import { useState } from 'react'
import { Box, Toolbar } from '@mui/material'
import { Outlet } from '@tanstack/react-router'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export const DRAWER_WIDTH = 240

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex' }}>
      <Header
        onMenuClick={() => setMobileOpen((prev) => !prev)}
        drawerWidth={DRAWER_WIDTH}
      />
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        drawerWidth={DRAWER_WIDTH}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
