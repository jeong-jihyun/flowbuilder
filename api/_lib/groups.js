// 그룹·멤버 처리. HTTP와 상관없는 순수 처리만 둔다(테스트하기 쉽게).
// 권한이 없으면 ApiError를 던지고, api/groups.js 가 이를 응답으로 바꾼다.
import { ObjectId } from 'mongodb';
import { ROLES, can, canAssign, isRole, permissionsOf } from './roles.js';
import { ApiError } from './errors.js';

export { ApiError };

const NAME_MAX = 50;
const DESCRIPTION_MAX = 200;

const groups = (db) => db.collection('groups');
const members = (db) => db.collection('group_members');

// 형식이 틀린 ID는 "없는 것"과 똑같이 취급한다
export function toObjectId(id, notFoundCode = 'GROUP_NOT_FOUND') {
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) throw new ApiError(404, notFoundCode);
  return new ObjectId(id);
}

function cleanText(value, max, { required }) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) throw new ApiError(400, 'NAME_REQUIRED');
  if (text.length > max) throw new ApiError(400, 'TEXT_TOO_LONG');
  return text;
}

function groupView(group, role, memberCount) {
  return {
    id: String(group._id),
    name: group.name,
    description: group.description,
    createdAt: group.createdAt,
    myRole: role,
    permissions: permissionsOf(role),
    ...(memberCount !== undefined && { memberCount }),
  };
}

function memberView(m) {
  return { userId: m.userId, email: m.email, name: m.name, role: m.role, addedAt: m.addedAt };
}

// 그룹에 속해 있는지 확인하고 내 역할을 돌려준다.
// 멤버가 아니면 그룹이 있다는 사실도 알리지 않도록 404로 답한다.
async function requireMembership(db, groupId, userId, action) {
  const membership = await members(db).findOne({ groupId, userId });
  if (!membership) throw new ApiError(404, 'GROUP_NOT_FOUND');
  if (!can(membership.role, action)) throw new ApiError(403, 'FORBIDDEN');
  return membership;
}

// 다른 기능(Workflow 등)에서 쓰는 그룹 권한 확인. 성공하면 내 멤버 기록을 돌려준다.
export async function requireGroupAccess(db, groupId, userId, action) {
  return requireMembership(db, groupId, userId, action);
}

// 내가 속한 그룹들의 { groupId(문자열) → 역할 } 표
export async function myRoles(db, userId) {
  const mine = await members(db).find({ userId }).toArray();
  return new Map(mine.map((m) => [String(m.groupId), m.role]));
}

// Owner가 한 명도 안 남게 되는 변경을 막는다.
async function ensureAnotherOwner(db, groupId) {
  const owners = await members(db).countDocuments({ groupId, role: 'owner' });
  if (owners <= 1) throw new ApiError(409, 'LAST_OWNER');
}

