# Abstract Auto-Voter Bot 🤖
Abstract Global Wallet (AGW)의 Session Key 기능을 활용하여 Abstract Portal 앱 투표를 매일 자동으로 수행하는 봇입니다.
메인 지갑의 프라이빗 키를 서버에 노출할 필요 없이, 웹페이지를 통해 **투표 컨트랙트의 특정 함수만 실행 가능한 세션**을 발급받아 동작하므로 자산을 안전하게 보호할 수 있습니다.

---

## ✨ 주요 기능

### 🔐 안전한 웹 기반 세션 생성
* 메인 지갑의 프라이빗 키를 절대 요구하거나 저장하지 않습니다.
* Session Key를 사용하여 제한된 권한만 부여합니다.

### 🛡️ 이중 투표 방지
* `vote_history.json` 로컬 기록 검증
* 온체인 `getUserVotes()` 검증
* 중복 투표 및 불필요한 가스비 사용 방지

### ⏰ 자동 스케줄링
* PM2 Cron 설정 (`0 2 * * *`)
* 매일 한국 시간(KST) 새벽 2시에 자동 실행

### 🎲 랜덤 투표
* 당일 투표 가능한 앱 목록 중 하나를 무작위로 선택하여 투표

### 🔄 투표 실패시 재시도
* 실패할 경우 **1시간 간격으로 최대 5회** 자동 재시도합니다.

---

# 🚀 빠른 시작 가이드

## 1. Node.js 설치

https://nodejs.org 에서 **LTS 버전**을 다운로드하여 설치합니다.

설치 확인:
```bash
node -v
npm -v
```

---

## 2. PM2 전역 설치

```bash
npm install -g pm2
```

설치 확인:
```bash
pm2 -v
```

---

## 3. 저장소 복제 및 패키지 설치
```bash
git clone https://github.com/ro3zer/vote_bot.git
cd vote_bot
npm install
```

---

## 4. 세션 키 발급 및 설정

스크립트 실행 전, 투표 권한만 가진 Session Key를 생성해야 합니다.

### 세션 생성 페이지
https://ro3zer.github.io/create_vote_session

### 진행 순서
1. Abstract Global Wallet(AGW) 연결
2. 아래 정보 확인
3. Session 생성 및 Register 진행

### 세션 설정 정보

| 항목                | 값                                            |
| ----------------- | -------------------------------------------- |
| Target Contract   | `0x3B50dE27506f0a8C1f4122A1e6F470009a76ce2A` |
| Allowed Function  | `voteForApp(uint256 appId)`                  |
| Function Selector | `0x7060a227`                                 |

생성이 완료되면:
* Session JSON
* Session Private Key

를 저장합니다.

---

## 5. 프로젝트 파일 설정

### 📝 session.json 생성

발급받은 Session JSON 데이터를 프로젝트 루트 디렉토리에 `session.json` 파일로 저장합니다.

```json
{
  "signer": "0x발급된_세션_지갑_주소",
  "expiresAt": "1777295538",
  "feeLimit": {
    "limitType": 1,
    "limit": "100000000000000000",
    "period": "0"
  },
  "callPolicies": [
    {
      "target": "0x3B50dE27506f0a8C1f4122A1e6F470009a76ce2A",
      "selector": "0x7060a227",
      "valueLimit": {
        "limitType": 0,
        "limit": "0",
        "period": "0"
      },
      "maxValuePerUse": "10000000000000000",
      "constraints": []
    }
  ],
  "transferPolicies": []
}
```

---

### 🔑 .env 설정

프로젝트 루트 디렉토리에 `.env` 파일을 생성합니다.

```env
PRIVATE_KEY=your_session_wallet_private_key_here
```

> ⚠️ 주의
> 메인 지갑의 프라이빗 키가 아닙니다.
> 반드시 세션 생성 페이지에서 발급받은 Session Wallet Private Key를 입력해야 합니다.

---

# 🏃 실행 방법

## 테스트 모드 (즉시 실행)

정상 동작 여부를 확인하기 위해 즉시 한 번 실행합니다.

```bash
npx tsx index.js
```

---

## PM2를 통한 24시간 자동 실행 (권장)

### PM2 등록 및 실행
```bash
pm2 start ecosystem.config.js
```

### 실시간 로그 확인
```bash
pm2 logs auto-voter
```

### 실행 상태 확인
```bash
pm2 status
```

---

# 📌 스케줄 정보

기본 설정:
```cron
0 2 * * *
```

매일 오전 2시(KST)에 자동으로 투표를 수행합니다.

---

# ⚠️ 보안 안내

* 메인 지갑의 프라이빗 키를 입력하지 마세요.
* Session Key는 투표 컨트랙트의 특정 함수만 호출할 수 있도록 제한됩니다.
* Session Key가 유출되더라도 지갑 자산을 직접 이동시킬 수 없습니다.
* 세션 만료 시 새로운 Session Key를 발급받아야 합니다.