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

import { listParticipants, listMatches } from '../js/db.js';

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

$('btn-refresh').addEventListener('click', refresh);

async function refresh() {
  const btn = $('btn-refresh');
  btn.disabled = true;
  btn.textContent = '불러오는 중...';
  $('dash-error').textContent = '';

  try {
    [participants, matches] = await Promise.all([listParticipants(), listMatches()]);
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

  matches.forEach((m) => {
    const tr = document.createElement('tr');
    cell(tr, fmtTime(m.matchedAt), 'num');
    tagCell(tr, m.mbti || m.a?.mbti || '');
    cell(tr, m.a?.nickname || '');
    cell(tr, '@' + (m.a?.instagram || ''));
    cell(tr, m.b?.nickname || '');
    cell(tr, '@' + (m.b?.instagram || ''));
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
  URL.revokeObjectURL(url);
});

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
