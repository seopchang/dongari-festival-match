# Handoff: 동아리 축제 소개팅 매칭 부스 (Festival Matching Booth)

## Overview
QR 코드로 접속하는 모바일 웹. 참가자가 기본 정보 + MBTI 시나리오 질문 4개 + 상대에게 전할 한마디를 작성하면, 응답으로 산출한 MBTI 유형과 희망 조건에 따라 이성 참가자와 매칭해 상대의 닉네임 / 인스타 ID / 한마디를 보여준다. 조건에 맞는 상대가 없으면 대기 화면으로 보낸다. 오프라인 홍보용 A4 포스터도 포함.

**중요:** 이 디자인에는 AI/LLM 요소가 없다. MBTI 판정은 4문항의 결정론적 규칙(각 문항 = 1축)이고, 매칭도 규칙 기반이다.

## About the Design Files
번들의 HTML 파일은 **디자인 레퍼런스**다. 의도한 화면 구성과 동작을 보여주는 프로토타입이며, 그대로 복사해 배포할 프로덕션 코드가 아니다. 대상 코드베이스의 기존 환경(React/Next, Vue, SwiftUI, 네이티브 등)과 기존 패턴·라이브러리로 **다시 구현**하는 것이 목표다. 아직 환경이 없다면 프로젝트에 가장 적합한 프레임워크를 선택해 구현한다.

`축제 소개팅 매칭 부스.dc.html`는 11개 화면을 한 캔버스에 나란히 배치한 **디자인 보드**다. 실제 앱은 화면 하나씩 순차 전환되는 단일 플로우다. 보드 상단의 "질문 다시 뽑기" 버튼과 각 프레임 위의 캡션(`03 · Q1 (E/I) · 버전 2/3`)은 리뷰용 보드 크롬이므로 구현 대상이 아니다.

## Fidelity
**High-fidelity.** 색상, 타이포그래피, 간격, 라운드, 그림자, 카피가 모두 최종안이다. 픽셀 단위로 재현하되, 코드베이스에 디자인 시스템이 있다면 그 토큰에 맞춰 치환한다. 기준 뷰포트는 390 × 844 (iPhone 14 기준), 안전영역 하단 34px.

---

## Design Tokens

### Colors
| 이름 | Hex | 용도 |
| --- | --- | --- |
| pink/600 (primary) | `#FF3E75` | 주 CTA, 강조 텍스트, 포스터 푸터 |
| pink/500 | `#FF5C8A` | 그라데이션 시작, 선택 상태, 강조 보더 |
| coral/400 | `#FF7E6B` | 그라데이션 끝, 히어로 배경 |
| coral/300 | `#FFB39B` | 아바타 그라데이션 |
| pink/100 | `#FFE7EE` | 선택 칩 배경, 번호 배지 |
| pink/50 | `#FFF3F6` | 한마디 인용 박스 |
| pink/border | `#FFD9E3` | 입력·카드 보더 (1.5px) |
| cream (bg) | `#FFF7F4` | 기본 화면 배경 |
| violet/900 (accent) | `#2B1B4A` | 텍스트 기본, 포인트 버튼, 배지 |
| violet/600 | `#5B3E8C` | 보조 버튼 텍스트, MBTI 배지 텍스트 |
| violet/100 | `#EFE7F7` | MBTI/축 배지 배경 |
| mute/500 | `#8E7CA6` | 보조 텍스트 |
| mute/400 | `#A594B8` | 캡션 |
| mute/300 | `#C4B4D2`, `#B9A9C9` | 비활성 텍스트, 상태바 |
| line | `#E2D3EC`, `#EADFF2`, `#F2E4EA` | 보더/구분선/트랙 |
| waiting bg | `#FBF6FA` | 대기 화면 배경 |
| board bg | `#F3EDF7` | 리뷰 보드 배경(앱에서 미사용) |

