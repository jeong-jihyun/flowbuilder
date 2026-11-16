// Clerk 공개 키. 값이 없으면 "로그인 미설정" 상태로 앱이 뜬다.
export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
export const AUTH_ENABLED = CLERK_KEY.startsWith('pk_');
