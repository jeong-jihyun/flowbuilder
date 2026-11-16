// 서버에서 "누가 보낸 요청인지" 확인하는 공통 함수.
// 파일 이름이 _ 로 시작하는 폴더(_lib)는 주소(API)로 노출되지 않는다.
import { verifyToken } from '@clerk/backend';

// 요청의 로그인 토큰을 확인한다.
// 성공: { ok: true, userId }  /  실패: { ok: false, status, error }
export async function authenticate(req) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    // 서버에 Clerk 키가 아직 등록되지 않은 상태
    return { ok: false, status: 503, error: 'AUTH_NOT_CONFIGURED' };
  }

  const header = req.headers?.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return { ok: false, status: 401, error: 'UNAUTHENTICATED' };
  }

  try {
    const payload = await verifyToken(token, { secretKey });
    return { ok: true, userId: payload.sub };
  } catch {
    // 위조·만료된 토큰. 자세한 이유는 밖으로 알리지 않는다.
    return { ok: false, status: 401, error: 'INVALID_TOKEN' };
  }
}

// API 파일에서 한 줄로 쓰기 위한 도우미.
// 로그인이 확인되지 않으면 여기서 응답을 끝내고 null을 돌려준다.
export async function requireUser(req, res) {
  const result = await authenticate(req);
  if (!result.ok) {
    res.status(result.status).json({ ok: false, error: result.error });
    return null;
  }
  return result.userId;
}
