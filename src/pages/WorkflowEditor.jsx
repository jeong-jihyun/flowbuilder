import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FlowEditor, { EXAMPLE } from '../editor/FlowEditor.jsx';
import { clearDraft, loadDraft, saveDraft } from '../editor/draftStorage.js';
import SaveWorkflowDialog from '../components/SaveWorkflowDialog.jsx';
import { AUTH_ENABLED } from '../lib/authConfig.js';

// 새 워크플로우 (/editor): 서버에 저장하기 전까지는 이 브라우저에 임시로 남긴다.
// 저장을 누르면 이름·그룹을 고르는 창이 뜨고, 저장되면 /workflows/:id 로 옮겨 간다.
export default function WorkflowEditor() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const initial = useMemo(() => loadDraft() || EXAMPLE, []);
  const [pending, setPending] = useState(null);

  // 저장 창이 열리면 저장할 흐름을 기억해 둔다. 실제 저장은 창에서 한다.
  const onSave = useCallback(async (graph) => {
    setPending(graph);
    return false;
  }, []);

  return (
    <>
      <FlowEditor
        initial={initial}
        onChange={saveDraft}
        onSave={AUTH_ENABLED ? onSave : undefined}
        alwaysSavable
        resetGraph={EXAMPLE}
        exportMeta={{ name: '새 워크플로우' }}
        runTip="서버에 저장한 워크플로우만 실행할 수 있습니다. 먼저 저장하세요."
        header={
          <>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
              새 워크플로우 (저장 전)
            </Typography>
            {isDesktop && (
              <Typography variant="caption" color="text.secondary">
                이 기기에 임시 저장 중입니다. 저장을 누르면 그룹을 골라 서버에 저장합니다. 노드를 누르면 설정을 바꿀 수 있습니다.
              </Typography>
            )}
          </>
        }
      />
      <SaveWorkflowDialog
        open={!!pending}
        graph={pending}
        title="새 워크플로우 저장"
        onClose={() => setPending(null)}
        onCreated={(wf) => {
          // 서버에 저장했으니 임시 저장은 지우고, 저장된 워크플로우 화면으로 간다
          clearDraft();
          navigate(`/workflows/${wf.id}`, { replace: true });
        }}
      />
    </>
  );
}
