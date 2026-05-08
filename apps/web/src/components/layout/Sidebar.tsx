import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import DashboardOutlined from '@mui/icons-material/DashboardOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import { useNavigate, useRouterState } from '@tanstack/react-router'

export interface SidebarProps {
  open: boolean
  onClose: () => void
  drawerWidth: number
}

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardOutlined /> },
  { label: 'Projects', path: '/projects', icon: <FolderOutlined /> },
  { label: 'Settings', path: '/settings', icon: <SettingsOutlined /> },
]

export function Sidebar({ open, onClose, drawerWidth }: SidebarProps) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()

  const drawerContent = (
    <List sx={{ width: drawerWidth }}>
      {navItems.map(({ label, path, icon }) => (
        <ListItem key={path} disablePadding>
          <ListItemButton
            selected={pathname.startsWith(path)}
            onClick={() => void navigate({ to: path })}
          >
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  )

  if (isDesktop) {
    return (
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>
    )
  }

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      {drawerContent}
    </Drawer>
  )
}
