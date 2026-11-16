// MongoDB 연결 공통 함수.
// Vercel Function은 같은 인스턴스가 여러 요청을 처리하므로 연결을 한 번만 만들어 재사용한다.
import { MongoClient } from 'mongodb';

let clientPromise = null;
let indexesReady = null;

// 컬렉션별 인덱스. 이미 있으면 MongoDB가 그대로 둔다.
async function ensureIndexes(db) {
  await Promise.all([
    // 한 사람은 한 그룹에 한 번만 속한다
    db.collection('group_members').createIndex({ groupId: 1, userId: 1 }, { unique: true }),
    // "내 그룹 목록" 조회용
    db.collection('group_members').createIndex({ userId: 1 }),
    // 그룹별 Workflow 목록(최근 수정 순)
    db.collection('workflows').createIndex({ groupId: 1, updatedAt: -1 }),
    // Workflow별·그룹별 최근 실행 목록
    db.collection('executions').createIndex({ workflowId: 1, createdAt: -1 }),
    db.collection('executions').createIndex({ groupId: 1, createdAt: -1 }),
    // 9단계: 인증정보 목록, Webhook 토큰 찾기, 주기 작업이 찾는 실행·예약
    db.collection('credentials').createIndex({ groupId: 1 }),
    db.collection('webhook_tokens').createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection('webhook_tokens').createIndex({ workflowId: 1, nodeId: 1 }),
    db.collection('executions').createIndex({ status: 1, resumeAt: 1 }),
    db.collection('workflows').createIndex({ status: 1 }),
  ]);
}

// DB를 돌려준다. MONGODB_URI가 없으면 null.
export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (!clientPromise) {
    clientPromise = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 })
      .connect()
      .catch((err) => {
        // 실패한 연결을 붙잡고 있지 않게 다음 요청에서 다시 시도한다
        clientPromise = null;
        throw err;
      });
  }
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || 'flowbuilder');

  if (!indexesReady) {
    indexesReady = ensureIndexes(db).catch((err) => {
      indexesReady = null;
      throw err;
    });
  }
  await indexesReady;
  return db;
}

// 테스트에서 연결을 닫을 때 쓴다.
export async function closeDb() {
  if (!clientPromise) return;
  const client = await clientPromise;
  clientPromise = null;
  indexesReady = null;
  await client.close();
}
