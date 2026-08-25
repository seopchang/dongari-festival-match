/* =====================================================================
 *  동물상
 * =====================================================================
 *  사진을 안 넣은 참가자용 아바타. 닉네임 첫 글자만 띄우면 허전해서
 *  직접 고르게 했다.
 *
 *  그림은 전부 인라인 SVG다. 외부 이미지 파일을 쓰면 정적 호스팅에
 *  파일이 늘고 로딩도 한 번 더 타는데, 이 정도 도형은 SVG로 그리는 게
 *  가볍고 어떤 화면 크기에서도 안 깨진다.
 *
 *  viewBox 는 전부 0 0 64 64 로 맞춰 뒀다. 쓰는 쪽에서 크기를 CSS로만
 *  정하면 된다.
 * =====================================================================
 */

/** 얼굴 바탕이 되는 원. 동물마다 색만 바꿔 쓴다. */
const face = (c) => `<circle cx="32" cy="35" r="19" fill="${c}"/>`;

/** 눈 두 개 (기본 위치) */
const eyes = (c = '#3A2A1E', y = 32) =>
  `<circle cx="25" cy="${y}" r="2.6" fill="${c}"/>` +
  `<circle cx="39" cy="${y}" r="2.6" fill="${c}"/>`;

/** 코 + 입 */
const snout = (c = '#3A2A1E', y = 40) =>
  `<ellipse cx="32" cy="${y}" rx="3.4" ry="2.6" fill="${c}"/>` +
  `<path d="M32 ${y + 2.6}v3M32 ${y + 5.6}c-2.4 0-4-1.4-4-1.4M32 ${y + 5.6}c2.4 0 4-1.4 4-1.4" ` +
  `stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

export const ANIMALS = [
  {
    id: 'dog',
    label: '강아지상',
    svg:
      `<ellipse cx="15" cy="28" rx="7.5" ry="12" fill="#C4884A"/>` +
      `<ellipse cx="49" cy="28" rx="7.5" ry="12" fill="#C4884A"/>` +
      face('#E8B473') +
      eyes() +
      `<ellipse cx="32" cy="41" rx="10" ry="7.5" fill="#F9E3C6"/>` +
      snout(),
  },
  {
    id: 'cat',
    label: '고양이상',
    svg:
      `<path d="M15 32 17 13l14 9z" fill="#9A97A8"/>` +
      `<path d="M49 32 47 13l-14 9z" fill="#9A97A8"/>` +
      face('#B5B2C2') +
      `<path d="M22 32c1.6-2.4 4.4-2.4 6 0-1.6 2.4-4.4 2.4-6 0z" fill="#3A2A1E"/>` +
      `<path d="M36 32c1.6-2.4 4.4-2.4 6 0-1.6 2.4-4.4 2.4-6 0z" fill="#3A2A1E"/>` +
      `<path d="M32 38l-2.6 2.6h5.2z" fill="#E86A8A"/>` +
      `<path d="M32 41v2.6M32 43.6c-2.2 0-3.6-1.2-3.6-1.2M32 43.6c2.2 0 3.6-1.2 3.6-1.2" stroke="#3A2A1E" stroke-width="1.7" fill="none" stroke-linecap="round"/>` +
      `<path d="M10 36h8M10 41h8M54 36h-8M54 41h-8" stroke="#6E6B7C" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  {
    id: 'rabbit',
    label: '토끼상',
    svg:
      `<ellipse cx="24" cy="16" rx="5.5" ry="13" fill="#F2E9EE"/>` +
      `<ellipse cx="40" cy="16" rx="5.5" ry="13" fill="#F2E9EE"/>` +
      `<ellipse cx="24" cy="17" rx="2.6" ry="8.5" fill="#F7C3D3"/>` +
      `<ellipse cx="40" cy="17" rx="2.6" ry="8.5" fill="#F7C3D3"/>` +
      face('#FBF5F8') +
      eyes('#5B4152') +
      `<path d="M32 38l-2.4 2.4h4.8z" fill="#E86A8A"/>` +
      `<path d="M32 40.4v2.4M32 42.8c-2.2 0-3.6-1.2-3.6-1.2M32 42.8c2.2 0 3.6-1.2 3.6-1.2" stroke="#5B4152" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: 'bear',
    label: '곰상',
    svg:
      `<circle cx="16" cy="20" r="8" fill="#8A5F3D"/>` +
      `<circle cx="48" cy="20" r="8" fill="#8A5F3D"/>` +
      `<circle cx="16" cy="20" r="4" fill="#C79267"/>` +
      `<circle cx="48" cy="20" r="4" fill="#C79267"/>` +
      face('#A3714A') +
      eyes('#3A2417') +
      `<ellipse cx="32" cy="42" rx="9.5" ry="7" fill="#E0BC97"/>` +
      snout('#3A2417', 40),
  },
  {
    id: 'fox',
    label: '여우상',
    svg:
      `<path d="M12 30 16 11l14 10z" fill="#D9622B"/>` +
      `<path d="M52 30 48 11 34 21z" fill="#D9622B"/>` +
      face('#EE8A46') +
      `<path d="M32 24c9 0 15 6 15 13 0 6-7 12-15 12s-15-6-15-12c0-7 6-13 15-13z" fill="#FBEEE2"/>` +
      eyes('#4A2A12', 33) +
      `<path d="M32 39l-2.6 2.6h5.2z" fill="#3A2417"/>` +
      `<path d="M32 41.6v2.6M32 44.2c-2.2 0-3.6-1.2-3.6-1.2M32 44.2c2.2 0 3.6-1.2 3.6-1.2" stroke="#3A2417" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: 'deer',
    label: '사슴상',
    svg:
      `<path d="M22 22 18 10M18 10l-5 3M18 10l1-6M42 22l4-12M46 10l5 3M46 10l-1-6" stroke="#8A6034" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="17" cy="30" rx="5.5" ry="8" fill="#B98A5A"/>` +
      `<ellipse cx="47" cy="30" rx="5.5" ry="8" fill="#B98A5A"/>` +
      face('#D2A472') +
      eyes('#40291A') +
      `<ellipse cx="32" cy="42" rx="8.5" ry="6.5" fill="#F0DCC2"/>` +
      `<ellipse cx="32" cy="40.5" rx="3.2" ry="2.4" fill="#40291A"/>` +
      `<circle cx="21" cy="41" r="1.6" fill="#F0DCC2"/>` +
      `<circle cx="43" cy="41" r="1.6" fill="#F0DCC2"/>`,
  },
  {
    id: 'dino',
    label: '공룡상',
    svg:
      `<path d="M32 12l4 7h-8zM20 17l4 6-7 1zM44 17l-4 6 7 1z" fill="#3F9E63"/>` +
      face('#5FC183') +
      `<circle cx="25" cy="32" r="4" fill="#FFF"/>` +
      `<circle cx="39" cy="32" r="4" fill="#FFF"/>` +
      `<circle cx="25.8" cy="32" r="2.2" fill="#25452F"/>` +
      `<circle cx="39.8" cy="32" r="2.2" fill="#25452F"/>` +
      `<path d="M23 42c3 4 15 4 18 0" stroke="#25452F" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
      `<circle cx="22" cy="38" r="2" fill="#3F9E63"/>` +
      `<circle cx="42" cy="38" r="2" fill="#3F9E63"/>`,
  },
  {
    id: 'hamster',
    label: '햄스터상',
    svg:
      `<circle cx="17" cy="22" r="6.5" fill="#C79267"/>` +
      `<circle cx="47" cy="22" r="6.5" fill="#C79267"/>` +
      face('#EBC79B') +
      `<ellipse cx="19" cy="40" rx="6" ry="5" fill="#F7DFC4"/>` +
      `<ellipse cx="45" cy="40" rx="6" ry="5" fill="#F7DFC4"/>` +
      eyes('#4A3320') +
      `<path d="M32 38l-2.2 2.2h4.4z" fill="#E86A8A"/>` +
      `<path d="M32 40.2v2.2M32 42.4c-2 0-3.4-1.2-3.4-1.2M32 42.4c2 0 3.4-1.2 3.4-1.2" stroke="#4A3320" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: 'wolf',
    label: '늑대상',
    svg:
      `<path d="M13 31 17 12l13 10z" fill="#5A6472"/>` +
      `<path d="M51 31 47 12 34 22z" fill="#5A6472"/>` +
      face('#78838F') +
      `<path d="M32 25c8 0 13 6 13 12 0 6-6 11-13 11s-13-5-13-11c0-6 5-12 13-12z" fill="#DCE2E8"/>` +
      `<path d="M21 31l6 2M43 31l-6 2" stroke="#3A424C" stroke-width="2.2" stroke-linecap="round"/>` +
      eyes('#3A424C', 34) +
      `<path d="M32 40l-2.6 2.6h5.2z" fill="#2C333B"/>` +
      `<path d="M32 42.6v2.4M32 45c-2.2 0-3.6-1.2-3.6-1.2M32 45c2.2 0 3.6-1.2 3.6-1.2" stroke="#2C333B" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,
  },
];

/**
 * 아무것도 안 고른 사람에게 쓰는 기본 얼굴.
 *
 * ANIMALS 목록에는 일부러 안 넣었다. 이건 "고를 수 있는 동물"이 아니라
 * "안 골랐을 때 들어가는 자리"라서 성격이 다르다. 그래도 닉네임 첫 글자만
 * 덩그러니 띄우는 것보다는 훨씬 나아 보이게 그려 뒀다.
 */
const NEUTRAL = {
  id: 'none',
  label: '',
  svg:
    `<circle cx="32" cy="35" r="19" fill="#F7C9D8"/>` +
    `<circle cx="25" cy="33" r="2.6" fill="#B0708A"/>` +
    `<circle cx="39" cy="33" r="2.6" fill="#B0708A"/>` +
    `<path d="M25 42c3.4 3.4 10.6 3.4 14 0" stroke="#B0708A" stroke-width="2.2" ` +
    `fill="none" stroke-linecap="round"/>`,
};

/** id -> 동물 객체 */
const BY_ID = Object.fromEntries(ANIMALS.map((a) => [a.id, a]));

/**
 * 완성된 <svg> 문자열을 돌려준다.
 *
 * 모르는 id나 빈 값이면 기본 얼굴을 준다. 그래서 부르는 쪽에서 "값이
 * 있나 없나"를 따로 확인할 필요가 없다.
 *
 * 값은 전부 이 파일 안에서 온 상수라 innerHTML 에 넣어도 안전하다.
 * @param {string} [id]
 * @returns {string}
 */
export function animalSvg(id) {
  const a = BY_ID[id] || NEUTRAL;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${a.svg}</svg>`;
}

/** 라벨 (예: '강아지상'). 안 고른 경우엔 빈 문자열. */
export function animalLabel(id) {
  return BY_ID[id] ? BY_ID[id].label : '';
}

/** 고를 수 있는 동물 id 인지 (기본 얼굴은 false) */
export function isAnimalId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(BY_ID, id);
}
