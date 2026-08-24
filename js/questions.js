/* =====================================================================
 *  질문 뱅크
 * =====================================================================
 *  축(EI / NS / TF / PJ)마다 3개 버전. 세션 시작 시 축별로 1개씩 랜덤
 *  선택해 총 4문항을 출제한다. 선택 결과는 localStorage에 저장되므로
 *  새로고침해도 같은 문항이 유지된다.
 *
 *  a / b 의 value 가 그대로 MBTI 한 글자가 된다.
 *  최종 유형 = EI + NS + TF + PJ  (예: ENFP)
 * =====================================================================
 */

export const AXES = ['EI', 'NS', 'TF', 'PJ'];

/** 화면 상단에 뜨는 축 배지 라벨 */
export const AXIS_LABEL = {
  EI: 'E / I',
  NS: 'N / S',
  TF: 'T / F',
  PJ: 'P / J',
};

export const QUESTIONS = {
  EI: [
    {
      id: 'EI-1',
      text: '친한 친구 A와 만나기로 했는데, A가 내가 모르는 친구 B도 같이 보자고 했을 때?',
      a: { label: '좋지~ 재밌겠다', value: 'E' },
      b: { label: '아...... 그래??', value: 'I' },
    },
    {
      id: 'EI-2',
      text: '아무 계획 없는 자유로운 하루가 생겼다. 가장 먼저 하고 싶은 건?',
      a: { label: '친구한테 연락해서 같이 뭐 하자고 한다', value: 'E' },
      b: { label: '혼자만의 시간을 즐긴다', value: 'I' },
    },
    {
      id: 'EI-3',
      text: '단톡방에 새로운 사람이 들어왔다. 나는?',
      a: { label: '반갑게 먼저 인사한다', value: 'E' },
      b: { label: '누군가 인사하면 그때 같이 환영한다', value: 'I' },
    },
  ],

  NS: [
    {
      id: 'NS-1',
      text: '샤워할 때 무슨 생각해?',
      a: { label: '생각?? 그냥 샤워하는데...', value: 'S' },
      b: { label: '별의별 생각 다하지...', value: 'N' },
    },
    {
      id: 'NS-2',
      text: '버스 기다리는 10분 동안 주로 뭐 해?',
      a: { label: '폰 보거나 주변 구경한다', value: 'S' },
      b: { label: '머릿속으로 이런저런 생각을 한다', value: 'N' },
    },
    {
      id: 'NS-3',
      text: '새로운 일을 시작할 때 나는?',
      a: { label: '일단 해보면서 파악한다', value: 'S' },
      b: { label: '큰 그림부터 먼저 그려본다', value: 'N' },
    },
  ],

  TF: [
    {
      id: 'TF-1',
      text: '미용실에서 파마하고 온 친구가 "나 기분이 안 좋아서 머리 새로 했어" — 머릿속에 먼저 떠오른 건?',
      a: { label: '파마??', value: 'T' },
      b: { label: '기분??', value: 'F' },
    },
    {
      id: 'TF-2',
      text: '친구 발표가 끝났는데 아쉬운 부분이 보인다. 나는?',
      a: { label: '잘한 점 말하고 개선점도 솔직히 말한다', value: 'T' },
      b: { label: '일단 수고했다고 공감부터 한다', value: 'F' },
    },
    {
      id: 'TF-3',
      text: '연인이 "나 오늘 기분 별로야"라고 했을 때 첫 반응은?',
      a: { label: '왜? 무슨 일 있었어?', value: 'T' },
      b: { label: '많이 힘들었겠다', value: 'F' },
    },
  ],

  PJ: [
    {
      id: 'PJ-1',
      text: '해외여행 중 예약한 맛집이 오늘 문을 닫았다. 어떤 생각이 드나?',
      a: { label: '다른 곳 찾아봐야겠다', value: 'P' },
      b: { label: '다른 계획이 있다', value: 'J' },
    },
    {
      id: 'PJ-2',
      text: '과제 마감이 일주일 남았다. 나는?',
      a: { label: '마감 며칠 전부터 집중해서 한다', value: 'P' },
      b: { label: '미리미리 조금씩 해놓는다', value: 'J' },
    },
    {
      id: 'PJ-3',
      text: '주말 약속을 잡을 때 나는?',
      a: { label: '그날 분위기에 맞게 즉흥적으로 정하는 게 재밌다', value: 'P' },
      b: { label: '언제 어디서 뭐 할지 미리 딱 정하는 게 편하다', value: 'J' },
    },
  ],
};

/**
 * 축마다 문항 1개씩 뽑아 4문항 세트를 만든다.
 * @returns {Array<{axis: string, question: object}>}
 */
export function drawQuestionSet() {
  return AXES.map((axis) => {
    const pool = QUESTIONS[axis];
    return {
      axis,
      question: pool[Math.floor(Math.random() * pool.length)],
    };
  });
}

/**
 * 저장된 문항 id 목록을 실제 문항 객체로 되살린다.
 * 문항 뱅크가 바뀌어 id를 못 찾으면 null을 돌려주고, 호출한 쪽에서
 * 새로 뽑는다.
 * @param {string[]} ids
 * @returns {Array<{axis: string, question: object}>|null}
 */
export function restoreQuestionSet(ids) {
  if (!Array.isArray(ids) || ids.length !== AXES.length) return null;

  const set = [];
  for (let i = 0; i < AXES.length; i++) {
    const axis = AXES[i];
    const found = QUESTIONS[axis].find((q) => q.id === ids[i]);
    if (!found) return null;
    set.push({ axis, question: found });
  }
  return set;
}

/**
 * 답변 4개를 MBTI 4글자로 조합한다.
 * @param {Array<{axis: string, question: object}>} set 출제된 문항
 * @param {Object<string, 'a'|'b'>} answers 축 => 선택지
 * @returns {string} 예: 'ENFP'
 */
export function buildMbti(set, answers) {
  return set
    .map(({ axis, question }) => question[answers[axis]].value)
    .join('');
}
