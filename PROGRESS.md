# 진행 상황

마지막 갱신: **2026-08-24**

---

## 지금 어디까지 됐나

### ✅ 끝난 것

**저장소 · 배포**
- GitHub 저장소 생성: https://github.com/seopchang/dongari-festival-match (public)
- GitHub Pages 배포 완료 — `main` 브랜치 `/ (root)`
  - 참가자용: https://seopchang.github.io/dongari-festival-match/
  - 운영진용: https://seopchang.github.io/dongari-festival-match/admin/
  - `main`에 푸시하면 1~2분 뒤 자동 반영된다

**앱 구현**
- 화면 10개 전부 (시작 → 기본정보 → 질문 4개 → 한마디 → 분석 → 결과/대기)
- 축마다 문항 3개 중 1개 랜덤 출제, localStorage 저장 → 새로고침해도 같은 문항
- 제출 전 뒤로가기 허용 / 제출 후 브라우저 뒤로가기까지 차단
- 인스타 ID 중복 참여 확인 (화면2 + 제출 직전, 2중)
- 인스타 ID 복사 버튼 (clipboard API 폴백 포함)
- 운영진 대시보드: 로그인, 참가자·매칭 표, MBTI 분포, CSV 내려받기

**Firebase**
- 프로젝트: `duthegee-eaf1b` (표시 이름은 `dongari-festival-match`)
- Cloud Firestore `(default)` 생성 완료
- 보안 규칙 배포 완료
- Authentication 이메일/비밀번호 사용 설정 완료
- 운영진 계정 생성 완료
- 승인된 도메인에 `seopchang.github.io` 추가 완료

**검증 완료 (Firestore REST API로 실제 확인)**

| 항목 | 결과 |
| --- | --- |
| API 키 유효성 | ✅ 200 |
| `participants` 읽기 | ✅ 허용됨 |
| `matches` 읽기 (비로그인) | ✅ 403 차단 |
| 정상 참가자 문서 쓰기 | ✅ 통과 |
| 학년 9 (범위 밖) | ✅ 403 차단 |
| 성별 `alien` | ✅ 403 차단 |
| 대문자 인스타 ID | ✅ 403 차단 |
| 임의 필드 `isAdmin` 주입 | ✅ 403 차단 |
| 희망 학년 0개 | ✅ 403 차단 |
| 제출된 응답 수정 | ✅ 403 차단 |
| 제출된 응답 삭제 | ✅ 403 차단 |

---

## ⚠️ 당장 해야 할 것

### 1. 테스트 문서 삭제 (급함)

규칙 검증하느라 실제 참가자 문서를 하나 만들었다. **아직 안 지웠다.**

- Firebase 콘솔 → Firestore → 데이터 탭
- `participants` → **`ZZ_RULE_TEST_DELETE_ME`** → ⋮ → 문서 삭제

**안 지우면 실제 참가자와 매칭된다.** (남 / 1학년 / 희망 2학년 / ESTP 조건이라,
2학년 여자 ESTP가 들어오면 이 가짜 계정이 상대로 뜬다.)

현재 규칙이 클라이언트 삭제를 막고 있어서 콘솔에서만 지울 수 있다.

### 2. 브라우저 실제 테스트 (한 번도 안 해봄)

**여기가 가장 큰 미검증 영역이다.** Firebase 연결과 규칙은 확인했지만,
화면이 실제로 그려지는지·매칭 로직이 도는지는 브라우저로만 알 수 있다.

폰 2대 (또는 폰 + PC 시크릿 창):

1. **1번 기기**: 남 / 1학년 / 희망 **2학년** / 답변 **전부 A** → 제출
   → "아직 운명의 상대가..." 대기 화면이 떠야 정상
2. **2번 기기**: 여 / 2학년 / 희망 **1학년** / 답변 **전부 A**
   → **매칭 성공** 화면에 1번의 닉네임·인스타가 떠야 정상
