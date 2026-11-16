// 설명서와 연동 등록 마법사가 같이 쓰는 복사용 견본. docs/GAS_TEMPLATE.md, docs/examples/github-actions-dispatch.yml 과 같은 내용이다.
export const GAS_CODE = `// 노드의 "실행할 함수 이름"에 쓸 수 있는 함수만 여기에 등록합니다 (목록에 없는 함수는 실행하지 않음)
const FUNCTIONS = {
  main: function (payload) {
    return { hello: payload.name || 'world', time: new Date().toISOString() };
  },
};

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token || req.token !== token) return json({ ok: false, error: '인증 실패' });

    const fn = FUNCTIONS[req.function || 'main'];
    if (!fn) return json({ ok: false, error: '없는 함수: ' + req.function });
    return json({ ok: true, result: fn(req.payload || {}) });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

export const GITHUB_YML = 'name: example-dispatch\non:\n  workflow_dispatch:\n    inputs:\n      name:\n        description: 인사할 이름\n        required: false\n        default: world\njobs:\n  hello:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "안녕하세요, ${{ inputs.name }}"';

export const GITHUB_YML_PATH = '.github/workflows/example-dispatch.yml';
