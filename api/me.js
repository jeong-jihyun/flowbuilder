// 로그인한 사용자 확인: GET /api/me
// 서버가 토큰을 직접 검증하는 첫 번째 API다. 이후 모든 API가 같은 방식을 쓴다.
import { requireUser } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const userId = await requireUser(req, res);
  if (!userId) return;

  return res.status(200).json({ ok: true, userId });
}
