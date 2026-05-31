import { createSessionClient } from '@abstract-foundation/agw-client/sessions';
import { privateKeyToAccount } from 'viem/accounts';
import { abstract } from 'viem/chains';
import { http, parseAbi, createPublicClient } from 'viem';
import cron from 'node-cron';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const VOTING_CONTRACT_ADDRESS = '0x3B50dE27506f0a8C1f4122A1e6F470009a76ce2A';
const APPS_API_URL = 'https://backend.portal.abs.xyz/api/app?page=1&limit=100&category=&recommendGamesOfChance=true';
const MAIN_WALLET_ADDRESS = '0x6d880Df8f8514e264749072A8dca52540BB1Df07';

const HISTORY_FILE = './vote_history.json'; // 투표 기록을 저장할 파일

const abi = parseAbi([
  'function voteForApp(uint256 appId) external payable',
  'function voteCost() external view returns (uint96)',
  'function currentEpoch() external view returns (uint256)',
  'function getUserVotes(address user, uint256 epoch) external view returns (uint256[])'
]);

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환하는 함수
function getTodayString() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000; // 한국 시간 기준
  const kstDate = new Date(now.getTime() + kstOffset);
  return kstDate.toISOString().split('T')[0];
}

const MAX_RETRY = 5;
const RETRY_INTERVAL_MS = 60 * 60 * 1000; // 1시간

async function attemptVote() {
  let rawKey = process.env.PRIVATE_KEY.trim();
  if (!rawKey.startsWith('0x')) rawKey = '0x' + rawKey;
  const sessionSigner = privateKeyToAccount(rawKey);

  const sessionDataRaw = fs.readFileSync('./session.json', 'utf8');
  const sessionConfig = JSON.parse(sessionDataRaw, (key, value) => {
    if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
    return value;
  });

  const publicClient = createPublicClient({ chain: abstract, transport: http() });
  const sessionClient = createSessionClient({
    account: MAIN_WALLET_ADDRESS,
    chain: abstract,
    signer: sessionSigner,
    session: sessionConfig,
    transport: http(),
  });

  const currentEpoch = await publicClient.readContract({
    address: VOTING_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'currentEpoch',
  });

  const votedAppIdsBigInt = await publicClient.readContract({
    address: VOTING_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'getUserVotes',
    args: [MAIN_WALLET_ADDRESS, currentEpoch],
  });
  const votedAppIds = votedAppIdsBigInt.map(id => id.toString());

  const response = await fetch(APPS_API_URL, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  if (!response.ok) throw new Error(`API 호출 실패: 상태 코드 ${response.status}`);
  const data = await response.json();

  const eligibleApps = data.items.filter(app =>
    app.launched === true && !votedAppIds.includes(app.id.toString())
  );

  if (eligibleApps.length === 0) {
    throw new Error('투표할 수 있는 앱이 없습니다.');
  }

  const randomApp = eligibleApps[Math.floor(Math.random() * eligibleApps.length)];
  const targetAppId = BigInt(randomApp.id);
  console.log(`🎯 타겟 앱 선정: ${randomApp.name} (App ID: ${targetAppId})`);

  const currentVoteCost = await publicClient.readContract({
    address: VOTING_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'voteCost',
  });

  console.log(`⏳ 트랜잭션 전송 중...`);
  const txHash = await sessionClient.writeContract({
    address: VOTING_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'voteForApp',
    args: [targetAppId],
    value: currentVoteCost,
  });

  return { txHash, currentEpoch, targetAppId, appName: randomApp.name };
}

async function runAutoVoter() {
  console.log(`\n🚀 [${new Date().toLocaleString()}] 자동 투표 봇 실행 검사 중...`);

  const todayStr = getTodayString();
  let history = {};

  // 🌟 [로컬 파일 검증] 오늘 이미 투표했는지 체크
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const fileContent = fs.readFileSync(HISTORY_FILE, 'utf8').trim();
      if (fileContent) {
        history = JSON.parse(fileContent);
        if (history.lastVotedDate === todayStr) {
          console.log(`✅ 오늘은 이미 투표를 완료했습니다. (투표한 앱 ID: ${history.votedAppId})`);
          console.log(`💤 내일 스케줄을 위해 대기합니다...`);
          return;
        }
      }
    } catch (parseError) {
      console.log(`⚠️ 기록 파일(vote_history.json)이 비어있거나 형식이 손상되었습니다. 무시하고 진행합니다.`);
      history = {};
    }
  }

  // 🔄 재시도 루프 (최대 MAX_RETRY회, 실패 시 RETRY_INTERVAL_MS 후 재시도)
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      console.log(`\n🗳️ 투표 시도 ${attempt}/${MAX_RETRY} ...`);
      const { txHash, currentEpoch, targetAppId, appName } = await attemptVote();

      console.log(`🎉 대리 투표 성공! TX Hash: https://abscan.org/tx/${txHash}`);

      // 🌟 [투표 성공 시 로컬 파일에 기록 남기기]
      history = {
        lastVotedDate: todayStr,
        epoch: currentEpoch.toString(),
        votedAppId: targetAppId.toString(),
        appName,
        txHash
      };
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
      console.log(`💾 투표 기록이 ${HISTORY_FILE} 에 안전하게 저장되었습니다.`);
      return; // 성공 시 즉시 종료

    } catch (error) {
      console.error(`❌ 투표 실패 (시도 ${attempt}/${MAX_RETRY}):`, error.message || error);

      if (attempt < MAX_RETRY) {
        console.log(`⏳ ${RETRY_INTERVAL_MS / 60000}분 후 재시도합니다...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
      } else {
        console.error(`🚨 최대 재시도 횟수(${MAX_RETRY}회)를 초과했습니다. 오늘 투표를 포기합니다.`);
      }
    }
  }
}

// 처음 켜졌을 때 1회 실행 (기록 검사부터 진행)
runAutoVoter();

const CHECK_INTERVAL_MS = 60 * 1000; // 1분마다 체크

setInterval(() => {
  const now = new Date();
  const kstHour = (now.getUTCHours() + 9) % 24;
  const kstMinute = now.getMinutes();
  
  // 매일 02:00 KST 에 실행 (또는 날짜가 바뀌었고 아직 투표 안 했을 때)
  if (kstHour === 2 && kstMinute === 0) {
    runAutoVoter();
  }
}, CHECK_INTERVAL_MS);

console.log('🤖 Abstract Auto Voter 봇이 켜졌습니다. 스케줄 대기 중...');