Gradients
- 시작 화면: `linear-gradient(180deg,#FF5C8A 0%,#FF7E6B 100%)`
- 분석 중: `radial-gradient(120% 80% at 50% 0%,#FF7E6B 0%,#FF3E75 55%,#2B1B4A 100%)`
- 결과 헤더: `linear-gradient(160deg,#FF5C8A,#FF3E75)`
- 진행 바: `linear-gradient(90deg,#FF5C8A,#FF8A5C)`
- 아바타: `linear-gradient(140deg,#FFB39B,#FF5C8A)`

### Typography
- 한글 본문/제목: **Pretendard** (`https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css`), weight 400/700/800
- 숫자·MBTI·라틴 라벨: **Outfit** (Google Fonts), weight 500/700/800
- 스케일: 히어로 46px/800/-0.03em · 포스터 헤드라인 92px/800/-0.045em · 화면 제목 26–32px/800/-0.02em · 질문 25–26px/800, line-height 1.42–1.44 · 옵션 라벨 19px/700 · 본문 15–17px/1.6–1.7 · 필드 라벨 14px/700 · 캡션 12–13px
- 긴 문장에는 `text-wrap: pretty`

### Radius / Shadow / Spacing
- 폰 프레임 44px · 카드 24–26px · 버튼 20–22px · 입력 18px · 배지 8–12px · 칩 999px
- 그림자: 프레임 `0 26px 60px rgba(255,92,138,.18~.28)` · 주 CTA `0 12px 26px rgba(255,62,117,.32)` · 카드 `0 14px 30px rgba(255,92,138,.14)` · 옵션 `0 8px 18px rgba(255,92,138,.08)`
- 화면 좌우 패딩 26px (시작/분석 34px), 하단 34px, 섹션 간 gap 18–26px
- 터치 타깃: 주 CTA 64px, 보조 56–62px, 옵션 카드 min-height 88px, 학년 칩 58px

### Keyframes
```css
@keyframes beat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.14)} 28%{transform:scale(1)} 42%{transform:scale(1.09)} }
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
```
`beat` 1.3–1.7s ease-in-out infinite (하트), `float` 3–3.6s (달·안내 문구).

---

## Screens / Views

### 01 시작 (`/`)
- 배경 핑크→코랄 그라데이션, 흰 텍스트. 상단 반투명 pill "2026 동아리 축제 특별 부스" (`rgba(255,255,255,.22)`, radius 999, 8/14 패딩).
- 헤드라인 "두근두근 / 소개팅 매칭" 46px/800.
- 서브: "질문 4개만 답하면 끝. / MBTI 유형을 분석해서 지금 이 부스에 / 있는 잘 맞는 사람을 찾아줄게요."
- 💗 64px `beat` + 라이브 카운터: "지금 부스에 128명 참여 중 / 오늘 성사된 매칭 41건" → 실데이터 필요(참가자 수, 성사 매칭 수).
- CTA: 흰 배경 / `#FF3E75` 텍스트 / 64px / radius 22.
- 푸터 캡션: "소요시간 약 1분 · 인스타 ID는 매칭된 상대에게만 공개돼요".

### 02 기본 정보 (`/profile`)
- 뒤로 버튼(38px, `#FFE7EE` 배경) + 제목 "기본 정보" 20px/800.
- 필드: 닉네임(text) / 인스타 ID(앞에 `@` 프리픽스, 소문자·영숫자·`._`) — 높이 58px, 흰 배경, 1.5px `#FFD9E3`, radius 18.
- 성별: 2열 그리드, 62px, 선택 시 `#FF5C8A` 배경 + 흰 텍스트 + 그림자, 미선택은 흰 배경 + 보더. 단일 선택 필수.
- 내 학년: 3열, 58px, 단일 선택, 선택 시 `#2B1B4A` 배경 + 흰 텍스트. 라벨 옆 힌트 "하나만 선택".
- 매칭 희망 학년: 3열, 58px, **다중 선택**, 선택 시 `#FFE7EE` 배경 + `#FF5C8A` 보더 + `✓` 접두. 힌트 "여러 개 선택 가능". 최소 1개 필수.
- 하단 CTA "다음" (`#FF3E75`, 64px). 미완성 시 비활성.

