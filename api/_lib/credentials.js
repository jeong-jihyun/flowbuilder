// 인증정보 (9단계, 설계 6장 credentials). 그룹마다 보관하고, 비밀값은 암호화해서만 저장한다.
// 비밀값은 화면으로 돌려주지 않는다(끝 4글자 힌트만). 실행 엔진만 꺼내 쓴다.
import { ApiError } from './errors.js';
import { myRoles, requireGroupAccess, toObjectId } from './groups.js';
import { decrypt, encrypt } from './crypto.js';

export const CREDENTIAL_TYPES = {
  githubToken: { label: 'GitHub 토큰', help: 'Actions 쓰기 권한이 있는 Fine-grained 토큰' },
  gasSecret: { label: 'GAS 비밀값', help: 'Apps Script 쪽 TOKEN과 같은 값' },
  httpHeader: { label: 'HTTP 인증 헤더', help: '예: 이름 Authorization, 값 Bearer xxx' },
};

const LIMITS = { name: 50, secret: 4000, perGroup: 50 };
const credentials = (db) => db.collection('credentials');

function view(c) {
  return {
    id: String(c._id),
    groupId: String(c.groupId),
    name: c.name,
    type: c.type,
    headerName: c.headerName || undefined,
    hint: c.hint,
    createdAt: c.createdAt,
  };
}

// 목록 (멤버면 누구나: 노드에서 고르기 위해). 비밀값은 없음.
export async function listCredentials(db, userId, groupId) {
  let ids;
  if (groupId) {
    await requireGroupAccess(db, toObjectId(groupId), userId, 'view');
    ids = [toObjectId(groupId)];
  } else {
    ids = [...(await myRoles(db, userId)).keys()].map((g) => toObjectId(g));
  }
  const list = await credentials(db).find({ groupId: { $in: ids } }, { projection: { box: 0 } }).sort({ name: 1 }).toArray();
  return list.map(view);
}

// 등록: Owner·Admin
export async function createCredential(db, userId, input = {}) {
  const groupId = toObjectId(input.groupId);
  await requireGroupAccess(db, groupId, userId, 'manageMembers');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) throw new ApiError(400, 'NAME_REQUIRED');
  if (name.length > LIMITS.name) throw new ApiError(400, 'TEXT_TOO_LONG');
  if (!CREDENTIAL_TYPES[input.type]) throw new ApiError(400, 'INVALID_CREDENTIAL_TYPE');
  const secret = typeof input.secret === 'string' ? input.secret.trim() : '';
  if (!secret) throw new ApiError(400, 'SECRET_REQUIRED');
  if (secret.length > LIMITS.secret) throw new ApiError(400, 'TEXT_TOO_LONG');
  let headerName;
  if (input.type === 'httpHeader') {
    headerName = typeof input.headerName === 'string' ? input.headerName.trim() : '';
    if (!/^[A-Za-z0-9-]{1,64}$/.test(headerName)) throw new ApiError(400, 'INVALID_HEADER_NAME');
  }
  if ((await credentials(db).countDocuments({ groupId })) >= LIMITS.perGroup) throw new ApiError(409, 'TOO_MANY_CREDENTIALS');

  const doc = {
    groupId,
    name,
    type: input.type,
    ...(headerName && { headerName }),
    box: encrypt(secret),
    hint: secret.length > 8 ? `…${secret.slice(-4)}` : '…',
    createdBy: userId,
    createdAt: new Date(),
  };
  const { insertedId } = await credentials(db).insertOne(doc);
  return view({ ...doc, _id: insertedId });
}

// 삭제: Owner·Admin. 이 인증정보를 쓰던 노드는 다음 실행에서 실패한다(검증은 화면에서 안내).
export async function deleteCredential(db, userId, id) {
  const _id = toObjectId(id, 'CREDENTIAL_NOT_FOUND');
  const c = await credentials(db).findOne({ _id }, { projection: { groupId: 1 } });
  if (!c) throw new ApiError(404, 'CREDENTIAL_NOT_FOUND');
  try {
    await requireGroupAccess(db, c.groupId, userId, 'manageMembers');
  } catch (err) {
    if (err.code === 'GROUP_NOT_FOUND') throw new ApiError(404, 'CREDENTIAL_NOT_FOUND');
    throw err;
  }
  await credentials(db).deleteOne({ _id });
}

// 실행 엔진 전용: 그 그룹의 인증정보만 꺼낸다 (다른 그룹 것은 이름을 알아도 못 씀)
export async function loadSecret(db, groupId, credentialId, type) {
  if (typeof credentialId !== 'string' || !/^[a-f0-9]{24}$/i.test(credentialId)) return null;
  const c = await credentials(db).findOne({ _id: toObjectId(credentialId), groupId });
  if (!c || (type && c.type !== type)) return null;
  return { secret: decrypt(c.box), headerName: c.headerName, name: c.name };
}
