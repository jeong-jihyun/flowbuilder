import { Alert, Box, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// 아래쪽 검증 결과 패널 (설계 3.2 하단 "Errors / Results" 자리).
// 열려 있는 동안에는 고칠 때마다 결과가 바로 바뀐다. 항목을 누르면 그 노드로 이동한다.
export default function ValidationPanel({ result, onClose, onPick }) {
  const items = [...result.errors, ...result.warnings];
  return (
    <Box
      sx={{
        flexShrink: 0,
        height: { xs: '38dvh', md: 200 },
        display: 'flex',
        flexDirection: 'column',
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flexGrow: 1 }}>
          검증 결과 · 오류 {result.errors.length} · 경고 {result.warnings.length}
        </Typography>
        <IconButton size="small" aria-label="검증 결과 닫기" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ overflowY: 'auto', flexGrow: 1, px: 1, pb: 1 }}>
        {items.length === 0 ? (
          <Alert severity="success">문제가 없습니다. 이대로 실행할 수 있는 흐름입니다.</Alert>
        ) : (
          <>
            {result.ok && (
              <Alert severity="success" sx={{ mb: 1, py: 0 }}>
                실행을 막는 오류는 없습니다. 아래 경고만 확인하세요.
              </Alert>
            )}
            <List dense disablePadding>
              {items.map((item, i) => (
                <ListItemButton
                  key={`${item.code}-${item.nodeId || item.edgeId || ''}-${i}`}
                  onClick={() => item.nodeId && onPick(item.nodeId)}
                  disabled={!item.nodeId}
                  sx={{ borderRadius: 1, '&.Mui-disabled': { opacity: 1 } }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {item.level === 'error' ? (
                      <ErrorOutlineIcon color="error" fontSize="small" />
                    ) : (
                      <WarningAmberIcon color="warning" fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText primary={item.message} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Box>
    </Box>
  );
}
