// 서버(API)가 살아 있는지 확인하는 가장 단순한 주소: GET /api/health
// 이후 단계의 API도 이 api/ 폴더에 같은 방식으로 추가한다.
import { getDb } from './_lib/db.js';

// DB 연결 상태만 알려 준다. 접속 주소나 오류 내용은 밖으로 내보내지 않는다.
async function dbStatus() {
  try {
    const db = await getDb();
    if (!db) return 'not_configured';
    await db.command({ ping: 1 });
    return 'ok';
  } catch (err) {
    console.error('DB 상태 확인 실패', err);
    return 'error';
  }
}

// 서버 설정이 되어 있는지만 true/false 로 알려 준다 (값은 절대 내보내지 않는다)
function configStatus() {
  const key = process.env.CREDENTIALS_KEY;
  let credentialsKey = false;
  try {
    credentialsKey = !!key && Buffer.from(key, 'base64').length === 32;
  } catch {
    credentialsKey = false;
  }
  return {
    auth: !!process.env.CLERK_SECRET_KEY,
    credentialsKey,
    cronSecret: !!process.env.CRON_SECRET,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  return res.status(200).json({
    ok: true,
    service: 'flowbuilder',
    time: new Date().toISOString(),
    db: await dbStatus(),
    config: configStatus(),
  });
}
