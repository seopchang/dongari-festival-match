/* =====================================================================
 *  화면 흐름 제어
 * =====================================================================
 *  시작 → 기본 정보 → 질문 4개 → 한마디 → 분석 중 → 결과 | 대기
 *
 *  제출 전까지는 뒤로가기로 앞 화면에 돌아갈 수 있고, 제출한 뒤에는
 *  막힌다. 브라우저 뒤로가기(제스처 포함)도 같이 막는다.
 * =====================================================================
 */

import { CONFIG } from './config.js';
import {
  AXES,
  AXIS_LABEL,
  drawQuestionSet,
  restoreQuestionSet,
  buildMbti,
} from './questions.js';
import {
  normalizeInstagram,
  isDuplicateInstagram,
  saveParticipant,
  findMatch,
  recordMatch,
} from './db.js';

/* ---------------------------------------------------------------------
 * 저장소 — 새로고침을 견디게 한다
 * ------------------------------------------------------------------- */

const KEY = {
  questions: CONFIG.STORAGE_PREFIX + 'questionIds',
  draft: CONFIG.STORAGE_PREFIX + 'draft',
  outcome: CONFIG.STORAGE_PREFIX + 'outcome',
};

/**
 * localStorage는 시크릿 모드나 저장 공간 차단 설정에서 접근 자체가
 * 예외를 던진다. 저장이 안 되더라도 앱은 굴러가야 하므로 전부 감싼다.
 */
function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 못 해도 진행에는 지장 없다 */
  }
}

/* ---------------------------------------------------------------------
 * 상태
 * ------------------------------------------------------------------- */

/** 논리적 단계 순서. 뒤로가기는 이 배열을 거슬러 올라간다. */
const STEPS = ['start', 'profile', 'q0', 'q1', 'q2', 'q3', 'message'];

/** 단계 → 화면 element id */
const SCREEN_OF = {
  start: 'screen-start',
  profile: 'screen-profile',
  q0: 'screen-question',
  q1: 'screen-question',
  q2: 'screen-question',
  q3: 'screen-question',
  message: 'screen-message',
  analyzing: 'screen-analyzing',
  result: 'screen-result',
  waiting: 'screen-waiting',
};

const state = {
  step: 'start',

  /** 제출이 끝났는가. true면 뒤로가기를 막는다. */
  locked: false,

  nickname: '',
  instagram: '',
  gender: null,
  grade: null,
  preferredGrades: [],

  /** [{axis, question}] — 세션당 한 번만 뽑는다 */
  questionSet: null,

  /** {EI:'a'|'b', ...} */
  answers: {},

  message: '',
};

const $ = (id) => document.getElementById(id);

/* ---------------------------------------------------------------------
 * 화면 전환
 * ------------------------------------------------------------------- */

function render() {
  const targetId = SCREEN_OF[state.step];

  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('is-active', el.id === targetId);
  });

  // 질문 화면은 4번 재사용하므로 매번 내용을 다시 채운다
  if (state.step.startsWith('q')) renderQuestion(Number(state.step.slice(1)));

  // 뒤로가기 버튼은 첫 단계에서 숨기고, 잠긴 뒤에는 전부 숨긴다
  const idx = STEPS.indexOf(state.step);
  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.style.visibility = !state.locked && idx > 1 ? 'visible' : 'hidden';
  });

  window.scrollTo(0, 0);
}

function goTo(step, { push = true } = {}) {
  state.step = step;
  if (push) history.pushState({ step }, '');
  render();
}

/**
 * 브라우저 뒤로가기 처리.
 * 제출 전이면 한 단계 앞으로 돌아가고, 제출 후에는 방금 나간 기록을
 * 다시 밀어 넣어 화면을 붙잡아 둔다.
 */
window.addEventListener('popstate', () => {
  if (state.locked) {
    history.pushState({ step: state.step }, '');
    return;
  }

  const idx = STEPS.indexOf(state.step);
  if (idx > 0) {
    state.step = STEPS[idx - 1];
    render();
  } else {
    // 첫 화면에서 더 뒤로 가려 하면 그대로 둔다
    history.pushState({ step: state.step }, '');
  }
});

function back() {
  if (state.locked) return;
  const idx = STEPS.indexOf(state.step);
  if (idx > 0) history.back();
}

document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', back);
});

/* ---------------------------------------------------------------------
 * 화면 2 — 기본 정보
 * ------------------------------------------------------------------- */

const elNickname = $('in-nickname');
const elInstagram = $('in-instagram');
const elProfileError = $('profile-error');
const elProfileNext = $('btn-profile-next');

