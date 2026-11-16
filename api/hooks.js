// Webhook 받기 (9단계): POST(또는 노드에서 고른 GET) /api/hooks/<토큰>
// 로그인 없이 바깥 시스템이 부른다. 토큰이 맞고, Workflow의 "자동 실행"이 켜져 있어야 실행된다.
// 응답 202: { ok, executionId, status } — 실행은 서버에서 이어서 진행된다.
import { getDb } from './_lib/db.js';
import { pathParts } from './_lib/http.js';
import { ApiError } from './_lib/errors.js';
import { runWebhook } from './_lib/automation.js';

const BODY_LIMIT = 10_000;

export default async function handler(req, res) {
  let db;
  try {
    db = await getDb();
  } catch (err) {
    console.error('DB 연결 실패', err);
    return res.status(503).json({ ok: false, error: 'DB_UNAVAILABLE' });
  }
  if (!db) return res.status(503).json({ ok: false, error: 'DB_NOT_CONFIGURED' });

  const [token, ...rest] = pathParts(req, '/api/hooks');
  if (!token || rest.length) return res.status(404).json({ ok: false, error: 'WEBHOOK_NOT_FOUND' });

  const query = { ...(req.query || {}) };
  delete query.path; // vercel.json 다시쓰기가 붙인 값
  const body = req.body === undefined || req.body === '' ? null : req.body;
  if (JSON.stringify({ body, query }).length > BODY_LIMIT) return res.status(413).json({ ok: false, error: 'PAYLOAD_TOO_LARGE' });

  try {
    const ex = await runWebhook(db, token, { method: req.method, body, query });
    return res.status(202).json({ ok: true, executionId: String(ex._id), status: ex.status });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.allow) res.setHeader('Allow', err.allow);
      return res.status(err.status).json({ ok: false, error: err.code, ...(err.detail && { detail: err.detail }) });
    }
    console.error('webhook 오류', err);
    return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
  }
}
