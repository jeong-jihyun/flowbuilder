// Clerk에 가입된 사용자 정보를 조회한다. (사용자 정보의 원본은 Clerk에 있다)
import { createClerkClient } from '@clerk/backend';

function client() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}

function toProfile(user) {
  return {
    userId: user.id,
    email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '',
    name: user.fullName || '',
  };
}

// 이메일로 가입자를 찾는다. 없으면 null.
export async function findUserByEmail(email) {
  const { data } = await client().users.getUserList({ emailAddress: [email], limit: 1 });
  return data[0] ? toProfile(data[0]) : null;
}

export async function getUserProfile(userId) {
  return toProfile(await client().users.getUser(userId));
}