### 03–06 시나리오 질문 (`/q/1` … `/q/4`)
- 상단: "시나리오 질문" 14px/700 `#8E7CA6` + 우측 진행 `n/4` (Outfit 16px/800, `n`은 `#FF3E75`, `/4`는 `#E2D3EC`), 아래 8px 트랙(`#F2E4EA`) + 25/50/75/100% 채움(핑크→코랄).
- 축 배지: `E / I`, `N / S`, `T / F`, `P / J` — `#EFE7F7` 배경 / `#5B3E8C` / Outfit 12px/800 / letter-spacing .1em / radius 8.
- 질문 텍스트 25–26px/800.
- 보기 2개: 카드 min-height 88px, 흰 배경 + 1.5px `#FFD9E3`, radius 24, 좌측 34px 정사각 배지 A(`#FFE7EE`/`#FF3E75`) · B(`#EFE7F7`/`#5B3E8C`), 라벨 19px/700. 탭하면 즉시 다음 질문으로 진행(별도 다음 버튼 없음).
- **질문 랜덤화:** 각 축마다 3개 버전 풀에서 세션 시작 시 1개를 랜덤 선택한다. 전체 문항은 아래 "Question Bank" 참고. 선택된 문항 id를 응답과 함께 저장해야 통계가 가능하다.

### 07 한마디 (`/message`)
- 💌 52px, 제목 "매칭될 상대에게 전할 한마디를 남겨봐!" 28px/800, 서브 "첫인상은 여기서 정해져요. 부담 없이 한 줄이면 충분!"
- 입력 박스: min-height 170px, 흰 배경 + 1.5px `#FF5C8A`(포커스 강조), radius 24, 패딩 20, 본문 17px/1.6. 우하단 카운터 `38 / 60` (Outfit 13px/700 `#C4B4D2`).
- 최대 60자. CTA "제출하기". 캡션 "연락처·계정 정보는 한마디에 적지 말아주세요" — 서버에서도 전화번호/카카오ID 패턴 필터 권장.

### 08 분석 중 (`/analyzing`)
- 라디얼 그라데이션 배경, 170px 원형 링 2겹(실선 `rgba(255,255,255,.28)`, inset 22 점선 `.4`) 중앙 💗 76px `beat`.
- 제목 "너의 MBTI 유형을 / 분석하고 있어" 27px/800 흰색.
- 체크 리스트: ✓ 답변 4개 분석 완료 / ✓ 성향 유형 추출 / ♡ 부스 안에서 잘 맞는 사람 찾는 중...
- 하단 6px 진행 바(72% 상태) + 플로팅 캡션 "두근두근... 잠시만 기다려줘!".
- 실제 처리 시간이 짧아도 **최소 2–2.5초** 유지(연출 목적). 완료 시 09 또는 10으로 라우팅.

### 09 매칭 성공 (`/result`)
- 헤더(핑크 그라데이션): 💞 + "매칭 성공!" 32px/800, 내 MBTI 배지(흰 배경 / `#FF3E75` / Outfit 18px/800 / letter-spacing .08em) + "너는 **분위기를 띄우는 스파클러**" — 유형별 한 줄 별칭 16종 필요.
- 상대 카드: 흰 배경 + 1.5px `#FFD9E3`, radius 26, 패딩 24.
  - 상단 행: "운명의 상대" 13px/800 `#FF3E75` / 우측 `INFJ · 궁합 92%` 배지.
  - 60px 아바타(그라데이션 + 이모지) + 닉네임 22px/800 + 인스타 `@handle` 15px/700 `#FF3E75`.
  - 한마디 박스: `#FFF3F6`, radius 18, 라벨 "상대가 남긴 한마디" 12px/800 `#B58AA8`, 인용문 16px/1.65.
  - 칩: 학년, "지금 부스에 있음".
- 안내: 🎁 "서로 인스타 맞팔하고 둘이 함께 부스로 오면 / 커플 상품을 따로 드려요!"
- CTA: `인스타 DM 보내기` → `https://instagram.com/<handle>` 새 창(모바일에서 앱 인터셉트). 앱 강제가 필요하면 `instagram://user?username=<handle>` 후 웹 폴백.
- 보조 버튼 `다른 상대도 볼래요 (1회 남음)` → **세션당 재추천 1회만**. 사용 후 라벨 "재추천 기회를 모두 사용했어요", 스타일 `#F6F1F9` 배경 / `#EADFF2` 보더 / `#B9A9C9` 텍스트 / cursor default.

