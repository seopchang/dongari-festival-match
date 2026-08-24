# 설치 가이드

처음부터 끝까지 따라 하면 동작합니다. 대략 20분 걸립니다.

---

## 1. Firebase 프로젝트 만들기

1. https://console.firebase.google.com 접속 → **프로젝트 추가**
2. 프로젝트 이름 입력 (예: `dongari-festival-match`)
3. Google 애널리틱스는 **사용 안 함**으로 둬도 됩니다
4. 생성 완료까지 기다립니다

---

## 2. Firestore 만들기

1. 왼쪽 메뉴 → **빌드 → Firestore Database** → **데이터베이스 만들기**
2. 위치는 **asia-northeast3 (서울)** 를 고르세요. 한국에서 접속하면 가장 빠릅니다.
3. 시작 모드는 **프로덕션 모드**로 시작합니다
   (테스트 모드는 30일 뒤 전부 막히고, 그 전까지는 아무나 데이터를 지울 수 있습니다)

컬렉션은 미리 만들 필요 없습니다. 첫 참가자가 제출하면 자동으로 생깁니다.

---

## 3. 보안 규칙 배포 — **이 단계를 건너뛰면 안 됩니다**

1. Firestore Database → **규칙** 탭
2. 이 저장소의 [`firestore.rules`](firestore.rules) 내용을 **통째로 복사해 붙여넣기**
3. **게시** 클릭

규칙이 하는 일:

- 참가자 문서는 **만들기만** 가능 — 아무도 수정·삭제 못 합니다
- 매칭 기록은 **로그인한 운영진만** 읽을 수 있습니다
- 문서 모양을 검사해서 이상한 데이터가 들어오는 걸 막습니다

> ### ⚠️ 알고 넘어가야 할 한계
>
> `participants` 컬렉션의 **읽기는 열려 있습니다.** 브라우저에서 매칭을
> 계산하려면 다른 참가자 문서를 읽어야 하기 때문입니다.
>
> 즉 **프로젝트 ID를 아는 사람은 참가자들의 인스타 ID를 긁어갈 수 있습니다.**
> 무료(Spark) 요금제에서 클라이언트 SDK만으로는 막을 방법이 없습니다.
> Firestore 규칙은 문서 단위라서 "이 필드만 숨기기"가 되지 않습니다.
>
> 하루짜리 축제 부스라면 대체로 감수하는 위험입니다. 참가자들이 매칭을
> 목적으로 스스로 공개하는 정보이기도 하고요. 다만 **참가자에게 이 사실을
> 알리지 않은 채 "매칭된 상대에게만 공개된다"고 안내하면 안 됩니다.**
>
> 정말 막아야 한다면 매칭 로직을 Cloud Functions로 옮기고 규칙의
> `allow read`를 `false`로 바꿔야 합니다. Functions는 **Blaze(종량제)
> 요금제**가 필요합니다 — 무료 할당량이 넉넉해서 이 규모면 실제 청구액은
> 0원에 가깝지만, 신용카드 등록이 필요합니다.

---

## 4. 웹 앱 등록 + 설정값 복사

1. 프로젝트 설정(⚙️) → **일반** 탭 → 아래로 스크롤 → **내 앱**
2. **웹(`</>`)** 아이콘 클릭
3. 앱 닉네임 입력 → **앱 등록** (Firebase Hosting 체크는 나중에 정해도 됩니다)
4. 나오는 `firebaseConfig` 객체를 복사
5. [`js/config.js`](js/config.js)의 `firebase:` 부분에 붙여넣기

```js
firebase: {
  apiKey: 'AIzaSy...',
  authDomain: 'dongari-festival-match.firebaseapp.com',
  projectId: 'dongari-festival-match',
  storageBucket: 'dongari-festival-match.firebasestorage.app',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abc123',
},
```

> **이 값들은 비밀이 아닙니다.** `apiKey`는 비밀번호가 아니라 프로젝트를
> 식별하는 공개 값이고, 구글 공식 문서도 클라이언트 코드에 그대로 넣으라고
> 안내합니다. 저장소에 커밋해도 됩니다. 실제 보안은 3단계의 규칙이 합니다.

