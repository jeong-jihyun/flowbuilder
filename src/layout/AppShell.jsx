import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { UserButton } from '@clerk/react';
import { MENU } from '../menu.js';
import { AUTH_ENABLED } from '../lib/authConfig.js';

const SIDE_WIDTH = 220;
const COLLAPSED_SIDE_WIDTH = 68;
const MENU_ICONS = {
  '/': <DashboardOutlinedIcon fontSize="small" />,
  '/groups': <GroupsOutlinedIcon fontSize="small" />,
  '/workflows': <AccountTreeOutlinedIcon fontSize="small" />,
  '/editor': <EditNoteOutlinedIcon fontSize="small" />,
  '/executions': <HistoryOutlinedIcon fontSize="small" />,
  '/credentials': <VpnKeyOutlinedIcon fontSize="small" />,
  '/settings': <SettingsOutlinedIcon fontSize="small" />,
};

function SideMenu({ onPick, collapsed = false, onToggle, collapsible = false }) {
  const { pathname } = useLocation();
  return (
    <Box>
      {collapsible && (
        <Box sx={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', px: 1, pt: 1.5 }}>
          <Tooltip title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}>
            <IconButton
              size="small"
              aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
              onClick={onToggle}
              sx={{ color: 'text.secondary' }}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
      <List sx={{ py: 1 }}>
        {MENU.map((m) => (
          <Tooltip key={m.path} title={collapsed ? m.label : ''} placement="right" disableHoverListener={!collapsed}>
            <ListItemButton
              component={NavLink}
              to={m.path}
              // /groups/abc 처럼 하위 주소에 있어도 상위 메뉴를 선택 상태로 둔다
              selected={pathname === m.path || (m.path !== '/' && pathname.startsWith(`${m.path}/`))}
              onClick={onPick}
              sx={{ mx: 1, borderRadius: 1, minHeight: 44, justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 0 : 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, justifyContent: 'center', color: 'inherit' }}>
                {MENU_ICONS[m.path]}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={m.label} />}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Box>
  );
}

// 화면 공통 틀: 상단바 + 왼쪽 메뉴 + 본문.
// PC에서는 왼쪽 메뉴가 항상 보이고, 모바일에서는 ☰ 버튼으로 여닫는다.
export default function AppShell({ children }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <AppBar position="static" elevation={0} color="inherit" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          {!isDesktop && (
            <IconButton edge="start" aria-label="메뉴 열기" onClick={() => setOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700, flexGrow: 1 }}>
            FlowBuilder
          </Typography>
          {/* 로그인한 사용자 사진. 누르면 계정 관리·로그아웃 메뉴가 열린다 */}
          {AUTH_ENABLED ? <UserButton /> : <Avatar sx={{ width: 32, height: 32 }} />}
        </Toolbar>
      </AppBar>

      {!AUTH_ENABLED && (
        <Alert severity="warning" square sx={{ py: 0 }}>
          로그인 미설정: Clerk 키가 없어 누구나 볼 수 있는 상태입니다.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
        {isDesktop ? (
          <Box
            component="nav"
            sx={{ width: collapsed ? COLLAPSED_SIDE_WIDTH : SIDE_WIDTH, flexShrink: 0, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider', overflowY: 'auto', transition: 'width 180ms ease' }}
          >
            <SideMenu collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} collapsible />
          </Box>
        ) : (
          <Drawer open={open} onClose={() => setOpen(false)}>
            <Box sx={{ width: SIDE_WIDTH }} role="navigation">
              <SideMenu onPick={() => setOpen(false)} />
            </Box>
          </Drawer>
        )}

        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, minHeight: 0, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
