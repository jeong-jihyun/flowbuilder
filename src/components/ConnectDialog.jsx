import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { errorText, useApi } from '../lib/api.js';
import { CopyBlock, makeToken } from '../manual/ManualDialog.jsx';
import { DEFAULT_REPO, GAS_CODE, GAS_HOME_URL, GAS_NEW_URL, GITHUB_TOKEN_URL, GITHUB_YML, GITHUB_YML_PATH } from '../manual/snippets.js';

// 연동 마법사 — 입력을 거의 하지 않고 버튼만 눌러 따라가는 방식.
//  1) 종류 고르기  2) 미리 채워진 내용 확인 후 "이 내용으로 만들기"  3) 만든 뒤 해야 할 일을 버튼·복사로 안내
// 비밀값은 이 창 안에서만 잡고 있다가 닫으면 지운다.
const GAS_URL = /^https:\/\/script\.google\.com\/\S+$/;
const REPO = /^[\w.-]+\/[\w.-]+$/;

const KINDS = {
  gas: { label: '구글 앱스 스크립트', credType: 'gasSecret', nodeKind: 'gas', name: '내 앱스 스크립트' },
  github: { label: '깃허브 액션', credType: 'githubToken', nodeKind: 'githubActions', name: '내 깃허브 액션' },
};

const initial = (kind) => ({
  name: KINDS[kind].name, url: '', functionName: 'main', repo: DEFAULT_REPO, workflow: 'example-dispatch.yml', ref: 'main',
  secret: kind === 'gas' ? makeToken() : '',
});

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

function Row({ k, children }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 92 }}>{k}</Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{children}</Typography>
    </Box>
  );
}

