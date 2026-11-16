import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { errorText, useApi } from '../lib/api.js';
import { CopyBlock, makeToken } from '../manual/ManualDialog.jsx';
import { GAS_CODE, GITHUB_YML, GITHUB_YML_PATH } from '../manual/snippets.js';

// 연동 등록 마법사: 구글 앱스 스크립트(GAS) / 깃허브 액션을 한 창에서 준비하고 등록한다.
//  1) 종류·그룹 고르기  2) 준비(복사해서 붙여 넣기)  3) 주소·비밀값 입력 → 인증정보 등록 (+ 워크플로우 바로 만들기)
// 비밀값은 이 창 안에서만 잡고 있다가 등록하거나 닫으면 지운다. 서버에는 등록할 때 한 번만 보낸다.
const GAS_URL = /^https:\/\/script\.google\.com\/\S+$/;
const REPO = /^[\w.-]+\/[\w.-]+$/;

const KINDS = {
  gas: { label: '구글 앱스 스크립트', credType: 'gasSecret', nodeKind: 'gas' },
  github: { label: '깃허브 액션', credType: 'githubToken', nodeKind: 'githubActions' },
};

// 등록한 연동으로 바로 돌려 볼 수 있는 워크플로우: 수동 실행 → 연동 노드
function buildGraph(kind, v, credentialId = '') {
  const params =
    kind === 'gas'
      ? { url: v.url.trim(), functionName: v.functionName.trim(), payload: v.functionName.trim() === 'main' ? '{ "name": "{{input.name}}" }' : '', credentialId }
      : { repo: v.repo.trim(), workflow: v.workflow.trim(), ref: v.ref.trim() || 'main', inputs: '', credentialId };
  return {
    nodes: [
      { id: 'trigger_1', type: 'trigger', position: { x: 150, y: 0 }, data: { kind: 'manual', label: '수동 실행', params: {} } },
      { id: 'action_1', type: 'action', position: { x: 150, y: 130 }, data: { kind: KINDS[kind].nodeKind, label: v.name.trim(), params } },
    ],
    edges: [{ id: 'edge_1', source: 'trigger_1', target: 'action_1' }],
  };
}

