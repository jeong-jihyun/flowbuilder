// Workflow 저장·조회 (6단계). HTTP와 상관없는 처리만 둔다.
// 권한은 Workflow가 속한 그룹의 역할로 정한다 (설계 8.2: 조회는 모두, 편집은 Editor 이상).
import { ApiError } from './errors.js';
import { myRoles, requireGroupAccess, toObjectId } from './groups.js';
import { can, permissionsOf } from './roles.js';

// 무료 DB(512MB)를 지키기 위한 한도
export const LIMITS = {
  name: 80,
  description: 300,
  nodes: 200,
  edges: 400,
  bytes: 200_000, // nodes + edges 를 JSON으로 바꾼 크기
  perGroup: 100,
};

const CATEGORIES = ['trigger', 'condition', 'action'];
const ID_PATTERN = /^[\w.:-]{1,128}$/;

const workflows = (db) => db.collection('workflows');

function invalid(detail) {
  return new ApiError(400, 'INVALID_WORKFLOW', detail);
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function cleanText(value, max, { required, code }) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) throw new ApiError(400, code);
  if (text.length > max) throw new ApiError(400, 'TEXT_TOO_LONG');
  return text;
}

// 화면이 보낸 nodes·edges 를 검사하고, 저장할 필드만 남긴다(설계 6.1 모양).
// 흐름이 "실행 가능한지"는 7단계 Validator가 본다. 여기서는 모양과 크기만 본다.
export function cleanGraph(nodes = [], edges = []) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) throw invalid('nodes, edges 는 배열이어야 합니다');
  if (nodes.length > LIMITS.nodes) throw new ApiError(400, 'WORKFLOW_TOO_LARGE', `노드는 ${LIMITS.nodes}개까지`);
  if (edges.length > LIMITS.edges) throw new ApiError(400, 'WORKFLOW_TOO_LARGE', `연결선은 ${LIMITS.edges}개까지`);

  const nodeIds = new Set();
  const cleanNodes = nodes.map((n, i) => {
    const at = `nodes[${i}]`;
    if (!isPlainObject(n) || typeof n.id !== 'string' || !ID_PATTERN.test(n.id)) throw invalid(`${at}.id`);
    if (nodeIds.has(n.id)) throw invalid(`${at}.id 중복`);
    nodeIds.add(n.id);
    if (!CATEGORIES.includes(n.type)) throw invalid(`${at}.type`);
    const x = n.position?.x;
    const y = n.position?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw invalid(`${at}.position`);
    const d = n.data;
    if (!isPlainObject(d) || typeof d.kind !== 'string' || d.kind.length > 32) throw invalid(`${at}.data.kind`);
    if (typeof d.label !== 'string' || d.label.length > 40) throw invalid(`${at}.data.label`);
    if (d.params !== undefined && !isPlainObject(d.params)) throw invalid(`${at}.data.params`);
    return {
      id: n.id,
      type: n.type,
      position: { x: Math.round(x), y: Math.round(y) },
      data: { kind: d.kind, label: d.label, params: d.params || {} },
    };
  });

  const edgeIds = new Set();
  const cleanEdges = edges.map((e, i) => {
    const at = `edges[${i}]`;
    if (!isPlainObject(e) || typeof e.id !== 'string' || !ID_PATTERN.test(e.id)) throw invalid(`${at}.id`);
    if (edgeIds.has(e.id)) throw invalid(`${at}.id 중복`);
    edgeIds.add(e.id);
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) throw invalid(`${at} 없는 노드에 연결됨`);
    const handle = (h) => (h === undefined || h === null ? null : typeof h === 'string' && h.length <= 64 ? h : undefined);
    const sourceHandle = handle(e.sourceHandle);
    const targetHandle = handle(e.targetHandle);
    if (sourceHandle === undefined || targetHandle === undefined) throw invalid(`${at}.handle`);
    if (e.label !== undefined && e.label !== null && (typeof e.label !== 'string' || e.label.length > 40)) {
      throw invalid(`${at}.label`);
    }
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle,
      targetHandle,
      ...(e.label && { label: e.label }),
    };
  });

  if (JSON.stringify({ nodes: cleanNodes, edges: cleanEdges }).length > LIMITS.bytes) {
    throw new ApiError(400, 'WORKFLOW_TOO_LARGE', `${Math.round(LIMITS.bytes / 1000)}KB까지`);
  }
  return { nodes: cleanNodes, edges: cleanEdges };
}

function view(wf, role, { full, groupName } = {}) {
  return {
    id: String(wf._id),
    groupId: String(wf.groupId),
    ...(groupName !== undefined && { groupName }),
    name: wf.name,
    description: wf.description,
    status: wf.status,
    version: wf.version,
    nodeCount: wf.nodeCount,
    createdAt: wf.createdAt,
    updatedAt: wf.updatedAt,
    myRole: role,
    permissions: permissionsOf(role),
    ...(full && { nodes: wf.nodes, edges: wf.edges }),
  };
}