---

## 5. 운영진 계정 만들기 (관리자 사이트용)

1. 왼쪽 메뉴 → **빌드 → Authentication** → **시작하기**
2. **Sign-in method** 탭 → **이메일/비밀번호** → **사용 설정** → 저장
3. **Users** 탭 → **사용자 추가** → 운영진이 쓸 이메일/비밀번호 입력

이 계정으로 `/admin/` 에 로그인합니다. 여러 명이면 여러 개 만드세요.

---

## 6. 배포 — GitHub Pages

이 앱은 빌드 과정이 없는 정적 파일이라 그냥 올리면 됩니다.

1. GitHub 저장소 → **Settings → Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `main` / `/ (root)` → **Save**
4. 1~2분 뒤 `https://<사용자명>.github.io/dongari-festival-match/` 에서 열립니다

관리자 사이트는 `https://<사용자명>.github.io/dongari-festival-match/admin/` 입니다.

### 승인된 도메인 등록

Authentication을 쓰므로 배포 도메인을 허용 목록에 넣어야 로그인이 됩니다.

Authentication → **Settings** → **승인된 도메인** → **도메인 추가** →
`<사용자명>.github.io`

---

## 7. QR 코드 만들기

배포된 주소를 QR로 변환해서 포스터에 넣으면 됩니다.
(예: https://qr.io, https://www.qr-code-generator.com 등 아무거나)

인쇄용 A4 포스터 디자인은 핸드오프 문서
[`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)의 "11 포스터" 항목에 있습니다.

---

## 로컬에서 테스트하기

이 앱은 ES 모듈(`<script type="module">`)을 쓰기 때문에
**`index.html` 파일을 브라우저에 직접 끌어다 놓으면 동작하지 않습니다.**
(`file://` 프로토콜에서는 모듈 로딩이 CORS로 막힙니다.)

로컬 서버를 띄우세요:

```powershell
# Node.js가 깔려 있다면
npx serve .

# 또는 파이썬
python -m http.server 8000
```

그리고 `http://localhost:8000` 으로 접속합니다.

Authentication을 로컬에서 테스트하려면 승인된 도메인에 `localhost`가
있어야 합니다 (기본으로 들어 있습니다).

---

## 행사 당일 체크리스트

- [ ] 보안 규칙이 **게시**되어 있는가 (3단계)
- [ ] `js/config.js`에 실제 Firebase 설정이 들어갔는가
- [ ] 폰 두 대로 실제 제출 → 매칭까지 한 번 돌려봤는가
- [ ] 승인된 도메인에 배포 주소가 들어 있는가
- [ ] 운영진 계정으로 `/admin/` 로그인이 되는가
- [ ] QR 코드가 실제로 찍히는가 (인쇄본으로)
- [ ] 부스 와이파이에서 접속이 되는가

### 행사 끝난 뒤

개인정보(인스타 ID)를 계속 들고 있을 이유가 없습니다.
Firestore 콘솔에서 `participants`, `matches` 컬렉션을 삭제하거나,
Firebase 프로젝트 자체를 삭제하세요.
참가자에게 안내한 보관 기간이 있다면 그에 맞추면 됩니다.

---

## 문제가 생기면

| 증상 | 원인 |
| --- | --- |
| 제출 시 `permission-denied` | 규칙을 게시 안 했거나, 문서 모양이 규칙 검사와 안 맞음 |
| 화면이 하얗게 뜸 | `file://`로 열었을 가능성. 로컬 서버로 여세요 |
| 관리자 로그인 시 `auth/unauthorized-domain` | 승인된 도메인에 배포 주소 추가 (6단계) |
| 관리자에서 매칭 기록이 안 보임 | 로그인이 풀렸거나 규칙 미배포 |
| 콘솔에 `The query requires an index` | 링크를 눌러 색인을 만들면 됩니다 (현재 코드는 필요 없어야 정상) |

브라우저 개발자도구 콘솔(F12)에 실제 오류 코드가 찍힙니다. 먼저 거기를 보세요.
