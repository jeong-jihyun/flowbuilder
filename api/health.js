// 서버(API)가 살아 있는지 확인하는 가장 단순한 주소: GET /api/health
// 이후 단계의 API도 이 api/ 폴더에 같은 방식으로 추가한다.
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  return res.status(200).json({
    ok: true,
    service: 'flowbuilder',
    time: new Date().toISOString(),
  });
}
