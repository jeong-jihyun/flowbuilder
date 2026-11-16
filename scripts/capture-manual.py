"""사용 설명서용 화면 캡처 (public/manual/*.png).

실제 서버·로그인 없이 화면만 찍는다:
  1) VITE_CLERK_PUBLISHABLE_KEY=pk_test_demo npx vite --mode demo --port 5198   (가짜 로그인)
  2) python3 scripts/capture-manual.py
서버 응답은 아래 FIX 의 가짜 데이터로 바꿔 끼운다. 화면 디자인이 바뀌면 다시 돌려서 사진을 새로 만든다.
"""
import json, re, sys
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5198'
OUT = 'public/manual/'
OWNER = dict(view=True, edit=True, run=True, manageMembers=True)
NOW = '2026-11-17T05:40:00.000Z'

G1, G2 = 'g1', 'g2'
GROUPS = [
    dict(id=G1, name='마케팅팀', description='광고·콘텐츠 자동화', createdAt=NOW, myRole='owner', permissions=OWNER, memberCount=3),
    dict(id=G2, name='개인 프로젝트', description='혼자 쓰는 자동화', createdAt=NOW, myRole='owner', permissions=OWNER, memberCount=1),
]
MEMBERS = [
    dict(userId='u_demo', email='gildong@example.com', name='홍길동', role='owner', addedAt=NOW),
    dict(userId='u2', email='minsu@example.com', name='김민수', role='editor', addedAt=NOW),
    dict(userId='u3', email='yuna@example.com', name='이유나', role='viewer', addedAt=NOW),
]

def node(id, type, kind, label, x, y, params=None):
    d = dict(kind=kind, label=label)
    if params is not None: d['params'] = params
    return dict(id=id, type=type, position=dict(x=x, y=y), data=d)

GRAPH_NODES = [
    node('trigger_1', 'trigger', 'webhook', '주문 접수 웹훅', 150, 0, {}),
    node('action_1', 'action', 'gas', '주문 정리(앱스 스크립트)', 150, 130, dict(url='https://script.google.com/macros/s/AKfycb.../exec', functionName='main')),
    node('condition_1', 'condition', 'ifElse', '금액이 10만원 이상?', 150, 260, dict(left='{{input.amount}}', operator='greaterThan', right='100000')),
    node('action_2', 'action', 'http', '큰 주문 알림 보내기', 0, 420, dict(method='POST', url='https://hooks.example.com/notify')),
    node('action_3', 'action', 'transform', '일반 주문 기록', 300, 420, {}),
]
GRAPH_EDGES = [
    dict(id='e1', source='trigger_1', target='action_1', sourceHandle=None, targetHandle=None),
    dict(id='e2', source='action_1', target='condition_1', sourceHandle=None, targetHandle=None),
    dict(id='e3', source='condition_1', target='action_2', sourceHandle='yes', targetHandle=None, label='예'),
    dict(id='e4', source='condition_1', target='action_3', sourceHandle='no', targetHandle=None, label='아니오'),
]

def wf(id, name, gid, gname, status, n, edit=True):
    return dict(id=id, groupId=gid, groupName=gname, name=name, description='', status=status, version=4, nodeCount=n,
                createdAt=NOW, updatedAt='2026-11-16T23:10:00.000Z', myRole='owner' if edit else 'viewer', permissions=OWNER if edit else dict(view=True, edit=False, run=False, manageMembers=False))

WORKFLOWS = [
    wf('w1', '주문 알림 자동화', G1, '마케팅팀', 'active', 5),
    wf('w2', '매일 아침 매출 요약', G1, '마케팅팀', 'active', 4),
    wf('w3', '블로그 글 발행 알림', G1, '마케팅팀', 'draft', 3),
    wf('w4', '깃허브 배포 실행', G2, '개인 프로젝트', 'draft', 3),
]

def ex(id, wid, name, status, source, mins, steps=5, err=None):
    return dict(id=id, workflowId=wid, workflowName=name, workflowVersion=4, status=status, triggerNodeId='trigger_1', source=source,
                startedBy='u_demo', createdAt=f'2026-11-17T05:{40-mins:02d}:00.000Z', finishedAt=f'2026-11-17T05:{40-mins:02d}:04.000Z',
                resumeAt=None, error=err, stepCount=steps)

