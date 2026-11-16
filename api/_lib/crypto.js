// 암호화 도우미 (9단계). 인증정보(토큰·키)와 Webhook 주소 토큰을 DB에 평문으로 두지 않기 위해 쓴다.
// 키: 서버 환경변수 CREDENTIALS_KEY (32바이트를 base64로). 키가 없으면 인증정보 기능을 쓸 수 없다.
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ApiError } from './errors.js';

function key() {
  const raw = process.env.CREDENTIALS_KEY;
  if (!raw) throw new ApiError(503, 'CREDENTIALS_NOT_CONFIGURED');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new ApiError(503, 'CREDENTIALS_NOT_CONFIGURED', 'CREDENTIALS_KEY는 32바이트여야 합니다');
  return buf;
}

// AES-256-GCM. 결과는 DB에 그대로 넣을 수 있는 글자 묶음
export function encrypt(text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}

export function decrypt(box) {
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(box.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(box.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(box.data, 'base64')), decipher.final()]).toString('utf8');
}

// 주소에 넣어도 되는 무작위 글자 (Webhook 토큰)
export function randomToken(bytes = 24) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}

// 비밀값 비교 (걸린 시간으로 값을 알아내지 못하게)
export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}