/** 학년 버튼을 CONFIG.GRADES 로부터 만들어 넣는다 */
function buildGradeButtons(container, values) {
  container.innerHTML = '';
  values.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.dataset.value = String(g);
    b.setAttribute('aria-pressed', 'false');
    b.textContent = `${g}학년`;
    container.appendChild(b);
  });
}

buildGradeButtons($('choices-grade'), CONFIG.GRADES);
buildGradeButtons($('choices-pref'), CONFIG.GRADES);

/** 단수 선택 그룹 */
function wireSingleSelect(container, onPick) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.choice');
    if (!btn) return;

    [...container.children].forEach((c) =>
      c.setAttribute('aria-pressed', String(c === btn))
    );
    onPick(btn.dataset.value);
    validateProfile();
  });
}

/** 중복 선택 그룹 */
function wireMultiSelect(container, onChange) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.choice');
    if (!btn) return;

    const on = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', String(!on));

    onChange(
      [...container.children]
        .filter((c) => c.getAttribute('aria-pressed') === 'true')
        .map((c) => Number(c.dataset.value))
    );
    validateProfile();
  });
}

wireSingleSelect($('choices-gender'), (v) => {
  state.gender = v;
});
wireSingleSelect($('choices-grade'), (v) => {
  state.grade = Number(v);
});
wireMultiSelect($('choices-pref'), (vals) => {
  state.preferredGrades = vals;
});

/** 다음 버튼 활성 여부를 갱신한다 */
function validateProfile() {
  state.nickname = elNickname.value.trim();
  state.instagram = normalizeInstagram(elInstagram.value);

  const ok =
    state.nickname.length > 0 &&
    state.instagram.length > 0 &&
    state.gender !== null &&
    state.grade !== null &&
    state.preferredGrades.length > 0;

  elProfileNext.disabled = !ok;
  return ok;
}

elNickname.addEventListener('input', validateProfile);
elInstagram.addEventListener('input', () => {
  // 사용자가 '@'를 직접 붙여도 자동으로 떼어준다 (입력창엔 이미 @가 붙어 있다)
  if (elInstagram.value.startsWith('@')) {
    elInstagram.value = elInstagram.value.replace(/^@+/, '');
  }
  validateProfile();
});

elProfileNext.addEventListener('click', async () => {
  if (!validateProfile()) return;

  elProfileError.textContent = '';
  elProfileNext.disabled = true;
  elProfileNext.textContent = '확인 중...';

  try {
    // 같은 인스타 ID로 두 번 참여하는 걸 막는다
    if (await isDuplicateInstagram(state.instagram)) {
      elProfileError.textContent =
        '이미 참여하셨어요. 한 계정당 한 번만 참여할 수 있어요.';
      return;
    }
    saveDraft();
    goTo('q0');
  } catch (err) {
    console.error(err);
    elProfileError.textContent =
      '연결에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.';
  } finally {
    elProfileNext.disabled = false;
    elProfileNext.textContent = '다음';
    validateProfile();
  }
});

/* ---------------------------------------------------------------------
 * 화면 3~6 — 질문
 * ------------------------------------------------------------------- */

/**
 * 문항 세트를 준비한다.
 * 이미 뽑아둔 게 있으면 그대로 쓴다 — 새로고침해도 같은 질문이 나와야
 * 한다는 게 스펙이다.
 */
function ensureQuestionSet() {
  if (state.questionSet) return;

  const restored = restoreQuestionSet(load(KEY.questions));
  if (restored) {
    state.questionSet = restored;
    return;
  }

  state.questionSet = drawQuestionSet();
  save(
    KEY.questions,
    state.questionSet.map(({ question }) => question.id)
  );
}

function renderQuestion(index) {
  ensureQuestionSet();

  const { axis, question } = state.questionSet[index];
  const total = AXES.length;

  $('q-count').innerHTML = `${index + 1}<span>/${total}</span>`;
  $('q-fill').style.width = `${((index + 1) / total) * 100}%`;
  $('q-axis').textContent = AXIS_LABEL[axis];
  $('q-text').textContent = question.text;
  $('q-opt-a-label').textContent = question.a.label;
  $('q-opt-b-label').textContent = question.b.label;

  // 뒤로 돌아왔을 때 이전에 고른 답을 표시한다
  const picked = state.answers[axis] || null;
  $('q-opt-a').setAttribute('aria-pressed', String(picked === 'a'));
  $('q-opt-b').setAttribute('aria-pressed', String(picked === 'b'));
}

