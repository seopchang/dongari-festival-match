/* =====================================================================
 *  운영진 대시보드
 * =====================================================================
 *  Firebase 인증(이메일/비밀번호)으로 로그인한 사람만 들어온다.
 *
 *  주의 — 이 로그인은 "화면을 가리는" 수준의 보호가 아니다.
 *  matches 컬렉션은 firestore.rules 에서 request.auth != null 을 요구하므로
 *  로그인하지 않으면 데이터 자체를 못 읽는다.
 *  다만 participants 는 참가자 앱이 매칭 계산에 써야 해서 열려 있다.
 *  자세한 건 firestore.rules 주석 참고.
 * =====================================================================
 */

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

import {
  listParticipants,
  listMatches,
  listPhotos,
  deleteParticipant,
  deleteMatch,
  deleteAllParticipants,
  deleteAllMatches,
  deleteAllPhotos,
} from '../js/db.js';
import { animalSvg, animalLabel } from '../js/animals.js';

const auth = getAuth();
const $ = (id) => document.getElementById(id);

/* ---------------------------------------------------------------------
 * 로그인
 * ------------------------------------------------------------------- */

const elLogin = $('login');
const elDash = $('dash');
const elLoginError = $('login-error');

elLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  elLoginError.textContent = '';
  $('btn-login').disabled = true;

  try {
    await signInWithEmailAndPassword(auth, $('email').value.trim(), $('password').value);
  } catch (err) {
    console.error(err);
    elLoginError.textContent =
      err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? '이메일 또는 비밀번호가 맞지 않아요.'
        : '로그인에 실패했어요: ' + err.code;
  } finally {
    $('btn-login').disabled = false;
  }
});

$('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  elLogin.hidden = !!user;
  elDash.hidden = !user;

  if (user) {
    $('who').textContent = user.email;
    refresh();
  }
});

/* ---------------------------------------------------------------------
 * 데이터 적재
 * ------------------------------------------------------------------- */

let participants = [];
let matches = [];
/** { 참가자문서id: dataUrl } */
let photos = {};

$('btn-refresh').addEventListener('click', refresh);