export default function ConnectDialog({ open, onClose, onDone, initialKind }) {
  const api = useApi();
  const [groups, setGroups] = useState(null);
  const [kind, setKind] = useState(initialKind || null);
  const [groupId, setGroupId] = useState('');
  const [v, setV] = useState(initial('gas'));
  const [edit, setEdit] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { workflow, credential, secret, kind, hasCred }
  const [pasteUrl, setPasteUrl] = useState('');
  const [pasteToken, setPasteToken] = useState('');
  const [saved, setSaved] = useState({}); // 안내 단계에서 저장이 끝난 항목
  const [check, setCheck] = useState(null); // 연결 확인(시험 실행) 결과 { state: 'running'|'success'|'failed', text }
  const set = (k) => (e) => setV((o) => ({ ...o, [k]: e.target.value }));

  function pick(k) { setKind(k); setV(initial(k)); setEdit(false); }

  useEffect(() => {
    if (!open) return;
    setError(''); setResult(null); setSaved({}); setCheck(null); setPasteUrl(''); setPasteToken(''); setSaving(false);
    setKind(initialKind || null);
    if (initialKind) setV(initial(initialKind));
    setGroups(null);
    api('/groups').then((r) => {
      if (!r.ok) { setGroups([]); setError(errorText(r)); return; }
      const ok = r.body.groups.filter((g) => g.permissions?.manageMembers);
      setGroups(ok);
      setGroupId(ok[0]?.id || '');
    });
  }, [open, api, initialKind]);

  function close(openEditor = false) {
    setV((o) => ({ ...o, secret: '' })); setPasteToken('');
    if (result) onDone?.({ credential: result.credential, workflow: result.workflow, openEditor: openEditor === true });
    onClose();
  }

  const fieldsOk = kind === 'gas'
    ? !v.url.trim() || GAS_URL.test(v.url.trim())
    : REPO.test(v.repo.trim()) && v.workflow.trim().length > 0;
  const ok = v.name.trim().length > 0 && fieldsOk;

  // "이 내용으로 만들기": GAS는 자동으로 만든 비밀값을 인증정보로 등록하고, 워크플로우를 만든다.
  async function create() {
    setSaving(true); setError('');
    let credential = null;
    if (kind === 'gas') {
      const c = await api('/credentials', { method: 'POST', json: { groupId, name: v.name.trim(), type: KINDS.gas.credType, secret: v.secret } });
      if (!c.ok) { setSaving(false); setError(errorText(c)); return; }
      credential = c.body.credential;
    }
    const w = await api('/workflows', { method: 'POST', json: { groupId, name: v.name.trim(), ...buildGraph(kind, v, credential?.id || '') } });
    setSaving(false);
    if (!w.ok) { setError(`${credential ? '인증정보는 등록됐지만 ' : ''}워크플로우를 만들지 못했습니다: ${errorText(w)}`); return; }
    setResult({ workflow: w.body.workflow, credential, secret: v.secret, kind, vals: { ...v }, groupId });
    if (v.url.trim()) setSaved((o) => ({ ...o, url: true }));
  }

  // 안내 단계: 노드 값을 고쳐서 저장
  async function patchNode(patch) {
    const wf = result.workflow;
    const nodes = wf.nodes.map((n) => (n.id === 'action_1' ? { ...n, data: { ...n.data, params: { ...n.data.params, ...patch } } } : n));
    const r = await api(`/workflows/${wf.id}`, { method: 'PUT', json: { version: wf.version, nodes } });
    if (!r.ok) throw new Error(errorText(r));
    setResult((o) => ({ ...o, workflow: { ...wf, ...r.body.workflow } }));
  }

  async function saveUrl() {
    setSaving(true); setError('');
    try { await patchNode({ url: pasteUrl.trim() }); setSaved((o) => ({ ...o, url: true })); } catch (e) { setError(e.message); }
    setSaving(false);
  }

  async function saveToken() {
    setSaving(true); setError('');
    const c = await api('/credentials', { method: 'POST', json: { groupId: result.groupId, name: result.vals.name.trim(), type: KINDS.github.credType, secret: pasteToken.trim() } });
    if (!c.ok) { setSaving(false); setError(errorText(c)); return; }
    setPasteToken('');
    try { await patchNode({ credentialId: c.body.credential.id }); setSaved((o) => ({ ...o, token: true })); setResult((o) => ({ ...o, credential: c.body.credential })); }
    catch (e) { setError(`토큰은 등록됐지만 워크플로우에 연결하지 못했습니다: ${e.message}`); }
    setSaving(false);
  }

  // 연결 확인: 만든 워크플로우를 한 번 실행해 보고 결과를 바로 보여 준다
  async function runCheck() {
    setCheck({ state: 'running', text: '시험 실행 중… (깃허브는 끝날 때까지 최대 1분쯤 걸립니다)' });
    const r = await api(`/workflows/${result.workflow.id}/run`, { method: 'POST', json: { input: { name: 'FlowBuilder' } } });
    if (!r.ok) { setCheck({ state: 'failed', text: errorText(r) }); return; }
    let ex = r.body.execution;
    for (let i = 0; i < 40 && (ex.status === 'running' || ex.status === 'waiting'); i += 1) {
      await new Promise((res) => setTimeout(res, 1500));
      const g = await api(`/executions/${ex.id}`);
      if (!g.ok) { setCheck({ state: 'failed', text: errorText(g) }); return; }
      ex = g.body.execution;
    }
    if (ex.status === 'success') setCheck({ state: 'success', text: '연결이 잘 됩니다. 앞으로 이 워크플로우를 실행하면 됩니다.' });
    else if (ex.status === 'running' || ex.status === 'waiting') setCheck({ state: 'failed', text: '아직 끝나지 않았습니다. 잠시 뒤 편집기의 실행 기록에서 확인하세요.' });
    else setCheck({ state: 'failed', text: ex.error || '실행에 실패했습니다' });
  }

  const readyToCheck = result && (result.kind === 'gas' ? saved.url : saved.token);
  const noGroups = groups !== null && groups.length === 0 && !error;
  const title = result ? '만들어졌습니다 — 이어서 버튼만 따라가세요' : !kind ? '연동 추가' : `${KINDS[kind].label} 연동 만들기`;

  return (
    <Dialog open={open} onClose={saving ? undefined : () => close()} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {groups === null ? <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress /></Box>
          : noGroups ? <Alert severity="info">연동은 그룹의 소유자·관리자만 만들 수 있습니다. 해당하는 그룹이 없습니다.</Alert>
          : result ? (
            <Stack sx={{ gap: 1.5 }}>
              <Alert severity="success">“{result.vals.name}” 워크플로우가 만들어졌습니다. 아래 번호 순서대로 하면 끝납니다.</Alert>
              {result.kind === 'gas' ? (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>① 코드 넣기</Typography>
                  <Button variant="outlined" component="a" href={GAS_NEW_URL} target="_blank" rel="noopener noreferrer">구글 앱스 스크립트 새 프로젝트 열기</Button>
                  <Typography variant="body2">열린 화면에서 기존 글자를 모두 지우고, 아래 [복사]를 누른 뒤 붙여 넣고 저장(💾)하세요.</Typography>
                  <CopyBlock label="앱스 스크립트 코드" text={GAS_CODE} code />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>② 비밀값 넣기</Typography>
                  <Typography variant="body2">왼쪽 ⚙ 프로젝트 설정 → 스크립트 속성 → “스크립트 속성 추가”. 속성에 <code>TOKEN</code>, 값에 아래 비밀값을 붙여 넣고 저장하세요. (이 창에서만 보이니 지금 복사)</Typography>
                  <CopyBlock label="비밀값 (TOKEN 값)" text={result.secret} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>③ 배포하고 주소 붙여넣기</Typography>
                  <Button variant="outlined" component="a" href={GAS_HOME_URL} target="_blank" rel="noopener noreferrer">내 앱스 스크립트 프로젝트 목록 열기 (배포·승인 화면으로 가는 길)</Button>
                  <Typography variant="body2">오른쪽 위 배포 → 새 배포 → 톱니바퀴 “웹 앱” → 다음 사용자로 실행 “나”, 액세스 권한 “모든 사용자” → 배포(처음이면 “액세스 승인”). 나온 “웹 앱 URL”을 복사해 아래에 붙여 넣으세요.</Typography>
                  {saved.url ? <Alert severity="success">✔ 주소가 저장됐습니다</Alert> : (
                    <>
                      <TextField label="웹 앱 URL 붙여넣기" value={pasteUrl} onChange={(e) => setPasteUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec"
                        error={!!pasteUrl && !GAS_URL.test(pasteUrl.trim())} helperText={pasteUrl && !GAS_URL.test(pasteUrl.trim()) ? 'https://script.google.com/ 으로 시작해야 합니다' : ' '} />
                      <Button variant="contained" onClick={saveUrl} disabled={saving || !GAS_URL.test(pasteUrl.trim())}>주소 저장</Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>① 실행할 파일</Typography>
                  {result.vals.repo === DEFAULT_REPO
                    ? <Alert severity="success" icon={false}>✔ {DEFAULT_REPO} 저장소에 견본 파일(example-dispatch.yml)이 이미 들어 있습니다. 할 일 없음.</Alert>
                    : (<><Typography variant="body2">저장소 → Add file → Create new file → 이름 칸과 내용 칸에 아래를 각각 붙여 넣고 Commit.</Typography>
                      <CopyBlock label="파일 이름" text={GITHUB_YML_PATH} /><CopyBlock label="파일 내용" text={GITHUB_YML} code /></>)}
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>② 토큰 만들어 붙여넣기</Typography>
                  <Button variant="outlined" component="a" href={GITHUB_TOKEN_URL} target="_blank" rel="noopener noreferrer">깃허브 토큰 만드는 곳 열기</Button>
                  <Typography variant="body2">열린 화면에서: Token name 아무거나 → Repository access “Only select repositories”에서 저장소 선택 → Permissions의 Repository permissions → <b>Actions</b>를 <b>Read and write</b> → 맨 아래 Generate token. 나온 <code>github_pat_…</code> 글자를 복사해 아래에 붙여 넣으세요.</Typography>
                  {saved.token ? <Alert severity="success">✔ 토큰이 저장되고 워크플로우에 연결됐습니다</Alert> : (
                    <>
                      <TextField label="깃허브 토큰 붙여넣기" type="password" value={pasteToken} onChange={(e) => setPasteToken(e.target.value)} autoComplete="new-password" helperText="저장하면 암호화되어 다시 볼 수 없습니다." />
                      <Button variant="contained" onClick={saveToken} disabled={saving || !pasteToken.trim()}>토큰 저장</Button>
                    </>
                  )}
                </>
              )}
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>④ 연결 확인</Typography>
              <Button variant="contained" color="success" onClick={runCheck} disabled={!readyToCheck || check?.state === 'running'}>
                {check?.state === 'running' ? '확인하는 중…' : '연결 확인 (시험 실행)'}
              </Button>
              {!readyToCheck && <Typography variant="caption" color="text.secondary">위 {result.kind === 'gas' ? '③ 주소 저장' : '② 토큰 저장'}을 마치면 눌러 볼 수 있습니다.</Typography>}
              {check && <Alert severity={check.state === 'success' ? 'success' : check.state === 'failed' ? 'error' : 'info'}>{check.state === 'success' ? '✔ ' : check.state === 'failed' ? '✖ ' : ''}{check.text}</Alert>}
              <Typography variant="body2" color="text.secondary">다 끝나면 [편집기에서 열기] → 위쪽 “실행” 버튼으로 시험해 보세요. 안 해도 만들어진 워크플로우는 그대로 남아 있습니다.</Typography>
            </Stack>
          ) : !kind ? (
            <Stack sx={{ gap: 1.5 }}>
              <Typography variant="body2">무엇을 연결할까요? 누르기만 하면 됩니다.</Typography>
              <Button variant="outlined" size="large" sx={{ justifyContent: 'flex-start', textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }} onClick={() => pick('gas')}>
                <b>구글 앱스 스크립트</b><span>구글 시트·메일 등 가벼운 작업 (15초 안에 끝나는 일)</span>
              </Button>
              <Button variant="outlined" size="large" sx={{ justifyContent: 'flex-start', textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }} onClick={() => pick('github')}>
                <b>깃허브 액션</b><span>빌드·배포 같은 긴 작업 실행</span>
              </Button>
            </Stack>
          ) : (
            <Stack sx={{ gap: 1.5 }}>
              <Alert severity="info" icon={false}>아래 내용은 <b>이미 채워져 있습니다</b>. 그대로 [이 내용으로 만들기]만 누르세요. 만든 뒤 해야 할 일은 다음 화면에서 버튼으로 안내합니다.</Alert>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1 }}>
                <Row k="이름">{v.name}</Row>
                {kind === 'gas' ? (
                  <><Row k="실행할 함수">{v.functionName}</Row><Row k="웹 앱 주소">{v.url || '다음 화면에서 붙여넣기'}</Row><Row k="비밀값">자동으로 만들어 안전하게 저장</Row></>
                ) : (
                  <><Row k="저장소">{v.repo}</Row><Row k="워크플로우 파일">{v.workflow}</Row><Row k="브랜치">{v.ref}</Row><Row k="토큰">다음 화면에서 붙여넣기</Row></>
                )}
              </Box>
              <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => setEdit(!edit)}>{edit ? '고치기 접기' : '값 고치기 (선택)'}</Button>
              <Collapse in={edit}>
                <Stack sx={{ gap: 1.5, pt: 0.5 }}>
                  <TextField label="이름" value={v.name} onChange={set('name')} inputProps={{ maxLength: 50 }} />
                  {kind === 'gas'
                    ? <TextField label="실행할 함수 이름" value={v.functionName} onChange={set('functionName')} />
                    : (<><TextField label="저장소 (owner/repo)" value={v.repo} onChange={set('repo')} error={!REPO.test(v.repo.trim())} />
                      <TextField label="워크플로우 파일" value={v.workflow} onChange={set('workflow')} /><TextField label="브랜치" value={v.ref} onChange={set('ref')} /></>)}
                </Stack>
              </Collapse>
              {groups.length > 1 && (
                <TextField select label="그룹" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                  {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                </TextField>
              )}
            </Stack>
          )}
      </DialogContent>
      <DialogActions>
        {result ? (
          <>
            <Button onClick={() => close()}>닫기</Button>
            <Button variant="contained" onClick={() => close(true)}>편집기에서 열기</Button>
          </>
        ) : (
          <>
            <Button onClick={() => close()} disabled={saving}>취소</Button>
            {kind && !initialKind && <Button onClick={() => { setKind(null); setError(''); }} disabled={saving}>이전</Button>}
            {kind && !noGroups && <Button variant="contained" size="large" onClick={create} disabled={saving || !ok || !groupId}>{saving ? '만드는 중…' : '이 내용으로 만들기'}</Button>}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
