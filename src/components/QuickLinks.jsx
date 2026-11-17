import { Box, Divider } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import GoogleIcon from '@mui/icons-material/Google';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import HistoryIcon from '@mui/icons-material/History';
import { DEFAULT_REPO, GAS_HOME_URL, GAS_NEW_URL, GITHUB_TOKEN_URL } from '../manual/snippets.js';

// 깃허브 액션·구글 앱스 스크립트(GAS) 관련 바로가기. 아이콘만 보이고, 이름은 title(마우스를 올리면 말풍선)과
// 접근성 이름(aria-label·아이콘 안 title)으로 제공한다. 눌러서 열리는 페이지는 모두 새 창(새 탭)이다.
export const GITHUB_LINKS = [
  { name: '깃허브 저장소', href: `https://github.com/${DEFAULT_REPO}`, Icon: GitHubIcon },
  { name: '깃허브 토큰 만들기 (이름·권한 미리 채움)', href: GITHUB_TOKEN_URL, Icon: VpnKeyIcon },
  { name: '깃허브 토큰 목록·만료일 확인', href: 'https://github.com/settings/personal-access-tokens', Icon: ListAltIcon },
  { name: '깃허브 액션 실행 기록', href: `https://github.com/${DEFAULT_REPO}/actions`, Icon: PlayCircleOutlineIcon },
];
export const GAS_LINKS = [
  { name: '구글 앱스 스크립트 프로젝트 목록', href: GAS_HOME_URL, Icon: GoogleIcon },
  { name: '구글 앱스 스크립트 새 프로젝트 만들기', href: GAS_NEW_URL, Icon: AddCircleOutlineIcon },
  { name: '구글 앱스 스크립트 실행 기록', href: 'https://script.google.com/home/executions', Icon: HistoryIcon },
];

function LinkIcon({ name, href, Icon, color }) {
  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={name}
      aria-label={name}
      sx={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 1,
        color, '&:hover, &:focus-visible': { bgcolor: 'action.hover' },
      }}
    >
      <Icon fontSize="small" titleAccess={name} />
    </Box>
  );
}

export default function QuickLinks({ sx }) {
  return (
    <Box role="group" aria-label="깃허브 액션·앱스 스크립트 바로가기" sx={{ display: 'inline-flex', alignItems: 'center', ...sx }}>
      {GITHUB_LINKS.map((l) => <LinkIcon key={l.href} {...l} color="#24292f" />)}
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />
      {GAS_LINKS.map((l) => <LinkIcon key={l.href} {...l} color="#1a73e8" />)}
    </Box>
  );
}