// Workflow 하나와 내 역할. 그룹 멤버가 아니면 Workflow가 있다는 사실도 알리지 않는다(404).
async function loadWithRole(db, userId, id, action) {
  const _id = toObjectId(id, 'WORKFLOW_NOT_FOUND');
  const wf = await workflows(db).findOne({ _id });
  if (!wf) throw new ApiError(404, 'WORKFLOW_NOT_FOUND');
  const membership = await db.collection('group_members').findOne({ groupId: wf.groupId, userId });
  if (!membership) throw new ApiError(404, 'WORKFLOW_NOT_FOUND');
  if (!can(membership.role, action)) throw new ApiError(403, 'FORBIDDEN');
  return { wf, role: membership.role };
}

// 내가 속한 그룹들의 Workflow 목록 (nodes·edges 는 빼고). groupId 를 주면 그 그룹만.
export async function listWorkflows(db, userId, groupIdFilter) {
  const roles = await myRoles(db, userId);
  let groupIds = [...roles.keys()];
  if (groupIdFilter) {
    if (!roles.has(groupIdFilter)) throw new ApiError(404, 'GROUP_NOT_FOUND');
    groupIds = [groupIdFilter];
  }
  if (groupIds.length === 0) return [];

  const ids = groupIds.map((g) => toObjectId(g));
  const [list, groups] = await Promise.all([
    workflows(db)
      .find({ groupId: { $in: ids } }, { projection: { nodes: 0, edges: 0 } })
      .sort({ updatedAt: -1 })
      .limit(500)
      .toArray(),
    db.collection('groups').find({ _id: { $in: ids } }, { projection: { name: 1 } }).toArray(),
  ]);
  const groupName = new Map(groups.map((g) => [String(g._id), g.name]));
  return list.map((wf) =>
    view(wf, roles.get(String(wf.groupId)), { groupName: groupName.get(String(wf.groupId)) || '' })
  );
}

export async function createWorkflow(db, userId, input = {}) {
  const groupId = toObjectId(input.groupId);
  const membership = await requireGroupAccess(db, groupId, userId, 'edit');
  const name = cleanText(input.name, LIMITS.name, { required: true, code: 'NAME_REQUIRED' });
  const description = cleanText(input.description, LIMITS.description, { required: false });
  const { nodes, edges } = cleanGraph(input.nodes, input.edges);

  if ((await workflows(db).countDocuments({ groupId })) >= LIMITS.perGroup) {
    throw new ApiError(409, 'TOO_MANY_WORKFLOWS', `그룹당 ${LIMITS.perGroup}개까지`);
  }

  const now = new Date();
  const doc = {
    groupId,
    name,
    description,
    status: 'draft',
    version: 1,
    nodes,
    edges,
    nodeCount: nodes.length,
    createdBy: userId,
    createdAt: now,
    updatedBy: userId,
    updatedAt: now,
  };
  const { insertedId } = await workflows(db).insertOne(doc);
  return view({ ...doc, _id: insertedId }, membership.role, { full: true });
}

export async function getWorkflow(db, userId, id) {
  const { wf, role } = await loadWithRole(db, userId, id, 'view');
  const group = await db.collection('groups').findOne({ _id: wf.groupId }, { projection: { name: 1 } });
  return view(wf, role, { full: true, groupName: group?.name || '' });
}

// 저장. 화면이 불러올 때 받은 version 을 같이 보내야 한다.
// 그 사이 다른 사람이 저장했으면 덮어쓰지 않고 VERSION_CONFLICT 로 알린다.
export async function updateWorkflow(db, userId, id, input = {}) {
  const { wf, role } = await loadWithRole(db, userId, id, 'edit');
  if (!Number.isInteger(input.version)) throw new ApiError(400, 'VERSION_REQUIRED');

  const changes = { updatedBy: userId, updatedAt: new Date() };
  if (input.name !== undefined) {
    changes.name = cleanText(input.name, LIMITS.name, { required: true, code: 'NAME_REQUIRED' });
  }
  if (input.description !== undefined) {
    changes.description = cleanText(input.description, LIMITS.description, { required: false });
  }
  if (input.nodes !== undefined || input.edges !== undefined) {
    const graph = cleanGraph(input.nodes ?? wf.nodes, input.edges ?? wf.edges);
    Object.assign(changes, graph, { nodeCount: graph.nodes.length });
  }

  const updated = await workflows(db).findOneAndUpdate(
    { _id: wf._id, version: input.version },
    { $set: changes, $inc: { version: 1 } },
    { returnDocument: 'after' }
  );
  if (!updated) throw new ApiError(409, 'VERSION_CONFLICT', `최신 버전 ${wf.version}`);
  return view(updated, role, { full: true });
}

export async function deleteWorkflow(db, userId, id) {
  const { wf } = await loadWithRole(db, userId, id, 'edit');
  await workflows(db).deleteOne({ _id: wf._id });
}
