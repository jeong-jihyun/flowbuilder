// {{input.이름}} 바꾸기. 앞 노드의 출력(input)에서 값을 꺼내 넣는다.
// - 글자 전체가 {{...}} 하나면 값의 원래 형태(숫자·객체 등)를 그대로 돌려준다.
// - 다른 글자와 섞여 있으면 글자로 바꿔 끼운다.
const ONE = /^\s*\{\{\s*([\w.[\]]+)\s*\}\}\s*$/;
const MANY = /\{\{\s*([\w.[\]]+)\s*\}\}/g;

// "input.items[0].name" → ctx.input.items[0].name. 없으면 undefined.
function lookup(path, ctx) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let value = ctx;
  for (const p of parts) {
    if (value === null || value === undefined) return undefined;
    // 객체 자신의 값만 읽는다 (constructor 등 내부 속성 접근 막기)
    if (!Object.prototype.hasOwnProperty.call(Object(value), p)) return undefined;
    value = value[p];
  }
  return value;
}

function toText(value) {
  if (value === undefined || value === null) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function resolveString(text, ctx) {
  if (typeof text !== 'string') return text;
  const one = text.match(ONE);
  if (one) return lookup(one[1], ctx);
  return text.replace(MANY, (_, path) => toText(lookup(path, ctx)));
}

// 객체·배열 안의 모든 글자에 적용 (Data Transform 결과, HTTP 헤더 등)
export function resolveDeep(value, ctx) {
  if (typeof value === 'string') return resolveString(value, ctx);
  if (Array.isArray(value)) return value.map((v) => resolveDeep(v, ctx));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveDeep(v, ctx)]));
  }
  return value;
}