function answerQuestion(choice) {
  const index = Number(state.step.slice(1));
  const { axis } = state.questionSet[index];

  state.answers[axis] = choice;
  saveDraft();

  // 선택하면 바로 다음으로 넘어간다 (별도 다음 버튼 없음)
  goTo(index + 1 < AXES.length ? `q${index + 1}` : 'message');
}

$('q-opt-a').addEventListener('click', () => answerQuestion('a'));
$('q-opt-b').addEventListener('click', () => answerQuestion('b'));

/* ---------------------------------------------------------------------
 * 화면 7 — 한마디
 * ------------------------------------------------------------------- */

const elMessage = $('in-message');
const elCounter = $('msg-counter');
const elMessageError = $('message-error');
const elSubmit = $('btn-submit');

elMessage.maxLength = CONFIG.MESSAGE_MAX_LEN;

function updateCounter() {
  const len = [...elMessage.value].length;
  elCounter.textContent = `${len} / ${CONFIG.MESSAGE_MAX_LEN}`;
  elCounter.classList.toggle('is-full', len >= CONFIG.MESSAGE_MAX_LEN);
  state.message = elMessage.value.trim();
  saveDraft();
}

elMessage.addEventListener('input', updateCounter);

/* ---------------------------------------------------------------------
 * 제출 → 분석 → 결과
 * ------------------------------------------------------------------- */

elSubmit.addEventListener('click', async () => {
  elMessageError.textContent = '';
  elSubmit.disabled = true;

  const profile = {
    nickname: state.nickname,
    instagram: state.instagram,
    gender: state.gender,
    grade: state.grade,
    preferredGrades: [...state.preferredGrades].sort((a, b) => a - b),
    questionIds: state.questionSet.map(({ question }) => question.id),
    answers: { ...state.answers },
    mbti: buildMbti(state.questionSet, state.answers),
    message: state.message,
  };

  // 여기서부터는 되돌릴 수 없다
  state.locked = true;
  goTo('analyzing');

  // 분석 연출과 실제 조회를 동시에 돌린다. 조회가 빨리 끝나도 최소
  // ANALYZING_MS 만큼은 화면을 보여준다.
  const minWait = new Promise((r) => setTimeout(r, CONFIG.ANALYZING_MS));

  try {
    // 제출 직전에 한 번 더 중복을 확인한다. 화면2를 지나온 뒤 다른 기기에서
    // 같은 ID로 참여했을 수 있다.
    if (await isDuplicateInstagram(profile.instagram)) {
      throw new DuplicateError();
    }

    const myId = await saveParticipant(profile);
    const partner = await findMatch(profile, myId);

    if (partner) await recordMatch(profile, partner);

    await minWait;
    finish(profile, partner);
  } catch (err) {
    await minWait;

    if (err instanceof DuplicateError) {
      state.locked = false;
      goTo('message');
      elMessageError.textContent =
        '이미 참여하셨어요. 한 계정당 한 번만 참여할 수 있어요.';
      elSubmit.disabled = false;
      return;
    }

    console.error(err);
    state.locked = false;
    goTo('message');
    elMessageError.textContent =
      '제출에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.';
    elSubmit.disabled = false;
  }
});

class DuplicateError extends Error {}

/**
 * 결과 화면 또는 대기 화면으로 마무리한다.
 * @param {object} profile 내 프로필
 * @param {object|null} partner 매칭된 상대
 */
function finish(profile, partner) {
  save(KEY.outcome, { profile, partner });
  showOutcome(profile, partner);
}

function showOutcome(profile, partner) {
  state.locked = true;

  if (partner) {
    $('my-mbti').textContent = profile.mbti;
    $('match-score').textContent =
      typeof partner.compatibility === 'number'
        ? `궁합 ${partner.compatibility}%`
        : '궁합 --%';
    $('partner-name').textContent = partner.nickname;
    $('partner-handle').textContent = '@' + partner.instagram;
    $('partner-message').textContent =
      partner.message && partner.message.trim()
        ? partner.message
        : '(남긴 한마디가 없어요)';
    goTo('result');
  } else {
    $('my-mbti-waiting').textContent = profile.mbti;
    $('waiting-prefs').textContent = profile.preferredGrades
      .map((g) => `${g}학년`)
      .join(' · ');
    goTo('waiting');
  }
}

/* ---------------------------------------------------------------------
 * 인스타 ID 복사
 * ------------------------------------------------------------------- */

