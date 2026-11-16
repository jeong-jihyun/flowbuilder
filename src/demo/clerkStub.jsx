// 설명서 화면 캡처 전용 가짜 로그인 (vite --mode demo 일 때만 @clerk/react 대신 쓰인다).
// 실제 배포(production)에는 들어가지 않는다.
import { Avatar } from '@mui/material';

export const ClerkProvider = ({ children }) => children;
export const ClerkLoaded = ({ children }) => children;
export const ClerkLoading = () => null;
export const Show = ({ when, children }) => (when === 'signed-in' ? children : null);
export const SignIn = () => null;
// 실제 Clerk 처럼 getToken 은 항상 같은 함수여야 한다 (아니면 화면이 계속 다시 불러온다)
const getToken = async () => 'demo';
const auth = { isSignedIn: true, userId: 'u_demo', getToken };
export const useAuth = () => auth;
const me = { user: { fullName: '홍길동', username: 'gildong', primaryEmailAddress: { emailAddress: 'gildong@example.com' } } };
export const useUser = () => me;
export const UserButton = () => <Avatar sx={{ width: 32, height: 32, bgcolor: '#2864FF' }}>홍</Avatar>;