export default function ConnectDialog({ open, onClose, onDone, initialKind }) {
  const api = useApi();
  const [groups, setGroups] = useState(null);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState('gas');
  const [groupId, setGroupId] = useState('');
  const [v, setV] = useState({ name: '', url: '', functionName: 'main', repo: '', workflow: 'example-dispatch.yml', ref: 'main', secret: '' });
  const [makeFlow, setMakeFlow] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [partial, setPartial] = useState(null); // 인증정보는 만들어졌고 워크플로우만 실패했을 때
  const [result, setResult] = useState(null); // 등록이 끝난 뒤 남은 할 일 안내
  const set = (k) => (e) => setV((o) => ({ ...o, [k]: e.target.value }));

  useEffect(() => {
    if (!open) return;
    setKind(initialKind || 'gas'); setStep(initialKind ? 1 : 0); setError(''); setPartial(null); setResult(null); setMakeFlow(true);
    setV({ name: '', url: '', functionName: 'main', repo: '', workflow: 'example-dispatch.yml', ref: 'main', secret: '' });
    setGroups(null);
    api('/groups').then((r) => {
      if (!r.ok) { setGroups([]); setError(errorText(r)); return; }
      const ok = r.body.groups.filter((g) => g.permissions?.manageMembers);
      setGroups(ok);
      setGroupId(ok[0]?.id || '');
    });
  }, [open, api, initialKind]);

  function close(openEditor = false) {
    setV((o) => ({ ...o, secret: '' })); // 비밀값은 화면에 남기지 않는다
    if (result) onDone?.({ credential: result.credential, workflow: result.workflow, openEditor: openEditor === true });
    onClose();
  }

  // 견본 먼저: 주소·비밀값은 비워 둘 수 있다(나중에 편집기에서 채움). 값을 넣었다면 모양은 맞아야 한다.
  const nameOk = v.name.trim().length > 0;
  const hasSecret = v.secret.trim().length > 0;
  const fieldsOk =
    kind === 'gas'
      ? !v.url.trim() || GAS_URL.test(v.url.trim())
      : (!v.repo.trim() || REPO.test(v.repo.trim())) && v.workflow.trim().length > 0;
  const inputOk = nameOk && fieldsOk && (hasSecret || makeFlow);

  async function submit() {
    setSaving(true); setError('');
    let credential = null;
    if (hasSecret) {
      const c = await api('/credentials', { method: 'POST', json: { groupId, name: v.name.trim(), type: KINDS[kind].credType, secret: v.secret.trim() } });
      if (!c.ok) { setSaving(false); setError(errorText(c)); return; }
      credential = c.body.credential;
    }
    setV((o) => ({ ...o, secret: '' }));
    let workflow = null;
    if (makeFlow) {
      const w = await api('/workflows', { method: 'POST', json: { groupId, name: v.name.trim(), ...buildGraph(kind, v, credential?.id || '') } });
      if (!w.ok) {
        setSaving(false);
        if (credential) { setPartial({ credential }); setError(`인증정보는 등록됐지만 워크플로우를 만들지 못했습니다: ${errorText(w)}`); }
        else setError(errorText(w));
        return;
      }
      workflow = w.body.workflow;
    }
    setSaving(false);
    const todo = [];
    if (kind === 'gas' ? !v.url.trim() : !v.repo.trim()) todo.push(kind === 'gas' ? '웹 앱 주소(…/exec)를 노드의 속성 패널에 입력' : '저장소(owner/repo)를 노드의 속성 패널에 입력');
    if (!credential) todo.push(`${kind === 'gas' ? 'GAS 비밀값' : 'GitHub 토큰'}을 인증정보 화면의 "연동 추가"에서 등록한 뒤, 노드의 "인증정보" 칸에서 선택`);
    setResult({ credential, workflow, todo, wfName: v.name.trim() });
  }

  const noGroups = groups !== null && groups.length === 0 && !error;

  return (
    <Dialog open={open} onClose={saving ? undefined : () => close()} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ fontWeight: 800 }}>연동 추가 · {result ? '완료' : `${step + 1}/3 ${['종류 고르기', '준비하기', '입력하고 등록'][step]}`}</DialogTitle>
      <DialogContent dividers>
        {result ? (
          <Stack sx={{ gap: 1.5 }}>
            <Alert severity="success">
              {[result.credential && '인증정보 등록', result.workflow && `워크플로우 “${result.wfName}” 생성`].filter(Boolean).join(' · ')} 완료
            </Alert>
            {result.todo.length > 0 ? (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>남은 할 일</Typography>
                {result.todo.map((t, i) => <Typography key={i} variant="body2">☐ {t}</Typography>)}
                <Typography variant="body2" color="text.secondary">노드 값은 편집기에서 노드를 누르면 오른쪽(폰은 아래) 속성 패널에서 고칠 수 있습니다.</Typography>
              </>
            ) : <Typography variant="body2">남은 설정이 없습니다. 편집기에서 “실행”을 눌러 보세요.</Typography>}
          </Stack>
        ) : (<>
        {error && <Alert severity={partial ? 'warning' : 'error'} sx={{ mb: 2 }}>{error}</Alert>}
        {groups === null ? <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress /></Box>
          : noGroups ? <Alert severity="info">연동은 그룹의 소유자·관리자만 등록할 수 있습니다. 해당하는 그룹이 없습니다.</Alert>
          : step === 0 ? (
            <Stack sx={{ gap: 2 }}>
              <Typography variant="body2">워크플로우에서 쓸 작업 방식을 고르세요.</Typography>
              <ToggleButtonGroup exclusive fullWidth color="primary" value={kind} onChange={(_, k) => k && setKind(k)} orientation="vertical">
                <ToggleButton value="gas" sx={{ justifyContent: 'flex-start', textAlign: 'left', gap: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                  <b>구글 앱스 스크립트 (GAS)</b>
                  <span>구글 시트·메일·캘린더 등을 다루는 가벼운 작업. 15초 안에 끝나는 일.</span>
                </ToggleButton>
                <ToggleButton value="github" sx={{ justifyContent: 'flex-start', textAlign: 'left', gap: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                  <b>깃허브 액션</b>
                  <span>내 저장소의 GitHub Actions 실행. 빌드·배포·긴 작업(끝날 때까지 기다림).</span>
                </ToggleButton>
              </ToggleButtonGroup>
              <TextField select label="그룹 (이 그룹에서만 쓸 수 있습니다)" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </TextField>
            </Stack>
          ) : step === 1 ? (
            kind === 'gas' ? (
              <Stack sx={{ gap: 1 }}>
                <Typography variant="body2"><b>1.</b> https://script.google.com → “새 프로젝트” → 기존 코드를 모두 지우고 아래 코드를 붙여 넣은 뒤 저장(💾).</Typography>
                <CopyBlock label="Apps Script 코드" text={GAS_CODE} code />
                <Typography variant="body2"><b>2.</b> 비밀값을 만들어 복사합니다. Apps Script의 ⚙ 프로젝트 설정 → 스크립트 속성 추가 → 속성 <code>TOKEN</code>, 값에 이 비밀값을 붙여 넣고 저장합니다. (다음 단계에 자동으로 들어갑니다)</Typography>
                {v.secret ? <CopyBlock label="만든 비밀값" text={v.secret} />
                  : <Button size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={() => setV((o) => ({ ...o, secret: makeToken() }))}>무작위 비밀값 만들기</Button>}
                <Typography variant="body2"><b>3.</b> 배포 → 새 배포 → 톱니바퀴 “웹 앱” → 다음 사용자로 실행 “나”, 액세스 권한 “모든 사용자” → 배포(처음이면 “액세스 승인”). 나온 <code>…/exec</code> 주소를 복사해 다음 단계에 붙여 넣습니다.</Typography>
              </Stack>
            ) : (
              <Stack sx={{ gap: 1 }}>
                <Typography variant="body2"><b>1.</b> 깃허브 저장소 → Add file → Create new file. 이름 칸에 경로, 큰 칸에 내용을 붙여 넣고 Commit (main 브랜치). 이미 실행할 yml이 있으면 건너뛰어도 됩니다. 그 파일에는 <code>workflow_dispatch</code>가 있어야 합니다.</Typography>
                <CopyBlock label="파일 이름(경로)" text={GITHUB_YML_PATH} />
                <CopyBlock label="파일 내용" text={GITHUB_YML} code />
                <Typography variant="body2"><b>2.</b> 토큰 만들기: 깃허브 내 사진 → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token. Repository access는 “Only select repositories”로 그 저장소만, Repository permissions의 <b>Actions</b>를 <b>Read and write</b>로 → Generate. 나온 <code>github_pat_…</code> 토큰은 한 번만 보이니 복사해 두세요.</Typography>
              </Stack>
            )
          ) : (
            <Stack sx={{ gap: 2 }}>
              <Alert severity="success" icon={false}>
                <b>가장 쉬운 방법:</b> 아래 “이름”만 적고 <b>[견본 만들기]</b>를 누르세요. 나머지(주소·비밀값)는 아직 몰라도 됩니다. 만든 뒤 “남은 할 일”을 따라 하나씩 채우면 됩니다.
              </Alert>
              <TextField label="이름 (노드에서 고를 때 보임)" value={v.name} onChange={set('name')} required inputProps={{ maxLength: 50 }}
                placeholder={kind === 'gas' ? '내 앱스 스크립트' : '내 깃허브 액션'} />
              {kind === 'gas' ? (
                <>
                  <TextField label="웹 앱 주소 (…/exec) · 나중에 입력 가능" value={v.url} onChange={set('url')} placeholder="https://script.google.com/macros/s/.../exec"
                    error={!!v.url && !GAS_URL.test(v.url.trim())} helperText={v.url && !GAS_URL.test(v.url.trim()) ? 'https://script.google.com/ 으로 시작해야 합니다' : '어디서? Apps Script → 배포 → 새 배포 후 나오는 “웹 앱 URL”. 아직 없으면 비워 두세요'} />
                  <TextField label="실행할 함수 이름" value={v.functionName} onChange={set('functionName')} helperText="견본 코드의 main 이 기본입니다" />
                </>
              ) : (
                <>
                  <TextField label="저장소 (owner/repo) · 나중에 입력 가능" value={v.repo} onChange={set('repo')} placeholder="내아이디/내저장소"
                    error={!!v.repo && !REPO.test(v.repo.trim())} helperText={v.repo && !REPO.test(v.repo.trim()) ? 'owner/repo 모양이어야 합니다' : '어디서? 깃허브 저장소 주소의 github.com/ 뒤 두 칸 (예: jeong-jihyun/flowbuilder). 아직 없으면 비워 두세요'} />
                  <TextField label="워크플로우 파일" value={v.workflow} onChange={set('workflow')} required helperText="저장소의 .github/workflows 안 파일 이름. 견본 yml을 올렸다면 그대로 두세요" />
                  <TextField label="브랜치" value={v.ref} onChange={set('ref')} />
                </>
              )}
              <TextField label={kind === 'gas' ? 'GAS 비밀값 (Apps Script의 TOKEN과 같은 값)' : 'GitHub 토큰'} type="password" value={v.secret} onChange={set('secret')} autoComplete="new-password"
                helperText="비워 두면 견본 워크플로우만 만들고, 비밀값은 나중에 등록합니다. 저장하면 암호화되어 다시 볼 수 없습니다." />
              <FormControlLabel control={<Checkbox checked={makeFlow} onChange={(e) => setMakeFlow(e.target.checked)} />}
                label="이 연동으로 바로 돌려 볼 워크플로우도 만들기 (수동 실행 → 연동)" />
            </Stack>
          )}
        </>)}
      </DialogContent>
      <DialogActions>
        {result ? (
          <>
            <Button onClick={() => close()}>닫기</Button>
            {result.workflow && <Button variant="contained" onClick={() => close(true)}>편집기에서 이어서 하기</Button>}
          </>
        ) : (
          <>
            <Button onClick={() => close()} disabled={saving}>{partial ? '닫기' : '취소'}</Button>
            {step > 0 && !partial && <Button onClick={() => setStep(step - 1)} disabled={saving}>이전</Button>}
            {step < 2 && !noGroups && <Button variant="contained" onClick={() => setStep(step + 1)} disabled={!groupId}>다음</Button>}
            {step === 2 && !partial && <Button variant="contained" onClick={submit} disabled={saving || !inputOk}>{saving ? '만드는 중…' : hasSecret ? '등록' : '견본 만들기'}</Button>}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