$('btn-copy').addEventListener('click', async () => {
  const handle = $('partner-handle').textContent.replace(/^@/, '');
  const btn = $('btn-copy');

  const done = () => {
    btn.textContent = '복사됨';
    btn.classList.add('is-done');
    setTimeout(() => {
      btn.textContent = '복사';
      btn.classList.remove('is-done');
    }, 1600);
  };

  try {
    await navigator.clipboard.writeText(handle);
    done();
  } catch {
    // clipboard API는 https가 아니거나 구형 모바일 브라우저에서 막힌다.
    // 숨은 textarea + execCommand 로 대체한다.
    const ta = document.createElement('textarea');
    ta.value = handle;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } catch {
      btn.textContent = '복사 실패';
    }
    ta.remove();
  }
});

/* ---------------------------------------------------------------------
 * 다음 사람 차례 — 처음부터 다시
 * ---------------------------------------------------------------------
 * 부스에서는 폰 한 대를 여러 명이 돌려 쓴다. 저장해둔 진행 상태를 전부
 * 지우고 새로고침해서 완전히 깨끗한 상태로 되돌린다.
 *
 * 문항 세트(KEY.questions)까지 지워야 다음 사람이 새로 뽑힌 질문을 받는다.
 *
 * 주의: 이건 이 폰의 화면만 초기화한다. 이미 제출된 참가자 문서는 서버에
 * 그대로 남는다 (규칙상 참가자는 자기 응답을 지울 수 없다). 그래서 다음
 * 사람은 반드시 **다른 인스타 ID**로 참여해야 한다 — 같은 ID면 중복
 * 참여로 막힌다.
 * ------------------------------------------------------------------- */

function restart() {
  const ok = confirm(
    '처음 화면으로 돌아갈까요?\n\n' +
      '지금 화면에 뜬 상대 정보는 다시 볼 수 없어요.\n' +
      '다음 사람은 다른 인스타 ID로 참여해야 해요.'
  );
  if (!ok) return;

  try {
    localStorage.removeItem(KEY.questions);
    localStorage.removeItem(KEY.draft);
    localStorage.removeItem(KEY.outcome);
  } catch {
    /* 저장소를 못 건드려도 아래 새로고침으로 화면은 초기화된다 */
  }

  location.reload();
}

document.querySelectorAll('[data-restart]').forEach((btn) => {
  btn.addEventListener('click', restart);
});

/* ---------------------------------------------------------------------
 * 임시 저장 / 복구
 * ------------------------------------------------------------------- */

function saveDraft() {
  save(KEY.draft, {
    nickname: state.nickname,
    instagram: state.instagram,
    gender: state.gender,
    grade: state.grade,
    preferredGrades: state.preferredGrades,
    answers: state.answers,
    message: state.message,
  });
}

function restoreDraft() {
  const d = load(KEY.draft);
  if (!d) return;

  Object.assign(state, {
    nickname: d.nickname || '',
    instagram: d.instagram || '',
    gender: d.gender ?? null,
    grade: d.grade ?? null,
    preferredGrades: Array.isArray(d.preferredGrades) ? d.preferredGrades : [],
    answers: d.answers || {},
    message: d.message || '',
  });

  elNickname.value = state.nickname;
  elInstagram.value = state.instagram;
  elMessage.value = state.message;

  const mark = (container, isOn) => {
    [...container.children].forEach((c) =>
      c.setAttribute('aria-pressed', String(isOn(c.dataset.value)))
    );
  };
  mark($('choices-gender'), (v) => v === state.gender);
  mark($('choices-grade'), (v) => Number(v) === state.grade);
  mark($('choices-pref'), (v) => state.preferredGrades.includes(Number(v)));

  validateProfile();
  updateCounter();
}

/* ---------------------------------------------------------------------
 * 시작
 * ------------------------------------------------------------------- */

$('btn-start').addEventListener('click', () => goTo('profile'));

function boot() {
  // 설정을 안 채우고 올린 경우를 눈에 띄게 알려준다
  if (CONFIG.firebase.projectId === 'YOUR_PROJECT_ID') {
    console.error(
      '[설정] js/config.js 의 firebase 값을 실제 프로젝트 설정으로 바꿔야 합니다. SETUP.md 참고.'
    );
  }

  restoreDraft();

  // 이미 제출을 끝낸 사람이면 결과 화면으로 바로 보낸다.
  // 새로고침으로 설문을 다시 하는 걸 막는 역할도 한다.
  const outcome = load(KEY.outcome);
  if (outcome && outcome.profile) {
    history.replaceState({ step: 'result' }, '');
    showOutcome(outcome.profile, outcome.partner);
    return;
  }

  history.replaceState({ step: 'start' }, '');
  render();
}

boot();
