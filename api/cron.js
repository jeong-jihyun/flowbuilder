// 서버 주기 작업 (9단계): POST /api/cron
// GitHub Actions(.github/workflows/flowbuilder-tick.yml)가 5분마다 부른다.
// 1) 시각이 된 예약 실행(Schedule) 시작  2) 아무도 보고 있지 않은 실행(Delay·GitHub 대기 등) 이어서 진행
// 보호: Authorization: Bearer <CRON_SECRET> (서버 환경변수와 GitHub 저장소 Secret에 같은 값)
import { getDb } from './_lib/db.js';
import { safeEqual } from './_lib/crypto.js';
import { runSchedules } from './_lib/automation.js';
import { advanceDueExecutions } from './_lib/executions.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ ok: false, error: 'CRON_NOT_CONFIGURED' });
  const header = req.headers?.authorization || '';
  if (!header.startsWith('Bearer ') || !safeEqual(header.slice(7).trim(), secret)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  }

  let db;
  try {
    db = await getDb();
  } catch (err) {
    console.error('DB 연결 실패', err);
    return res.status(503).json({ ok: false, error: 'DB_UNAVAILABLE' });
  }
  if (!db) return res.status(503).json({ ok: false, error: 'DB_NOT_CONFIGURED' });

  try {
    const schedules = await runSchedules(db);
    const executions = await advanceDueExecutions(db, { budgetMs: 15_000 });
    return res.status(200).json({ ok: true, schedules, executions, time: new Date().toISOString() });
  } catch (err) {
    console.error('cron 오류', err);
    return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
  }
}
