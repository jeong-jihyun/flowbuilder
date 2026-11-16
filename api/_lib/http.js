// API 파일들이 같이 쓰는 처리: 로그인 확인 → DB 연결 → 경로 나누기 → 오류를 응답으로 바꾸기.
import { requireUser } from './auth.js';
import { getDb } from './db.js';
import { ApiError } from './errors.js';

// prefix 뒤의 경로를 조각으로 나눈다. 예: "abc/members/user_1" → ['abc', 'members', 'user_1']
// vercel.json 다시쓰기로 들어오면 ?path=..., 아니면 주소에서 직접 읽는다.
export function pathParts(req, prefix) {
  let path = req.query?.path;
  if (Array.isArray(path)) path = path.join('/');
  if (typeof path !== 'string') {
    const pathname = (req.url || '').split('?')[0];
    path = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
  }
  return path.split('/').filter(Boolean).map(decodeURIComponent);
}

export function methodNotAllowed(allow) {
  const err = new ApiError(405, 'METHOD_NOT_ALLOWED');
  err.allow = allow;
  return err;
}

// route({ db, userId, method, parts, query, body }) → { status, body }
export function apiHandler(prefix, route, extra = {}) {
  return async function handler(req, res) {
    const userId = await requireUser(req, res);
    if (!userId) return;

    let db;
    try {
      db = await getDb();
    } catch (err) {
      console.error('DB 연결 실패', err);
      return res.status(503).json({ ok: false, error: 'DB_UNAVAILABLE' });
    }
    if (!db) return res.status(503).json({ ok: false, error: 'DB_NOT_CONFIGURED' });

    try {
      const result = await route({
        db,
        userId,
        method: req.method,
        parts: pathParts(req, prefix),
        query: req.query || {},
        body: req.body && typeof req.body === 'object' ? req.body : {},
        ...extra,
      });
      return res.status(result.status).json({ ok: true, ...result.body });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.allow) res.setHeader('Allow', err.allow);
        return res.status(err.status).json({ ok: false, error: err.code, ...(err.detail && { detail: err.detail }) });
      }
      console.error(`${prefix} API 오류`, err);
      return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
    }
  };
}
