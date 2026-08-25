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
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
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
const photosRef = collection(db, CONFIG.COLLECTIONS.photos);

/** Firestore를 그대로 쓰고 싶은 화면(관리자 등)을 위해 열어둔다. */
export { db, participantsRef, matchesRef, photosRef };

/* ---------------------------------------------------------------------
 * 사진
 * ---------------------------------------------------------------------
 * photos/{참가자문서id} = { data: 'data:image/jpeg;base64,...', createdAt }
 *
 * 문서 id를 참가자 id와 똑같이 맞춰 뒀다. 그래야 상대를 찾은 뒤 조회를
 * 한 번만 하면 된다 (쿼리 없이 문서 직접 읽기).
 * ------------------------------------------------------------------- */

/**
 * 참가자 사진을 저장한다.
 * 사진은 없어도 그만인 정보라 실패해도 예외를 던지지 않는다. 사진 하나
 * 빠지는 것보다 참가자가 결과를 못 보는 쪽이 나쁘다.
 * @param {string} participantId
 * @param {string} dataUrl compressPhoto() 결과
 * @returns {Promise<boolean>} 저장 성공 여부
 */
export async function savePhoto(participantId, dataUrl) {
  try {
    await setDoc(doc(db, CONFIG.COLLECTIONS.photos, participantId), {
      data: dataUrl,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error('[db] 사진 저장 실패 — 화면은 그대로 진행한다:', err);
    return false;
  }
}

/**
 * 참가자 사진을 가져온다. 없거나 실패하면 null.
 * @param {string} participantId
 * @returns {Promise<string|null>} data URL
 */
export async function getPhoto(participantId) {
  try {
    const snap = await getDoc(doc(db, CONFIG.COLLECTIONS.photos, participantId));
    if (!snap.exists()) return null;
    const data = snap.data().data;
    return typeof data === 'string' && data.startsWith('data:image/') ? data : null;
  } catch (err) {
    console.error('[db] 사진 조회 실패:', err);
    return null;
  }
}

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
 * 두 사람을 견줘 본다.
 *
 * 두 값을 따로 돌려주는 게 핵심이다. 쓰임새가 다르기 때문이다.
 *   gradeFit — 후보를 고르는 1순위 기준 (화면엔 안 나온다)
 *   mbtiSame — 2순위 기준이자, 화면에 띄우는 궁합 %의 근거
 *
 * 순수 함수라 화면·DB와 무관하게 계산만 한다.
 *
 * @param {object} me
 * @param {object} other
 * @returns {{mbtiSame: number, gradeFit: number, percent: number}}
 */
export function scoreMatch(me, other) {
  // MBTI 4글자 중 몇 글자가 같은가 (0~4)
  let mbtiSame = 0;
  for (let i = 0; i < 4; i++) {
    if (me.mbti[i] === other.mbti[i]) mbtiSame++;
  }

  // 학년 희망이 몇 방향 맞는가 (0~2)
  //   +1  상대가 내 학년을 원한다
  //   +1  내가 상대 학년을 원한다
  let gradeFit = 0;
  if (Array.isArray(other.preferredGrades) && other.preferredGrades.includes(me.grade)) {
    gradeFit++;
  }
  if (Array.isArray(me.preferredGrades) && me.preferredGrades.includes(other.grade)) {
    gradeFit++;
  }

  return {
    mbtiSame,
    gradeFit,
    percent: CONFIG.MBTI_PERCENT[mbtiSame],
  };
}

/**
 * 상대를 찾아 1명을 돌려준다.
 *
 * 고르는 규칙
 *
 *   1. 성별이 반대일 것                          — 절대 조건
 *   2. 학년 희망이 **양쪽 다** 맞을 것            — 절대 조건
 *        · 상대의 희망 학년에 내 학년이 있고
 *        · 내 희망 학년에 상대 학년이 있어야 한다
 *   3. 위를 통과한 사람 중 MBTI가 가장 많이 겹치는 사람, 동점이면 랜덤 1명
 *
 * 학년을 "점수"가 아니라 "절대 조건"으로 둔 이유
 * ───────────────────────────────────────────────────────────────────
 * 참가자가 직접 고른 조건이라 어기면 불만이 나온다. "3학년만 볼래요"라고
 * 했는데 1학년이 뜨면 매칭이 성사돼도 만족스럽지 않다. 조건을 못 맞출
 * 바에는 대기 화면을 보여주는 편이 낫다는 판단이다.
 *
 * 대신 **매칭 실패가 늘어난다.** 특히 행사 초반이나, 희망 학년을 하나만
 * 고른 사람에게 자주 난다. 부스에서 "희망 학년을 여러 개 고르면 매칭
 * 확률이 올라간다"고 안내해야 한다.
 *
 * MBTI는 반대로 절대 조건이 아니다. 16종이라 완전 일치를 요구하면 후보가
 * 0명이 되기 일쑤여서, 겹치는 글자 수로 줄만 세운다.
 *
 * 이미 매칭된 적 있는 사람도 다시 뽑힌다. 매칭 횟수 제한이 없다는 게
 * 스펙이다.
 *
 * 쿼리는 성별 하나만 보낸다. 단일 필드 동등 조건이라 Firestore가 자동
 * 생성하는 색인으로 처리되고, 복합 색인을 따로 만들 필요가 없다.
 * 부스 하나 규모(많아야 수백 명)에서는 전부 받아와 계산해도 충분하다.
 *
 * @param {object} me 방금 저장한 내 프로필
 * @param {string} myId 내 문서 id (자기 자신 제외용)
 * @returns {Promise<object|null>} 상대 문서(+compatibility) 또는 null
 */
export async function findMatch(me, myId) {
  const oppositeGender = me.gender === 'male' ? 'female' : 'male';

  const snap = await getDocs(
    query(participantsRef, where('gender', '==', oppositeGender))
  );

  let best = [];
  let bestMbtiSame = -1;

  snap.forEach((docSnap) => {
    if (docSnap.id === myId) return;

    const other = { id: docSnap.id, ...docSnap.data() };

    // mbti가 없거나 모양이 깨진 문서는 건너뛴다 (수기로 넣은 문서 등)
    if (typeof other.mbti !== 'string' || other.mbti.length !== 4) return;

    const { gradeFit, mbtiSame } = scoreMatch(me, other);

    // 학년 희망이 양쪽 다 맞지 않으면 후보에서 빼버린다
    if (gradeFit < 2) return;

    if (mbtiSame > bestMbtiSame) {
      bestMbtiSame = mbtiSame;
      best = [other];
    } else if (mbtiSame === bestMbtiSame) {
      best.push(other);
    }
  });

  // 조건을 통과한 사람이 없으면 대기 화면으로 보낸다
  if (best.length === 0) return null;

  const partner = best[Math.floor(Math.random() * best.length)];
  return { ...partner, compatibility: CONFIG.MBTI_PERCENT[bestMbtiSame] };
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
      compatibility: partner.compatibility,
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

/**
 * 사진 전체를 { 참가자id: dataUrl } 형태로 가져온다. 관리자 표에서 쓴다.
 * 참가자가 많으면 무거우니 관리자 화면에서만 부른다.
 */
export async function listPhotos() {
  const snap = await getDocs(photosRef);
  const map = {};
  snap.forEach((d) => {
    const data = d.data().data;
    if (typeof data === 'string' && data.startsWith('data:image/')) map[d.id] = data;
  });
  return map;
}

/** 매칭 기록 전체를 최신순으로 가져온다. */
export async function listMatches() {
  const snap = await getDocs(query(matchesRef, orderBy('matchedAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ---------------------------------------------------------------------
 * 삭제 (운영진 전용)
 * ---------------------------------------------------------------------
 * firestore.rules 에서 delete 는 로그인한 사용자에게만 열려 있다.
 * 로그인이 안 된 상태로 부르면 permission-denied 가 난다.
 *
 * ⚠️ 이 권한이 안전하려면 Firebase 콘솔에서 "가입 사용 설정"이 꺼져
 * 있어야 한다. 켜져 있으면 아무나 계정을 만들어 로그인한 뒤 데이터를
 * 지울 수 있다. 자세한 건 firestore.rules 주석 참고.
 * ------------------------------------------------------------------- */

/** 참가자 1명 삭제. 사진도 같이 지운다. */
export async function deleteParticipant(id) {
  await deleteDoc(doc(db, CONFIG.COLLECTIONS.participants, id));
  // 사진이 없을 수도 있고, 지우다 실패해도 참가자는 이미 지워졌다.
  // 여기서 예외를 던지면 화면에 "삭제 실패"가 떠서 오히려 헷갈린다.
  try {
    await deleteDoc(doc(db, CONFIG.COLLECTIONS.photos, id));
  } catch (err) {
    console.error('[db] 사진 삭제 실패 (참가자는 삭제됨):', err);
  }
}

/** 매칭 기록 1건 삭제 */
export async function deleteMatch(id) {
  await deleteDoc(doc(db, CONFIG.COLLECTIONS.matches, id));
}

/**
 * 컬렉션을 통째로 비운다.
 * writeBatch 는 한 번에 500개까지라 400개씩 끊어서 커밋한다.
 * @returns {Promise<number>} 지운 문서 수
 */
async function deleteAllIn(ref, collectionName) {
  const snap = await getDocs(ref);
  const ids = snap.docs.map((d) => d.id);

  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => {
      batch.delete(doc(db, collectionName, id));
    });
    await batch.commit();
  }

  return ids.length;
}

/** 참가자 전체 삭제 (사진은 deleteAllPhotos 로 따로 지운다) */
export function deleteAllParticipants() {
  return deleteAllIn(participantsRef, CONFIG.COLLECTIONS.participants);
}

/** 매칭 기록 전체 삭제 */
export function deleteAllMatches() {
  return deleteAllIn(matchesRef, CONFIG.COLLECTIONS.matches);
}

/** 사진 전체 삭제 */
export function deleteAllPhotos() {
  return deleteAllIn(photosRef, CONFIG.COLLECTIONS.photos);
}