### 10 매칭 대기 (`/waiting`)
- 배경 `#FBF6FA`. 🌙 62px `float`.
- 제목 "아직 운명의 상대가 / 나타나지 않았어요..." 29px/800, 서브 "조건에 맞는 사람이 부스에 도착하면 / 바로 알려줄게요. 설문은 저장됐어요!"
- 요약 카드(흰 배경 + 1.5px `#EADFF2`, radius 24): 내 유형(배지) / 대기 순번(7번째) / 희망 학년(1학년 · 2학년), 구분선 `#F1E8F6`.
- CTA `매칭되면 알림 받기` (`#2B1B4A`, 64px) — 웹 푸시 또는 폴링/SSE. 보조 `희망 학년 다시 고르기` → 02로 이동해 조건만 수정 후 재매칭.

### 11 포스터 (A4 세로, 794 × 1123 @96dpi)
- 배경 `#FFF7F4`, 우상단 `#FFD9E3` 라디얼 글로우(520px, top -160 / right -160).
- 상단: `#2B1B4A` pill "2026 동아리 축제" + 우측 `BOOTH NO. 07` (Outfit 16px/700, letter-spacing .14em, `#B58AA8`).
- 헤드라인 92px/800: "두근두근 / **소개팅 매칭**"(2행 `#FF3E75`) + 💗 78px.
- 리드 26px/1.6 `#5B4A6B`: "질문 4개, 1분이면 끝. / MBTI 유형을 분석해서 지금 이 부스에 있는 / 가장 잘 맞는 사람을 찾아줍니다."
- 3단계 안내(40px 번호 배지 + 21px/700): 1 QR 코드를 찍는다 / 2 설문 4문항 + 한마디 작성 / 3 매칭된 상대의 인스타를 받는다.
- QR 슬롯: 230 × 230, radius 26, 흰 배경 + 2.5px dashed `#FF5C8A`, 캡션 "여기를 찍으면 바로 시작". 실제 QR 이미지로 교체.
- 푸터 바 `#FF3E75`: "운영 8/24(월) 12:00 – 18:00 · 학생회관 1층 로비" 22px/800 + "참가비 무료 · 인스타 ID는 매칭된 상대에게만 공개됩니다" + 우측 `@festival_match`. 날짜·장소·핸들은 운영 정보로 교체.
- 인쇄: CMYK 변환 시 `#FF3E75` 채도 저하 주의. 출력 여백 없음(full bleed 아님, 내부 패딩 74px).

---

## Question Bank (구현 데이터)

각 축(EI / NS / TF / PJ)마다 3개 버전. 세션 시작 시 축별로 1개를 랜덤 선택 → 총 4문항. `optionA` / `optionB` 순서는 화면 표시 순서와 동일하며, 각 보기에 매핑되는 축 값을 함께 적었다.

**EI**
1. `친한 친구 A와 만나기로 했는데, A가 내가 모르는 친구 B도 같이 보자고 했을 때?` → A `좋지~ 재밌겠다` (E) / B `아...... 그래??` (I)
2. `아무 계획 없는 자유로운 하루가 생겼다. 가장 먼저 하고 싶은 건?` → A `친구한테 연락해서 같이 뭐 하자고 한다` (E) / B `혼자만의 시간을 즐긴다` (I)
3. `단톡방에 새로운 사람이 들어왔다. 나는?` → A `반갑게 먼저 인사한다` (E) / B `누군가 인사하면 그때 같이 환영한다` (I)

**NS**
1. `샤워할 때 무슨 생각해?` → A `생각?? 그냥 샤워하는데...` (S) / B `별의별 생각 다하지...` (N)
2. `버스 기다리는 10분 동안 주로 뭐 해?` → A `폰 보거나 주변 구경한다` (S) / B `머릿속으로 이런저런 생각을 한다` (N)
3. `새로운 일을 시작할 때 나는?` → A `일단 해보면서 파악한다` (S) / B `큰 그림부터 먼저 그려본다` (N)