export async function listMyGroups(db, userId) {
  const mine = await members(db).find({ userId }).toArray();
  if (mine.length === 0) return [];

  const ids = mine.map((m) => m.groupId);
  const [found, counts] = await Promise.all([
    groups(db).find({ _id: { $in: ids } }).toArray(),
    members(db)
      .aggregate([{ $match: { groupId: { $in: ids } } }, { $group: { _id: '$groupId', n: { $sum: 1 } } }])
      .toArray(),
  ]);
  const roleOf = new Map(mine.map((m) => [String(m.groupId), m.role]));
  const countOf = new Map(counts.map((c) => [String(c._id), c.n]));

  return found
    .map((g) => groupView(g, roleOf.get(String(g._id)), countOf.get(String(g._id)) || 0))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// 그룹을 만들고 만든 사람을 Owner로 넣는다.
export async function createGroup(db, me, input = {}) {
  const now = new Date();
  const group = {
    name: cleanText(input.name, NAME_MAX, { required: true }),
    description: cleanText(input.description, DESCRIPTION_MAX, { required: false }),
    createdBy: me.userId,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await groups(db).insertOne(group);
  await members(db).insertOne({
    groupId: insertedId,
    userId: me.userId,
    email: me.email,
    name: me.name,
    role: 'owner',
    addedBy: me.userId,
    addedAt: now,
  });
  return groupView({ ...group, _id: insertedId }, 'owner', 1);
}

export async function getGroup(db, userId, id) {
  const groupId = toObjectId(id);
  const membership = await requireMembership(db, groupId, userId, 'view');
  const group = await groups(db).findOne({ _id: groupId });
  if (!group) throw new ApiError(404, 'GROUP_NOT_FOUND');
  return groupView(group, membership.role);
}

// 이름·설명 수정: Owner, Admin
export async function updateGroup(db, userId, id, input = {}) {
  const groupId = toObjectId(id);
  const membership = await requireMembership(db, groupId, userId, 'manageMembers');

  const changes = { updatedAt: new Date() };
  if (input.name !== undefined) changes.name = cleanText(input.name, NAME_MAX, { required: true });
  if (input.description !== undefined) {
    changes.description = cleanText(input.description, DESCRIPTION_MAX, { required: false });
  }
  const group = await groups(db).findOneAndUpdate({ _id: groupId }, { $set: changes }, { returnDocument: 'after' });
  if (!group) throw new ApiError(404, 'GROUP_NOT_FOUND');
  return groupView(group, membership.role);
}

// 그룹 삭제: Owner만. 멤버 기록, 그룹의 Workflow·실행 기록·인증정보도 함께 지운다.
export async function deleteGroup(db, userId, id) {
  const groupId = toObjectId(id);
  const membership = await requireMembership(db, groupId, userId, 'view');
  if (membership.role !== 'owner') throw new ApiError(403, 'FORBIDDEN');
  await db.collection('executions').deleteMany({ groupId });
  await db.collection('credentials').deleteMany({ groupId });
  await db.collection('webhook_tokens').deleteMany({ groupId });
  await db.collection('workflows').deleteMany({ groupId });
  await members(db).deleteMany({ groupId });
  await groups(db).deleteOne({ _id: groupId });
}

export async function listMembers(db, userId, id) {
  const groupId = toObjectId(id);
  await requireMembership(db, groupId, userId, 'view');
  const list = await members(db).find({ groupId }).toArray();
  // Owner → Admin → Editor → Viewer 순, 같은 역할은 추가된 순서
  return list
    .sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.addedAt - b.addedAt)
    .map(memberView);
}

// 멤버 추가. target 은 Clerk에서 찾은 가입자 { userId, email, name }.
export async function addMember(db, userId, id, target, role) {
  const groupId = toObjectId(id);
  if (!isRole(role)) throw new ApiError(400, 'INVALID_ROLE');
  const membership = await requireMembership(db, groupId, userId, 'manageMembers');
  if (!canAssign(membership.role, null, role)) throw new ApiError(403, 'FORBIDDEN');

  const doc = {
    groupId,
    userId: target.userId,
    email: target.email,
    name: target.name,
    role,
    addedBy: userId,
    addedAt: new Date(),
  };
  try {
    await members(db).insertOne(doc);
  } catch (err) {
    if (err?.code === 11000) throw new ApiError(409, 'ALREADY_MEMBER');
    throw err;
  }
  return memberView(doc);
}

export async function changeMemberRole(db, userId, id, targetUserId, role) {
  const groupId = toObjectId(id);
  if (!isRole(role)) throw new ApiError(400, 'INVALID_ROLE');
  const membership = await requireMembership(db, groupId, userId, 'manageMembers');
  const target = await members(db).findOne({ groupId, userId: targetUserId });
  if (!target) throw new ApiError(404, 'MEMBER_NOT_FOUND');
  if (!canAssign(membership.role, target.role, role)) throw new ApiError(403, 'FORBIDDEN');
  if (target.role === 'owner' && role !== 'owner') await ensureAnotherOwner(db, groupId);

  await members(db).updateOne({ _id: target._id }, { $set: { role } });
  return memberView({ ...target, role });
}

// 멤버 내보내기. 자기 자신은 권한과 상관없이 나갈 수 있다(마지막 Owner는 제외).
export async function removeMember(db, userId, id, targetUserId) {
  const groupId = toObjectId(id);
  const self = targetUserId === userId;
  const membership = await requireMembership(db, groupId, userId, self ? 'view' : 'manageMembers');
  const target = self ? membership : await members(db).findOne({ groupId, userId: targetUserId });
  if (!target) throw new ApiError(404, 'MEMBER_NOT_FOUND');
  if (!self && !canAssign(membership.role, target.role, null)) throw new ApiError(403, 'FORBIDDEN');
  if (target.role === 'owner') await ensureAnotherOwner(db, groupId);

  await members(db).deleteOne({ _id: target._id });
}
