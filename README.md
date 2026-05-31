Abstract Auto-Voter Bot 🤖
Abstract 글로벌 월렛(AGW)의 세션 키(Session Key) 기능을 활용하여, Abstract Portal의 앱 투표를 매일 자동으로 수행하는 봇입니다.

메인 지갑의 프라이빗 키를 서버에 노출할 필요 없이, 웹페이지를 통해 오직 투표 컨트랙트의 특정 함수만 실행할 수 있는 세션을 발급받아 구동하므로 자산이 안전하게 보호됩니다.

🛠️ 주요 기능
안전한 웹 기반 세션 생성: 메인 지갑의 프라이빗 키가 절대 요구되거나 노출되지 않습니다.

이중 투표 방지: 로컬 기록(vote_history.json) 및 온체인 데이터(getUserVotes)를 모두 검증하여 가스비 낭비를 방지합니다.

자동 스케줄링: PM2 크론탭 설정(0 2 * * *)을 통해 매일 한국 시간(KST) 새벽 2시에 자동으로 실행됩니다.

랜덤 투표: 당일 투표 가능한 앱 목록 중 하나를 자동으로 선정하여 투표를 진행합니다.

🚀 빠른 시작 가이드
1. 저장소 복제 및 패키지 설치
봇을 구동할 서버나 PC의 터미널에서 아래 명령어를 입력합니다.

Bash
git clone <your-repository-url>
cd <repository-folder>
npm install
2. 세션 키 발급 및 설정하기 (웹사이트 이용)
스크립트를 실행하기 전, 투표 권한이 제한된 세션 키를 먼저 생성해야 합니다.

Abstract 세션 생성 페이지에 접속합니다.

본인의 Abstract Global Wallet(AGW)을 연결합니다.

아래 정보를 확인하고 세션을 생성/등록(Register)합니다:

Target Contract (투표 컨트랙트): 0x3B50dE27506f0a8C1f4122A1e6F470009a76ce2A

Allowed Function (허용 함수): voteForApp(uint256 appId) (선택자: 0x7060a227)

발급이 완료되면 화면에 나타나는 세션 정보와 세션 프라이빗 키를 획득합니다.

3. 프로젝트 파일 세팅
📝 session.json 저장
웹페이지에서 생성된 세션 JSON 데이터를 복사하여 프로젝트 루트 디렉토리에 session.json 파일로 저장합니다.

JSON
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
      "valueLimit": { "limitType": 0, "limit": "0", "period": "0" },
      "maxValuePerUse": "10000000000000000",
      "constraints": []
    }
  ],
  "transferPolicies": []
}
🔐 .env 환경 변수 설정
루트 디렉토리에 .env 파일을 생성하고, 웹페이지에서 발급받은 세션 지갑의 프라이빗 키를 입력합니다.

코드 스니펫
PRIVATE_KEY=your_session_wallet_private_key_here
⚠️ 경고: 메인 지갑의 프라이빗 키가 아닙니다! 웹페이지에서 발급해 준 전용 세션 프라이빗 키를 넣으셔야 합니다.

🏃‍♂️ 실행 및 24시간 백그라운드 구동
1. 테스트 모드로 일회성 실행
봇이 제대로 정상 작동하는지 즉시 트랜잭션을 날려보고 싶을 때 사용합니다.

Bash
npx tsx index.js
2. PM2를 통한 상시 자동화 구동 (추천)
서버에서 매일 새벽 2시에 알아서 투표를 수행하도록 백그라운드 프로세스로 등록합니다.

Bash
# PM2로 크론탭 스케줄러 등록 및 실행
pm2 start ecosystem.config.js

# 실시간 작동 로그 확인
pm2 logs auto-voter

# 구동 상태 확인
pm2 status
📁 폴더 구조
Plaintext
├── .env                  # 세션 프라이빗 키 보관 (⚠️ 깃허브 업로드 절대 금지)
├── ecosystem.config.js   # PM2 자동 재시작 및 스케줄링 설정 파일
├── index.js              # 자동 투표 봇 메인 로직
├── package.json          # 의존성 라이브러리 정의 파일
├── session.json          # 웹페이지에서 발급받아 넣은 세션 정책 파일
└── vote_history.json     # 중복 투표 방지용 당일 투표 기록 (자동 생성)