**TF**
1. `미용실에서 파마하고 온 친구가 “나 기분이 안 좋아서 머리 새로 했어”라고 했을 때, 머릿속에 먼저 떠오른 건?` → A `파마??` (T) / B `기분??` (F)
2. `친구의 발표가 끝났는데 아쉬운 부분이 보인다. 나는?` → A `잘한 점 말하고 개선점도 솔직히 말한다` (T) / B `일단 수고했다고 공감부터 한다` (F)
3. `연인이 “나 오늘 기분 별로야”라고 했을 때 첫 반응은?` → A `왜? 무슨 일 있었어?` (T) / B `많이 힘들었겠다` (F)

**PJ**
1. `해외여행 중 예약한 맛집이 오늘 문을 닫았다. 어떤 생각이 드나?` → A `다른 곳 찾아봐야겠다` (P) / B `다른 계획이 있다` (J)
2. `과제 마감이 일주일 남았다. 나는?` → A `미리미리 조금씩 해놓는다` (J) / B `마감 며칠 전부터 집중해서 한다` (P)
3. `주말 약속을 잡을 때 나는?` → A `언제 어디서 뭐 할지 미리 딱 정하는 게 편하다` (J) / B `그날 분위기에 맞게 즉흥적으로 정하는 게 재밌다` (P)

MBTI 문자열 조립 순서: `EI + NS + TF + PJ` (예: `ENFP`).

---

## Data Model (제안 스키마)

관계형 DB 기준. 이름은 코드베이스 컨벤션에 맞게 조정.

```sql
-- 부스 운영 회차 (여러 날/여러 부스 대응)
event(
  id            pk,
  name          text,
  starts_at     timestamptz,
  ends_at       timestamptz,
  is_active     boolean
)

-- 문항 은행 (위 Question Bank를 시드)
question(
  id            pk,
  axis          enum('EI','NS','TF','PJ'),
  version       int,                  -- 1..3
  body          text,
  option_a      text,
  option_a_value char(1),             -- 'E' | 'S' | 'T' | 'P' ...
  option_b      text,
  option_b_value char(1),
  is_active     boolean,
  unique(axis, version)
)

participant(
  id            pk,
  event_id      fk -> event,
  nickname      text not null,
  instagram     text not null,        -- '@' 없이 저장, lower-case
  gender        enum('male','female') not null,
  grade         int not null check (grade between 1 and 3),
  message       text,                 -- 한마디, <= 60자
  mbti          char(4),              -- 설문 완료 시 계산 저장
  status        enum('surveying','waiting','matched','left') default 'surveying',
  reroll_used   boolean default false,-- '다른 상대도 볼래요' 1회 제한
  push_token    text,                 -- 대기 화면 알림 수신용 (nullable)
  session_token text unique,          -- 쿠키/로컬스토리지로 복귀 식별
  created_at    timestamptz,
  updated_at    timestamptz,
  unique(event_id, instagram)         -- 중복 참가 방지
)

-- 매칭 희망 학년 (다중 선택)
participant_grade_pref(
  participant_id fk -> participant,
  grade          int check (grade between 1 and 3),
  primary key(participant_id, grade)
)

-- 개별 응답 (문항 랜덤화 통계용으로 question_id 보존)
response(
  id             pk,
  participant_id fk -> participant,
  question_id    fk -> question,
  choice         char(1) check (choice in ('A','B')),
  axis_value     char(1),             -- 계산된 축 값
  answered_at    timestamptz,
  unique(participant_id, question_id)
)

-- 매칭 결과 (양방향 1건으로 저장)
match(
  id             pk,
  event_id       fk -> event,
  participant_a  fk -> participant,   -- 항상 id가 작은 쪽
  participant_b  fk -> participant,
  compatibility  int,                 -- 0..100
  status         enum('active','superseded') default 'active',
  created_at     timestamptz,
  unique(participant_a, participant_b)
)

-- 맞팔 인증 후 커플 상품 지급 기록 (스태프 조작)
prize_claim(
  id             pk,
  match_id       fk -> match,
  claimed_at     timestamptz,
  staff_note     text
)
```