async function refresh() {
  const btn = $('btn-refresh');
  btn.disabled = true;
  btn.textContent = '불러오는 중...';
  $('dash-error').textContent = '';
  $('dash-ok').textContent = '';

  try {
    [participants, matches, photos] = await Promise.all([
      listParticipants(),
      listMatches(),
      listPhotos(),
    ]);
    renderStats();
    renderParticipants();
    renderMatches();
    renderDistribution();
  } catch (err) {
    console.error(err);
    $('dash-error').textContent =
      '데이터를 불러오지 못했어요. Firestore 규칙이 배포됐는지, 색인이 필요한지 콘솔을 확인하세요: ' +
      (err.code || err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '새로고침';
  }
}

/* ---------------------------------------------------------------------
 * 표시 도우미
 * ------------------------------------------------------------------- */

/** Firestore Timestamp → 'MM/DD HH:mm' */
function fmtTime(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '–';
  const d = ts.toDate();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const GENDER_KR = { male: '남', female: '여' };

/** 사용자 입력을 표에 넣을 때 항상 textContent로 넣는다 (HTML 주입 방지) */
function cell(row, text, className) {
  const td = document.createElement('td');
  td.textContent = text ?? '';
  if (className) td.className = className;
  row.appendChild(td);
  return td;
}

function tagCell(row, text, variant) {
  const td = document.createElement('td');
  const span = document.createElement('span');
  span.className = 'tag' + (variant ? ' tag--' + variant : '');
  span.textContent = text ?? '';
  td.appendChild(span);
  row.appendChild(td);
}

/**
 * 사진 썸네일 칸.
 * 사진이 없으면 참가자가 고른 동물상 그림을 대신 넣는다.
 * @param {HTMLElement} row
 * @param {string|null|undefined} dataUrl
 * @param {string} [animal] 동물상 id
 */
function photoCell(row, dataUrl, animal) {
  const td = document.createElement('td');

  if (!dataUrl) {
    const box = document.createElement('span');
    box.className = 'thumb thumb--art';
    box.title = animalLabel(animal) || '사진·동물상 없음';
    box.innerHTML = animalSvg(animal);
    td.appendChild(box);
    row.appendChild(td);
    return;
  }

  if (dataUrl) {
    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = dataUrl;
    img.alt = '';
    // 누르면 원래 크기로 새 탭에서 열린다 (얼굴 확인용)
    img.title = '클릭하면 크게 보기';
    img.addEventListener('click', () => {
      const w = window.open();
      if (w) w.document.write(`<img src="${dataUrl}" style="max-width:100%">`);
    });
    td.appendChild(img);
  } else {
    td.textContent = '–';
  }

  row.appendChild(td);
}

/**
 * 행 끝에 삭제 버튼을 붙인다.
 * @param {HTMLElement} row
 * @param {string} label 확인 창에 띄울 대상 이름
 * @param {() => Promise<void>} run 실제 삭제 동작
 */
function deleteCell(row, label, run) {
  const td = document.createElement('td');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'row-del';
  btn.textContent = '삭제';

  btn.addEventListener('click', async () => {
    if (!confirm(`${label}\n\n정말 삭제할까요? 되돌릴 수 없습니다.`)) return;

    btn.disabled = true;
    btn.textContent = '삭제 중...';
    try {
      await run();
      await refresh();
      flashOk('삭제했습니다.');
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      btn.textContent = '삭제';
      showDeleteError(err);
    }
  });

  td.appendChild(btn);
  row.appendChild(td);
}

function flashOk(msg) {
  $('dash-ok').textContent = msg;
  setTimeout(() => {
    if ($('dash-ok').textContent === msg) $('dash-ok').textContent = '';
  }, 4000);
}

/** 삭제 실패는 대부분 규칙 미배포다. 그걸 콕 집어 알려준다. */
function showDeleteError(err) {
  const code = err.code || err.message || '';
  const el = $('dash-error');

  el.textContent = code.includes('permission-denied')
    ? '삭제 권한이 없습니다. Firebase 콘솔 → Firestore Database → 규칙 탭에 ' +
      'firestore.rules 내용을 붙여넣고 "게시"를 눌렀는지 확인하세요. ' +
      '(로컬/배포 여부와는 무관합니다 — 같은 데이터베이스를 씁니다.)'
    : '삭제에 실패했어요: ' + code;

  // 오류 표시줄은 대시보드 맨 위에 있는데 삭제 버튼은 표 아래쪽에 있다.
  // 그냥 두면 오류가 화면 밖에 떠서 "아무 반응 없이 안 지워진다"로 보인다.
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ---------------------------------------------------------------------
 * 통계
 * ------------------------------------------------------------------- */

function renderStats() {
  $('st-total').textContent = participants.length;

  const male = participants.filter((p) => p.gender === 'male').length;
  const female = participants.filter((p) => p.gender === 'female').length;
  $('st-gender').textContent = `${male} / ${female}`;

  $('st-matches').textContent = matches.length;

  // 매칭 기록에 인스타가 한 번이라도 등장한 사람은 "매칭됨"으로 본다
  const matched = new Set();
  matches.forEach((m) => {
    if (m.a?.instagram) matched.add(m.a.instagram);
    if (m.b?.instagram) matched.add(m.b.instagram);
  });
  $('st-waiting').textContent = participants.filter(
    (p) => !matched.has(p.instagram)
  ).length;

  const counts = mbtiCounts();
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  $('st-top-mbti').textContent = top ? top[0] : '–';
  $('st-top-mbti-sub').textContent = top ? `${top[1]}명` : '';
}

function mbtiCounts() {
  const counts = {};
  participants.forEach((p) => {
    if (!p.mbti) return;
    counts[p.mbti] = (counts[p.mbti] || 0) + 1;
  });
  return counts;
}

/* ---------------------------------------------------------------------
 * 참가자 표
 * ------------------------------------------------------------------- */

function renderParticipants() {
  const tb = $('tb-participants');
  tb.innerHTML = '';
  $('empty-participants').hidden = participants.length > 0;

  participants.forEach((p) => {
    const tr = document.createElement('tr');
    cell(tr, fmtTime(p.createdAt), 'num');
    photoCell(tr, photos[p.id], p.animal);
    cell(tr, p.nickname);
    cell(tr, '@' + (p.instagram || ''));
    cell(tr, GENDER_KR[p.gender] || p.gender || '');
    cell(tr, p.grade ? `${p.grade}학년` : '');
    cell(
      tr,
      Array.isArray(p.preferredGrades)
        ? p.preferredGrades.map((g) => `${g}`).join(', ')
        : ''
    );
    tagCell(tr, p.mbti, 'pink');
    cell(tr, p.message || '', 'msg-cell');
    deleteCell(tr, `참가자 @${p.instagram || ''} (${p.nickname || ''})`, () =>
      deleteParticipant(p.id)
    );
    tb.appendChild(tr);
  });
}

/* ---------------------------------------------------------------------
 * 매칭 기록 표
 * ------------------------------------------------------------------- */

function renderMatches() {
  const tb = $('tb-matches');
  tb.innerHTML = '';
  $('empty-matches').hidden = matches.length > 0;

  // 매칭 기록에는 참가자 문서 id가 없다 (닉네임·인스타만 복사해 둔다).
  // 사진은 문서 id로 저장되므로 인스타 ID를 다리 삼아 잇는다.
  const idByInsta = {};
  participants.forEach((p) => {
    if (p.instagram) idByInsta[p.instagram] = p.id;
  });
  const photoOf = (insta) => (insta ? photos[idByInsta[insta]] : null);

  // 동물상도 참가자 문서에 있으므로 같은 다리를 쓴다
  const byInsta = {};
  participants.forEach((p) => {
    if (p.instagram) byInsta[p.instagram] = p;
  });
  const animalOf = (insta) => (insta && byInsta[insta] ? byInsta[insta].animal : null);

  matches.forEach((m) => {
    const tr = document.createElement('tr');
    cell(tr, fmtTime(m.matchedAt), 'num');
    tagCell(tr, m.mbti || m.a?.mbti || '');
    cell(tr, typeof m.compatibility === 'number' ? `${m.compatibility}%` : '–', 'num');
    photoCell(tr, photoOf(m.a?.instagram), animalOf(m.a?.instagram));
    cell(tr, m.a?.nickname || '');
    cell(tr, '@' + (m.a?.instagram || ''));
    photoCell(tr, photoOf(m.b?.instagram), animalOf(m.b?.instagram));
    cell(tr, m.b?.nickname || '');
    cell(tr, '@' + (m.b?.instagram || ''));
    deleteCell(
      tr,
      `매칭 @${m.a?.instagram || ''} ↔ @${m.b?.instagram || ''}`,
      () => deleteMatch(m.id)
    );
    tb.appendChild(tr);
  });
}

/* ---------------------------------------------------------------------
 * MBTI 분포
 * ------------------------------------------------------------------- */

function renderDistribution() {
  const box = $('dist');
  box.innerHTML = '';

  const counts = mbtiCounts();
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  $('empty-dist').hidden = entries.length > 0;

  const max = entries.length ? entries[0][1] : 1;

  entries.forEach(([mbti, n]) => {
    const item = document.createElement('div');
    item.className = 'dist__item';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'stretch';

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';

    const label = document.createElement('span');
    label.className = 'tag tag--pink';
    label.textContent = mbti;

    const count = document.createElement('strong');
    count.textContent = `${n}명`;
    count.style.fontSize = '14px';

    row.append(label, count);

    const bar = document.createElement('div');
    bar.className = 'dist__bar';
    bar.style.width = `${Math.round((n / max) * 100)}%`;

    item.append(row, bar);
    box.appendChild(item);
  });
}

/* ---------------------------------------------------------------------
 * 탭
 * ------------------------------------------------------------------- */

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) =>
      t.setAttribute('aria-selected', String(t === tab))
    );
    document.querySelectorAll('.panel').forEach((p) =>
      p.classList.toggle('is-active', p.id === tab.dataset.panel)
    );
  });
});

