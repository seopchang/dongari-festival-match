/* =====================================================================
 *  Firestore 데이터 계층
 * =====================================================================
 *  화면 코드(app.js)는 Firestore를 직접 건드리지 않는다. 여기 있는
 *  함수만 부른다. 나중에 Cloud Functions로 옮기더라도 이 파일만 고치면
 *  된다.
 *
 *  컬렉션 구조
 *  ───────────────────────────────────────────────────────────────────
 *  participants/{autoId}
 *    createdAt       Timestamp   서버 시각
 *    nickname        string
 *    instagram       string      '@' 제거 + 소문자
 *    gender          'male'|'female'
 *    grade           1|2|3
 *    preferredGrades number[]    매칭 희망 학년 (중복 선택)
 *    questionIds     string[]    출제된 문항 id 4개 (통계용)
 *    answers         {EI,NS,TF,PJ: 'a'|'b'}
 *    mbti            string      'ENFP'
 *    message         string      한마디
 *
 *  matches/{autoId}
 *    matchedAt       Timestamp
 *    a               {nickname, instagram, mbti}
 *    b               {nickname, instagram, mbti}
 *    mbti            string      두 사람 공통 MBTI (관리자 집계용)
 * =====================================================================
 */

import {
  initializeApp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { CONFIG } from './config.js';

const app = initializeApp(CONFIG.firebase);
const db = getFirestore(app);

const participantsRef = collection(db, CONFIG.COLLECTIONS.participants);
const matchesRef = collection(db, CONFIG.COLLECTIONS.matches);

/** Firestore를 그대로 쓰고 싶은 화면(관리자 등)을 위해 열어둔다. */
export { db, participantsRef, matchesRef };

/**
 * 인스타 ID를 저장 형태로 정규화한다.
 * 앞의 '@'와 공백을 떼고 소문자로 맞춘다. 중복 검사도 이 값으로 한다.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeInstagram(raw) {
  return String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

/**
 * 이미 참여한 인스타 ID인지 확인한다.
 * instagram은 단일 필드 조건이라 복합 색인이 필요 없다.
 * @param {string} instagram 정규화된 값
 * @returns {Promise<boolean>}
 */
export async function isDuplicateInstagram(instagram) {
  const snap = await getDocs(
    query(participantsRef, where('instagram', '==', instagram), limit(1))
  );
  return !snap.empty;
}

/**
 * 참가자를 저장하고 문서 id를 돌려준다.
 * @param {object} profile
 * @returns {Promise<string>}
 */
export async function saveParticipant(profile) {
  const ref = await addDoc(participantsRef, {
    ...profile,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * 조건에 맞는 상대를 찾아 1명을 랜덤으로 돌려준다.
 *
 * 매칭 조건
 *   1. 성별이 반대
 *   2. MBTI가 동일
 *   3. 상대의 preferredGrades 에 내 학년이 포함
 *   4. 내 preferredGrades 에 상대 학년이 포함
 *
 * 이미 매칭된 적 있는 사람도 조건만 맞으면 다시 뽑힌다. 매칭 횟수에
 * 제한이 없다는 게 스펙이다.
 *
 * 왜 조건 2개만 쿼리로 보내고 나머지는 여기서 거르는가
 * ───────────────────────────────────────────────────────────────────
 * gender + mbti 동등 조건은 Firestore가 자동 생성하는 색인으로 처리된다.
 * 여기에 grade in [...] 과 preferredGrades array-contains 까지 얹으면
 * 복합 색인을 따로 만들어야 하고, 색인이 없으면 쿼리 자체가 실패한다.
 * 부스 하나 규모(많아야 수백 명)에서 "동일 MBTI + 반대 성별"은 이미
 * 아주 작은 집합이라, 나머지 두 조건은 받아와서 거르는 편이 배포 사고가
 * 날 여지가 적다.
 *
 * @param {object} me 방금 저장한 내 프로필
 * @param {string} myId 내 문서 id (자기 자신 제외용)
 * @returns {Promise<object|null>} 상대 문서 또는 null
 */
export async function findMatch(me, myId) {
  const oppositeGender = me.gender === 'male' ? 'female' : 'male';

  const snap = await getDocs(
    query(
      participantsRef,
      where('gender', '==', oppositeGender),
      where('mbti', '==', me.mbti)
    )
  );

  const candidates = [];
  snap.forEach((docSnap) => {
    if (docSnap.id === myId) return;

    const other = docSnap.data();

    // 3. 상대가 내 학년을 원하는가
    if (!Array.isArray(other.preferredGrades)) return;
    if (!other.preferredGrades.includes(me.grade)) return;

    // 4. 내가 상대 학년을 원하는가
    if (!me.preferredGrades.includes(other.grade)) return;

    candidates.push({ id: docSnap.id, ...other });
  });

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 매칭 성사를 matches 컬렉션에 남긴다.
 * 화면 진행을 막지 않도록 실패해도 예외를 던지지 않는다. 기록이 하나
 * 빠지는 것보다 참가자가 결과를 못 보는 쪽이 나쁘다.
 * @param {object} me
 * @param {object} partner
 */
export async function recordMatch(me, partner) {
  try {
    await addDoc(matchesRef, {
      matchedAt: serverTimestamp(),
      mbti: me.mbti,
      a: {
        nickname: me.nickname,
        instagram: me.instagram,
        mbti: me.mbti,
      },
      b: {
        nickname: partner.nickname,
        instagram: partner.instagram,
        mbti: partner.mbti,
      },
    });
  } catch (err) {
    console.error('[db] 매칭 기록 실패 — 화면은 그대로 진행한다:', err);
  }
}

/* ---------------------------------------------------------------------
 * 관리자 화면용
 * ------------------------------------------------------------------- */

/** 참가자 전체를 최신순으로 가져온다. */
export async function listParticipants() {
  const snap = await getDocs(query(participantsRef, orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 매칭 기록 전체를 최신순으로 가져온다. */
export async function listMatches() {
  const snap = await getDocs(query(matchesRef, orderBy('matchedAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