3. **관리자**: `/admin/` 로그인 → 참가자 2명, 매칭 1건 확인
4. 끝나면 `participants`, `matches` 컬렉션 통째로 삭제

막히면 **F12 콘솔의 빨간 오류를 그대로** 복사해둘 것.

---

## 🚧 얘기하다 만 것 — 관리자 기능 2개

아직 **코드에 손 안 댐.** 다음 세션에서 이어서 하면 된다.

### (1) 정보 리셋

관리자 화면에서 데이터를 초기화하는 기능.

- 전체 초기화 (participants + matches)
- 매칭 기록만 초기화 (참가자는 유지)
- 행별 개별 삭제

### (2) 특정 참가자 제외

문제 있는 참가자를 매칭 대상에서 빼는 기능.
삭제할지, `excluded` 플래그를 두고 매칭 쿼리에서 거를지 결정 필요.
(플래그 방식이면 규칙에 `update` 허용을 열어야 해서 설계 판단이 필요하다.)

### 이걸 하려면 먼저 풀어야 할 보안 문제

현재 규칙은 삭제를 **전부** 막고 있다. 관리자 삭제를 열어야 하는데,
`allow delete: if request.auth != null` (로그인만 하면 허용)로 열면 위험하다.

**이메일/비밀번호 provider가 켜져 있으면 누구나 API로 회원가입할 수 있다.**
아무나 계정 만들고 로그인해서 데이터를 전부 지울 수 있게 된다.

따라서 **운영진 이메일 allowlist**를 규칙에 박는 방식으로 가야 한다:

```
function isAdmin() {
  return request.auth != null
      && request.auth.token.email in ['여기에_운영진_이메일'];
}
```

**다음 세션 시작할 때 운영진 계정 이메일을 알려줘야 한다.**
(Authentication → Users에서 확인 가능)

추가로 Authentication → Settings → 사용자 작업에서
**"만들기(가입) 사용 설정"을 끄는 것**도 검토할 것.

---

## 알려진 한계 (설계상 감수한 것)

`participants` 읽기 권한이 열려 있다. 브라우저에서 매칭을 계산하려면 다른
참가자 문서를 읽어야 하기 때문이다. **프로젝트 ID를 아는 사람은 참가자
인스타 ID를 긁어갈 수 있다.** 무료(Spark) 요금제 + 클라이언트 SDK만으로는
막을 수 없다 (Firestore 규칙은 문서 단위라 특정 필드만 숨기는 게 안 된다).

막으려면 매칭을 Cloud Functions로 옮기고 `allow read`를 `false`로 바꿔야
하며 Blaze(종량제) 요금제가 필요하다.

**시작 화면 문구가 "인스타 ID는 매칭된 상대에게만 공개돼요"인데, 엄밀히는
정확하지 않다.** 문구를 고치든 Functions로 옮기든 결정이 필요하다.

---

## 다음 세션 프롬프트

아래를 그대로 붙여넣으면 이어서 작업할 수 있다.

```
동아리 축제 소개팅 매칭 부스 작업 이어서 할게.

저장소: https://github.com/seopchang/dongari-festival-match
배포: https://seopchang.github.io/dongari-festival-match/
Firebase 프로젝트 ID: duthegee-eaf1b

PROGRESS.md 먼저 읽고 현재 상태 파악해줘.

할 일:
1. 관리자 화면에 정보 리셋 기능 (전체 / 매칭만 / 개별 삭제)
2. 특정 참가자를 매칭에서 제외하는 기능
3. 위 둘을 위해 firestore.rules에 운영진 이메일 allowlist 추가

운영진 계정 이메일: (여기에 적을 것)
```

---

## 참고 문서

- [README.md](README.md) — 구조, 데이터 모델, 매칭 알고리즘, 한계
- [SETUP.md](SETUP.md) — Firebase 설치 절차 (이미 완료했지만 재설치 시 참고)
- [firestore.rules](firestore.rules) — 보안 규칙
- [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) — 원본 디자인 스펙
