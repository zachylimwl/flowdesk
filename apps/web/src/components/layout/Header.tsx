import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'

export interface HeaderProps {
  onMenuClick: () => void
  drawerWidth: number
}

export function Header({ onMenuClick, drawerWidth }: HeaderProps) {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleAccountOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleAccountClose = () => {
    setAnchorEl(null)
  }

  const handleSignOut = () => {
    handleAccountClose()
    useAuthStore.getState().clearAuth()
    void navigate({ to: '/login' })
  }

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          FlowDesk
        </Typography>
        <IconButton color="inherit" onClick={handleAccountOpen}>
          <AccountCircleOutlined />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleAccountClose}
        >
          <MenuItem onClick={handleAccountClose}>Profile</MenuItem>
          <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