/* ---------------------------------------------------------------------
 * 데이터 초기화
 * ---------------------------------------------------------------------
 * 되돌릴 수 없으므로 확인을 두 번 받는다. 전체 초기화는 "삭제"를 직접
 * 타이핑하게 해서, 확인 창을 습관적으로 넘겨버리는 사고를 막는다.
 * ------------------------------------------------------------------- */

/**
 * @param {HTMLButtonElement} btn
 * @param {string} label 진행 중 표시할 이름
 * @param {() => Promise<string>} run 삭제 실행 → 결과 문구를 돌려준다
 */
async function runWipe(btn, label, run) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = label;
  $('dash-error').textContent = '';
  $('dash-ok').textContent = '';

  try {
    const msg = await run();
    await refresh();
    flashOk(msg);
  } catch (err) {
    console.error(err);
    showDeleteError(err);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

$('btn-wipe-matches').addEventListener('click', () => {
  if (matches.length === 0) {
    flashOk('지울 매칭 기록이 없습니다.');
    return;
  }
  if (!confirm(`매칭 기록 ${matches.length}건을 전부 삭제합니다.\n\n참가자는 그대로 남습니다. 되돌릴 수 없습니다.`)) {
    return;
  }

  runWipe($('btn-wipe-matches'), '삭제 중...', async () => {
    const n = await deleteAllMatches();
    return `매칭 기록 ${n}건을 삭제했습니다.`;
  });
});

$('btn-wipe-all').addEventListener('click', () => {
  if (participants.length === 0 && matches.length === 0) {
    flashOk('지울 데이터가 없습니다.');
    return;
  }

  const typed = prompt(
    `참가자 ${participants.length}명과 매칭 기록 ${matches.length}건을 전부 삭제합니다.\n` +
      '되돌릴 수 없습니다. CSV 백업은 받으셨나요?\n\n' +
      '계속하려면 아래에 삭제 라고 입력하세요.'
  );
  if (typed === null) return;
  if (typed.trim() !== '삭제') {
    $('dash-error').textContent = '입력이 달라서 취소했습니다. 아무것도 지우지 않았어요.';
    return;
  }

  runWipe($('btn-wipe-all'), '삭제 중...', async () => {
    // 매칭을 먼저 지운다. 참가자만 남는 것보다, 참가자 삭제가 중간에
    // 실패했을 때 매칭 기록만 붕 떠 있는 상태가 더 헷갈린다.
    const m = await deleteAllMatches();
    const f = await deleteAllPhotos();
    const p = await deleteAllParticipants();
    return `참가자 ${p}명, 매칭 기록 ${m}건, 사진 ${f}장을 삭제했습니다.`;
  });
});

/* ---------------------------------------------------------------------
 * CSV 내려받기
 * ------------------------------------------------------------------- */

$('btn-csv').addEventListener('click', () => {
  const header = [
    '참여시각', '닉네임', '인스타', '성별', '학년',
    '희망학년', 'MBTI', '한마디',
  ];

  const rows = participants.map((p) => [
    fmtTime(p.createdAt),
    p.nickname || '',
    p.instagram || '',
    GENDER_KR[p.gender] || '',
    p.grade || '',
    Array.isArray(p.preferredGrades) ? p.preferredGrades.join(' ') : '',
    p.mbti || '',
    p.message || '',
  ]);

  const csv = [header, ...rows]
    .map((r) => r.map(csvCell).join(','))
    .join('\r\n');

  // BOM을 붙여야 엑셀이 UTF-8로 읽는다. 없으면 한글이 깨진다.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'participants.csv';
  a.click();
  // 곧바로 해제하면 브라우저가 저장을 시작하기 전에 URL이 사라져서
  // 다운로드가 조용히 실패하는 경우가 있다. 한 틱 뒤에 해제한다.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
