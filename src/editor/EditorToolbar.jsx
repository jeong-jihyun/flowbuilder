import { Box, Button, Divider, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteIcon from '@mui/icons-material/Delete';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RuleIcon from '@mui/icons-material/Rule';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PublishIcon from '@mui/icons-material/Publish';
import AddIcon from '@mui/icons-material/Add';

// 설계 3.2의 상단 Toolbar: Save Undo Redo Validate Run Publish.
// 아직 만들지 않은 기능은 눌리지 않게 두고, 몇 단계에서 되는지 알려 준다.
function ToolButton({ icon, label, tip, onClick, disabled, compact }) {
  const button = compact ? (
    <IconButton onClick={onClick} disabled={disabled} aria-label={label} size="medium">
      {icon}
    </IconButton>
  ) : (
    <Button onClick={onClick} disabled={disabled} startIcon={icon} size="small" sx={{ minHeight: 36 }}>
      {label}
    </Button>
  );
  // 눌리지 않는 버튼도 설명이 보이게 span 으로 감싼다
  return (
    <Tooltip title={tip || label}>
      <span>{button}</span>
    </Tooltip>
  );
}

export default function EditorToolbar({ history, hasSelection, onDelete, onFit, onReset, onAddNode }) {
  const theme = useTheme();
  const compact = !useMediaQuery(theme.breakpoints.up('md'));
  const sep = <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.25,
        px: 1,
        py: 0.5,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        overflowX: 'auto',
        // 휴대폰에서는 옆으로 밀어서 보되 스크롤 막대는 숨긴다
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        flexShrink: 0,
      }}
    >
      {compact && (
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onAddNode} sx={{ mr: 0.5, flexShrink: 0 }}>
          노드
        </Button>
      )}
      <ToolButton compact={compact} icon={<SaveIcon />} label="Save" tip="저장은 6단계에서 만듭니다 (지금은 이 기기에 임시 저장)" disabled />
      {sep}
      <ToolButton compact={compact} icon={<UndoIcon />} label="Undo" tip="실행 취소 (Ctrl+Z)" onClick={history.undo} disabled={!history.canUndo} />
      <ToolButton compact={compact} icon={<RedoIcon />} label="Redo" tip="다시 실행 (Ctrl+Y)" onClick={history.redo} disabled={!history.canRedo} />
      <ToolButton compact={compact} icon={<DeleteIcon />} label="Delete" tip="선택한 노드·연결선 삭제 (Delete)" onClick={onDelete} disabled={!hasSelection} />
      <ToolButton compact={compact} icon={<FitScreenIcon />} label="Fit" tip="전체 보기" onClick={onFit} />
      <ToolButton compact={compact} icon={<RestartAltIcon />} label="Example" tip="예시 흐름으로 되돌리기 (실행 취소 가능)" onClick={onReset} />
      {sep}
      <ToolButton compact={compact} icon={<RuleIcon />} label="Validate" tip="검증은 7단계에서 만듭니다" disabled />
      <ToolButton compact={compact} icon={<PlayArrowIcon />} label="Run" tip="실행은 8단계에서 만듭니다" disabled />
      <ToolButton compact={compact} icon={<PublishIcon />} label="Publish" tip="게시는 저장(6단계) 이후에 만듭니다" disabled />
    </Box>
  );
}