인덱스: `participant(event_id, status, gender)`, `participant_grade_pref(grade)`, `match(event_id, status)`.

### 매칭 규칙 (구현 사양)
1. 후보 = 같은 `event`, `status = 'waiting'`, 성별이 나와 다름, 아직 나와 `match` 없음.
2. 학년 조건은 **상호** 충족: 상대 학년 ∈ 내 희망 학년 **AND** 내 학년 ∈ 상대 희망 학년.
3. 궁합 점수: 4축 비교로 산출(예: 상보적 축 가중치 규칙) → 최고 점수 순, 동점이면 먼저 대기한 순.
4. 후보 없음 → `status = 'waiting'`, 대기 순번 = 같은 조건 대기열 내 `created_at` 순위 → 화면 10.
5. 매칭 성립 시 두 참가자 모두 `matched`, `match` 1행 생성.
6. 재추천: `reroll_used = false`일 때만 1회. 기존 `match`를 `superseded`로 바꾸고 다음 후보를 배정, `reroll_used = true`. 후보가 없으면 대기 화면으로.
7. 동시성: 매칭 배정은 트랜잭션 + 행 잠금으로 중복 배정 방지.

### 개인정보
- 인스타 ID는 **매칭된 상대에게만** 노출. 그 외 응답/집계 API에 절대 포함하지 않는다.
- 한마디는 서버에서 길이(60자) + 연락처 패턴 필터링.
- 행사 종료 후 일괄 삭제(예: D+7) 정책과 시작 화면 하단 고지 문구를 맞춘다.

---

## Interactions & Behavior
- 라우팅: 시작 → 기본 정보 → Q1..Q4(보기 탭 시 즉시 다음) → 한마디 → 분석 중 → (결과 | 대기).
- 세션 복귀: `session_token`으로 진행 위치 복원(설문 도중 이탈 대비).
- 버튼 상태: 필수값 미충족 시 CTA 비활성(불투명도 유지, 텍스트 변경 없음).
- 애니메이션: 하트 `beat`, 대기 화면 달 `float`, 진행 바 width 트랜지션 300ms ease-out. 화면 전환은 좌→우 슬라이드 250ms 권장.
- 분석 화면 최소 노출 2–2.5초.
- 결과 화면 DM 링크는 새 탭/외부 앱, 앱 복귀 시 상태 유지.
- 대기 화면은 폴링(10–15초) 또는 푸시로 매칭 발생 감지 → 결과 화면으로 자동 전환.
- 에러: 네트워크 실패 시 동일 톤의 인라인 메시지(핑크 카드) + 재시도 버튼. 중복 인스타 ID 입력 시 필드 하단 경고.

## State Management
클라이언트 세션 상태: `nickname`, `instagram`, `gender`, `grade`, `gradePrefs[]`, `answers[{questionId, choice}]`, `selectedQuestionIds[4]`, `message`, `mbti`, `matchResult`, `rerollUsed`, `waitingPosition`. 서버 권위 데이터는 `participant` / `response` / `match`.

## Assets
- 폰트: Pretendard(jsDelivr CDN), Outfit(Google Fonts). 프로덕션에서는 self-host 권장.
- 이모지(💗 💞 💌 🌙 🎁 🐱 🎞️)는 시스템 이모지 사용. 브랜드 일러스트로 교체 가능.
- 이미지 에셋 없음. 포스터 QR은 `230 × 230` 실제 QR 이미지로 교체 필요.
- 아바타 이모지는 참가자가 고르는 값이 아니라 데모용 장식 — 실제로는 닉네임 이니셜 또는 고정 세트에서 결정론적으로 배정.

## Files
- `축제 소개팅 매칭 부스.dc.html` — 11개 화면 디자인 보드(마크업 + 인라인 스타일 + 질문 랜덤화·재추천 로직).
- `support.js` — 프로토타입 런타임(디자인 보드 렌더링용, 구현 대상 아님).
