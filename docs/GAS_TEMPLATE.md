# GAS 견본 (Google Apps Script 웹 앱)

FlowBuilder의 **GAS 노드**가 부르는 Apps Script 쪽 코드 견본입니다. 이 코드는 `doPost`로 `{ function, payload, token }`을 받아 함수를 실행하고 `{ ok, result }`로 답합니다.

## 만드는 순서

1. https://script.google.com 에서 새 프로젝트를 만들고 아래 코드를 붙여 넣습니다.
2. **프로젝트 설정 → 스크립트 속성**에 `TOKEN` 을 만들고 긴 무작위 값을 넣습니다. (코드에 직접 쓰지 마세요)
3. **배포 → 새 배포 → 웹 앱**: 다음 사용자로 실행 = 나, 액세스 권한 = **모든 사용자**. 나오는 `https://script.google.com/macros/s/.../exec` 주소를 복사합니다.
4. FlowBuilder의 **Credentials**에서 종류 "GAS 비밀값"으로 위 `TOKEN` 과 같은 값을 등록합니다.
5. Workflow의 GAS 노드에 웹 앱 주소·함수 이름·GAS 비밀값을 넣습니다.

코드를 고친 뒤에는 **배포 관리 → 수정 → 새 버전**으로 다시 배포해야 반영됩니다.

## 코드

```javascript
// 노드의 "실행할 함수 이름"에 쓸 수 있는 함수만 여기에 등록합니다 (목록에 없는 함수는 실행하지 않음)
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
}
```

## 예제 Workflow

`docs/examples/gas-hello.workflow.json` — Manual → GAS(`main`) → 결과 문장 변환. 웹 앱 주소(`url`)만 본인 것으로 바꿔 쓰세요. 실행 입력은 `{ "name": "정지현" }`.

## 알아 둘 것

- FlowBuilder는 응답을 **15초**까지 기다립니다. 더 오래 걸리는 일은 GitHub Actions 노드를 쓰세요.
- 응답은 JSON이어야 합니다. 로그인 화면(HTML)이 오면 "웹 앱 배포·권한 설정을 확인하세요"라고 실패합니다.
- 비밀값(`TOKEN`)이 없거나 틀리면 실행하지 않고 실패로 답합니다.
- Apps Script는 응답을 다른 주소(`script.googleusercontent.com`)로 넘기는데, FlowBuilder는 그 주소만 따라갑니다.