EXECS = [
    ex('x1', 'w1', '주문 알림 자동화', 'success', 'webhook', 3),
    ex('x2', 'w2', '매일 아침 매출 요약', 'success', 'schedule', 9, 4),
    ex('x3', 'w1', '주문 알림 자동화', 'failed', 'webhook', 14, 5, '큰 주문 알림 보내기: 대상 서버가 오류로 응답했습니다 (500)'),
    ex('x4', 'w3', '블로그 글 발행 알림', 'success', 'manual', 22, 3),
    ex('x5', 'w1', '주문 알림 자동화', 'success', 'webhook', 31),
]
def step(nid, label, status, out=None, err=None):
    s = dict(nodeId=nid, label=label, status=status, startedAt=NOW, finishedAt=NOW)
    if out is not None: s['output'] = out
    if err: s['error'] = err
    return s
EXEC_FULL = dict(EXECS[2], input=dict(amount=250000, customer='홍길동'), steps=[
    step('trigger_1', '주문 접수 웹훅', 'success', dict(amount=250000, customer='홍길동')),
    step('action_1', '주문 정리(앱스 스크립트)', 'success', dict(ok=True, total=250000)),
    step('condition_1', '금액이 10만원 이상?', 'success', dict(result=True)),
    step('action_2', '큰 주문 알림 보내기', 'failed', err='대상 서버가 오류로 응답했습니다 (500)'),
    step('action_3', '일반 주문 기록', 'skipped'),
])
CREDS = [
    dict(id='c1', groupId=G1, name='배포용 깃허브 토큰', type='githubToken', hint='…a9F2', createdAt=NOW),
    dict(id='c2', groupId=G1, name='주문 정리 스크립트 비밀값', type='gasSecret', hint='…7Kq1', createdAt=NOW),
    dict(id='c3', groupId=G2, name='알림 서버 인증 헤더', type='httpHeader', headerName='X-Api-Key', hint='…m3Zp', createdAt=NOW),
]

def respond(route, request):
    path = re.sub(r'^.*?/api', '', request.url.split('?')[0])
    q = request.url.split('?', 1)[1] if '?' in request.url else ''
    m = request.method
    def ok(**kw): route.fulfill(status=200, content_type='application/json', body=json.dumps(dict(ok=True, **kw)))
    if path == '/health': return route.fulfill(status=200, content_type='application/json', body=json.dumps(dict(ok=True, service='flowbuilder', time=NOW, db='ok', config=dict(auth=True, credentialsKey=True, cronSecret=True))))
    if path == '/me': return ok(user=dict(id='u_demo'))
    if path == '/groups': return ok(groups=GROUPS)
    if re.fullmatch(r'/groups/g\d', path): return ok(group=next(g for g in GROUPS if g['id'] == path[-2:]))
    if re.fullmatch(r'/groups/g\d/members', path): return ok(members=MEMBERS)
    if path == '/workflows': return ok(workflows=WORKFLOWS)
    if path == '/workflows/w1': return ok(workflow=dict(WORKFLOWS[0], nodes=GRAPH_NODES, edges=GRAPH_EDGES))
    if re.fullmatch(r'/workflows/w1/executions', path): return ok(executions=EXECS[:3])
    if path == '/executions':
        rows = [e for e in EXECS if 'status=failed' not in q or e['status'] == 'failed']
        return ok(executions=rows, counts=dict(total=48, failed=6, old=0), hasMore=False)
    if path == '/executions/x3': return ok(execution=EXEC_FULL)
    if path == '/credentials': return ok(credentials=CREDS)
    if re.fullmatch(r'/workflows/w1/webhook', path): return ok(webhook=dict(url='https://flowbuilder-roan.vercel.app/api/hooks/3fa9c1e07b…', method='POST'), url='https://flowbuilder-roan.vercel.app/api/hooks/3fa9c1e07b…')
    return ok()

def badge(page, locator, n, pos='tl'):
    """사진 위에 번호 표시: 대상에 빨간 테두리를 두르고 모서리에 번호를 단다(설명서의 번호와 같다)"""
    box = locator.first.bounding_box()
    if not box: raise RuntimeError(f'찾지 못함: {n}')
    page.evaluate("""([b,n,pos]) => {
      const o=document.createElement('div'); o.className='mbadge';
      o.style.cssText=`position:fixed;left:${b.x-4}px;top:${b.y-4}px;width:${b.width+8}px;height:${b.height+8}px;border:3px solid #E53935;border-radius:8px;z-index:99998;pointer-events:none`;
      const d=document.createElement('div'); d.className='mbadge';
      const x = pos.includes('r') ? b.x+b.width-10 : b.x-18; const y = pos.includes('b') ? b.y+b.height-10 : b.y-18;
      d.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:26px;height:26px;border-radius:50%;background:#E53935;color:#fff;font:700 15px/26px sans-serif;text-align:center;z-index:99999;box-shadow:0 1px 4px rgba(0,0,0,.4);border:2px solid #fff;pointer-events:none`;
      d.textContent=n; document.body.appendChild(o); document.body.appendChild(d);}""", [box, n, pos])

def outline(page, locator):
    box = locator.first.bounding_box()
    page.evaluate("""([b]) => { const d=document.createElement('div'); d.className='mbadge';
      d.style.cssText=`position:fixed;left:${b.x-3}px;top:${b.y-3}px;width:${b.width+6}px;height:${b.height+6}px;border:3px solid #E53935;border-radius:8px;z-index:99998;pointer-events:none`;
      document.body.appendChild(d);}""", [box])

def shot(page, name, clip=None):
    page.screenshot(path=OUT + name + '.png', clip=clip)
    page.evaluate("document.querySelectorAll('.mbadge').forEach(e=>e.remove())")
    print('saved', name)

def go(page, path, wait=900):
    page.goto(BASE + path); page.wait_for_timeout(wait)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport=dict(width=1280, height=760), device_scale_factor=1)
        page = ctx.new_page()
        page.route('**/api/**', respond)
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        steps = sys.argv[1:] or ['all']
        def want(n): return 'all' in steps or n in steps

        if want('dashboard'):
            go(page, '/', 1500)
            badge(page, page.get_by_text('최근 워크플로우').first, 2, 'tl')
            badge(page, page.locator('nav').first, 3, 'tr')
            shot(page, 'dashboard')
        if want('groups'):
            go(page, '/groups')
            badge(page, page.get_by_role('button', name=re.compile('새 그룹')), 1, 'tl')
            badge(page, page.get_by_text('마케팅팀').first, 2, 'tl')
            shot(page, 'groups')
            go(page, '/groups/g1')
            badge(page, page.get_by_role('button', name=re.compile('멤버 추가|추가')).first, 1, 'tl')
            badge(page, page.get_by_text('김민수').first, 2, 'tl')
            shot(page, 'group-detail')
        if want('workflows'):
            go(page, '/workflows')
            badge(page, page.get_by_role('button', name=re.compile('새 워크플로우')).first, 1, 'tl')
            badge(page, page.get_by_label('그룹').first, 2, 'tl')
            badge(page, page.get_by_text('주문 알림 자동화').first, 3, 'tl')
            shot(page, 'workflows')
        if want('editor'):
            page.set_viewport_size(dict(width=1280, height=900))
            go(page, '/workflows/w1', 1800)
            page.get_by_text('전체 보기').first.click(); page.wait_for_timeout(700)
            page.get_by_text('금액이 10만원 이상?').first.click(); page.wait_for_timeout(600)
            badge(page, page.locator('input[placeholder="노드 검색"]').locator('xpath=..'), 1, 'tl')
            badge(page, page.get_by_text('주문 접수 웹훅').first, 2, 'tr')
            badge(page, page.get_by_text('저장').first, 3, 'tl')
            badge(page, page.get_by_text('실행', exact=True).first, 4, 'tl')
            badge(page, page.get_by_label('이름').first, 5, 'tl')
            shot(page, 'editor')
            page.set_viewport_size(dict(width=1280, height=760))
        if want('executions'):
            go(page, '/executions')
            shot(page, 'executions')
            page.get_by_text('주문 알림 자동화').nth(1).click(); page.wait_for_timeout(900)
            shot(page, 'execution-detail')
        if want('manual'):
            go(page, '/groups')
            page.get_by_role('button', name='사용 설명서').click(); page.wait_for_timeout(800)
            shot(page, '../../../tmp/mp/_manual-popup-pc')
            page.set_viewport_size(dict(width=390, height=800))
            go(page, '/executions')
            page.get_by_role('button', name='사용 설명서').click(); page.wait_for_timeout(800)
            shot(page, '../../../tmp/mp/_manual-popup-phone')
            page.set_viewport_size(dict(width=1280, height=760))
        if want('credentials'):
            go(page, '/credentials')
            shot(page, 'credentials')
        if want('settings'):
            go(page, '/settings')
            shot(page, 'settings')
        print('errors', errs)
        b.close()

main()
