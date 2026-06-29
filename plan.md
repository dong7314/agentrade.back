# Agentrade Backend Plan

최종 업데이트: 2026-06-29

이 문서는 `backend` 폴더에서 현재까지 어디까지 개발했는지, 이번 세션에서 어떤 방식으로 학습/개발을 진행했는지, 다른 컴퓨터에서 이어서 작업할 때 무엇부터 확인하면 되는지 정리한 인수인계 문서입니다.

현재 백엔드는 NestJS + TypeORM + PostgreSQL + Scalar 기반으로 로컬 회원가입/로그인, 쿠키 기반 access/refresh token, DB 세션, Naver/Kakao OAuth 로그인, 전략 생성/목록/상세/수정/상태 변경/LLM 구조화 흐름까지 1차 구현된 상태입니다. 또한 `strategy_runs` 기반 실행 이력 저장/조회, `POST /strategies/:id/run` 수동 실행 API, `@nestjs/schedule` 기반 자동 실행 흐름, 실제 Upbit 캔들 수집, 사용자별 Upbit credential 암호화 저장, live portfolio 조회, paper portfolio 조회 분기, Naver 뉴스 수집, Upbit DataLab 자산 요약 수집, 전략별 데이터 접근 권한, 전략 판단 모드 설정, LLM 기반 AI decision, risk check, paper order, live order 1차 실행 흐름, 사용자 승인/거절 기반 주문 승인 대기 흐름, live 주문 상태 동기화/미체결 주문 취소 흐름, 대시보드 1차 조회 API, 전략 실행 중복 방지 보강까지 진행된 상태입니다.

2026-06-29 현재 중요한 진행 상태:

- `src/dashboard` 모듈을 추가하고 `AppModule`에 등록했습니다.
- dashboard DTO는 `dto/query`, `dto/response`로 나누어 요청 query DTO와 응답 DTO의 역할을 분리했습니다.
- `GET /dashboard/portfolio?mode=paper|live&market=KRW-BTC` API를 추가했습니다.
- portfolio API는 `mode=paper`일 때 `PaperPortfolioService.getPortfolio()`를 사용하고, `mode=live`일 때 사용자 Upbit credential 복호화 후 실제 Upbit 계좌와 현재가를 조회해 평가금액, 미실현 손익, 비중을 계산합니다.
- `GET /dashboard/strategies/:strategyId/latest-run` API를 추가했습니다.
- latest-run API는 로그인 사용자의 특정 전략 최신 `strategy_runs` row를 조회하고, 연결된 `strategy_order_approvals`가 있으면 `approvalId`, `approvalStatus`를 함께 반환합니다.
- `GET /dashboard/chart?market=KRW-BTC&timeframe=5m&count=50` API를 추가했습니다.
- chart API는 `UpbitPublicService.getMinuteCandles()`를 사용하고, 차트 UI에서 쓰기 좋도록 오래된 캔들에서 최신 캔들 순서로 정렬해 반환합니다.
- `GET /dashboard/market-summaries?markets=KRW-BTC,KRW-ETH,KRW-XRP` API를 추가했습니다.
- market summaries API는 `UpbitPublicService.getTickers()`를 사용해 여러 마켓의 현재가, 24시간 등락률, 고가/저가, 거래량, 거래대금을 반환합니다.
- 기본 dashboard market 목록은 `DASHBOARD_MARKETS`로 분리했습니다.
- `GET /dashboard/trade-logs?page=1&limit=20` API를 추가했습니다.
- trade logs API는 현재 단계에서 `strategy_order_approvals`를 1차 소스로 사용해 주문 후보, 승인, 실행 결과 로그를 대시보드 표시용으로 반환합니다.
- trade log item 변환은 service가 아니라 `DashboardTradeLogItemDto.fromApproval()`, `fromApprovals()`에서 담당하도록 분리했습니다.
- dashboard API 문서는 `src/dashboard/docs/dashboard-api.docs.ts`에 모아 Scalar에서 확인할 수 있도록 연결했습니다.
- `strategy_runs`에 같은 전략의 `running` 실행 이력이 중복 생성되지 않도록 partial unique index migration `1782700000000-AddOneRunningRunPerStrategy.ts`를 추가했습니다.
- `StrategyRunService`는 `running` row 저장 시 unique violation이 발생하면 `이미 실행 중인 전략입니다.`로 변환합니다.
- AI 판단이나 외부 API 호출이 길어지는 동안 scheduler가 같은 전략을 다시 실행해 400 로그를 반복해서 남기지 않도록 `StrategySchedulerService`에서 `running` run이 존재하는 전략은 조회 단계에서 제외하도록 변경했습니다.
- `StrategyRunService.assertNoRunningRun()`은 수동 실행, 다중 scheduler 인스턴스, DB unique index 전 마지막 안전장치로 유지합니다.
- `StrategyOrderApprovalService.approve()`는 주문 실행 중 예외가 발생해도 approval을 `failed`로 저장하도록 보강했습니다.
- paper 주문은 내부 잔고 반영까지 끝난 경우 `executed`로 저장하고, live 주문은 Upbit 주문 접수 상태이므로 즉시 `executed`로 보지 않고 `approved` 상태로 남기도록 변경했습니다.
- `POST /strategy-order-approvals/:id/sync-live-order` API를 추가했습니다.
- sync-live-order API는 live approval에 저장된 Upbit 주문 uuid를 기준으로 `/v1/order`를 조회하고, Upbit 상태가 `wait`이면 `approved`, `done`이면 `executed`, `cancel`이면 `cancelled`로 approval 상태를 동기화합니다.
- `src/upbit/types/private/upbit-order-detail.type.ts`를 추가해 Upbit 주문 조회/취소 응답을 내부 타입으로 변환하는 `UpbitOrderDetail.fromResponse()`를 분리했습니다.
- `UpbitPrivateService.getOrder()`와 `LiveOrderService.getOrder()`를 추가해 live 주문 상세 상태를 조회할 수 있게 했습니다.
- `UpbitPrivateService.cancelOrder()`와 `LiveOrderService.cancelOrder()`를 추가해 Upbit 미체결 주문을 uuid 기준으로 취소할 수 있게 했습니다.
- `StrategyOrderApprovalStatus`에 `cancelled`를 추가하고, `TradeOrderStatus`에도 `cancelled`를 추가했습니다.
- `src/database/migrations/1782701000000-AddCancelledStrategyOrderApprovalStatus.ts` migration을 추가했습니다. 이 migration은 PostgreSQL enum `strategy_order_approval_status`에 `cancelled` 값을 추가합니다.
- `StrategyOrderApprovalService.cancelOpenLiveOrdersBeforeRun()`을 추가했습니다. 다음 live 전략 실행 전에 기존 `approved` 상태 live 주문을 조회하고, Upbit 상태가 `done`이면 `executed`, 이미 `cancel`이면 `cancelled`, 아직 `wait`이면 취소 후 `cancelled`로 정리합니다.
- `StrategyRunService.runByStrategy()`는 live 전략의 새 AI 판단을 시작하기 전에 기존 미체결 live 주문을 먼저 정리하도록 변경했습니다.
- `StrategyExecutionService.collectNews()`는 Naver News API 실패 시 run 전체를 실패시키지 않고 `news` step만 `failed`로 저장하도록 변경했습니다.
- `NewsDataService`, `AssetSummaryService`에 `DATA_COLLECT_TIMEOUT_MS` 기반 timeout 처리를 추가했습니다.
- `env.validation.ts`에서 `DATA_COLLECT_TIMEOUT_MS`를 숫자로 파싱하도록 정리했습니다.
- `pnpm format`을 통해 기존 TypeORM migration 파일들의 Prettier 포맷도 정리되었습니다.
- 기존 사용자에게 `paper_accounts` row가 없으면 paper 전략의 portfolio step에서 `현재 가상 계좌가 존재하지 않습니다.`가 발생할 수 있음을 확인했습니다. 운영/개발 DB에서는 기존 사용자 backfill이 필요합니다.

2026-06-29 기준 주요 dashboard API:

```http
GET /dashboard/portfolio?mode=paper
GET /dashboard/portfolio?mode=live
GET /dashboard/strategies/:strategyId/latest-run
GET /dashboard/chart?market=KRW-BTC&timeframe=5m&count=50
GET /dashboard/market-summaries?markets=KRW-BTC,KRW-ETH,KRW-XRP
GET /dashboard/trade-logs?page=1&limit=20
```

2026-06-29 기준 주요 strategy order approval API:

```http
GET /strategy-order-approvals
POST /strategy-order-approvals/:id/approve
POST /strategy-order-approvals/:id/reject
POST /strategy-order-approvals/:id/sync-live-order
```

2026-06-29 기준 확인한 이슈와 대응:

- AI decision이 오래 걸리는 동안 1분 scheduler가 같은 전략을 다시 잡아 `이미 실행 중인 전략입니다.` 로그가 반복될 수 있었습니다.
- 이 문제는 scheduler 조회 시 `NOT EXISTS (running run)` 조건을 추가해 running 중인 전략을 실행 후보에서 제외하는 방식으로 보강했습니다.
- live 지정가 주문이 체결되지 않고 `wait` 상태로 남아 있으면 다음 전략 실행 시 이전 주문이 뒤늦게 체결될 수 있는 위험이 있습니다.
- 이 문제는 새 live 전략 실행 전에 기존 `approved` live 주문을 Upbit 기준으로 조회하고, 미체결 주문은 취소한 뒤 다음 AI 판단을 진행하는 방식으로 보강했습니다.
- `paper_accounts`가 없는 기존 사용자는 paper portfolio 조회가 실패할 수 있으므로 아래 backfill SQL을 먼저 적용할 수 있습니다.

```sql
INSERT INTO paper_accounts (
  user_id,
  base_currency,
  cash_balance,
  initial_cash_balance
)
SELECT
  u.id,
  'KRW',
  10000000,
  10000000
FROM users u
WHERE NOT EXISTS (
  SELECT 1
  FROM paper_accounts pa
  WHERE pa.user_id = u.id
);
```

- 오래 남은 `running` run은 원인을 확인한 뒤 필요하면 아래처럼 수동 종료할 수 있습니다.

```sql
UPDATE strategy_runs
SET status = 'failed',
    finished_at = now(),
    error_message = 'stale running run manually closed'
WHERE status = 'running';
```

2026-06-29 기준 검증:

```bash
./node_modules/.bin/tsc --noEmit --project tsconfig.build.json --pretty false
./node_modules/.bin/eslint "src/dashboard/**/*.ts"
./node_modules/.bin/eslint "src/**/*.ts"
```

- dashboard 범위와 전체 `src/**/*.ts` lint는 통과했습니다.
- `tsc --noEmit --project tsconfig.build.json` 기준 타입 검증도 통과했습니다.

2026-06-29 기준 LangGraph 전환 방향:

- 이제 백엔드의 전략 실행 흐름은 LangGraph 1차 전환을 시작할 수 있는 상태입니다.
- LangGraph를 붙이는 이유는 단순히 AI 호출이 있기 때문이 아니라, 이후 `risk check 실패 시 AI decision 재시도`, `필수 데이터 누락 시 collect 단계 재시도`, `hold일 때 주문 없이 종료`, `user judgment mode일 때 approval 생성 후 종료`처럼 조건부 분기와 재진입 흐름이 필요해지기 때문입니다.
- 1차 전환에서는 기존 `StrategyExecutionService.execute()`의 선형 흐름을 그대로 LangGraph node로 옮기는 것을 목표로 합니다.
- 1차 전환에서는 retry/loop를 최소화하고, 현재 동작 결과가 바뀌지 않도록 `prepare -> collect -> decide -> risk -> order -> finish` 흐름을 우선 구성합니다.
- 2차 전환에서 retryable risk violation, 필수 데이터 누락, AI decision 재요청 같은 loop/conditional edge를 추가합니다.
- 전략 pause/archive/delete 시 live 미체결 주문 정리는 중요한 운영 안전장치이지만, 현재 LangGraph 전환을 막는 선행 작업은 아닙니다. 이 작업은 LangGraph 1차 전환 이후 차후 보강 항목으로 둡니다.

LangGraph 1차 전환 목표 구조:

```txt
StrategyRunService.runByStrategy()
-> StrategyExecutionService.execute()
-> StrategyExecutionGraph.run()
-> prepareNode
-> collectMarketDataNode
-> collectNewsNode
-> collectAssetSummaryNode
-> collectPortfolioNode
-> aiDecisionNode
-> riskCheckNode
-> orderNode
-> finish
```

LangGraph 1차 전환에서 먼저 만들 타입:

```ts
StrategyGraphState = {
  strategy;
  strategyRunId;
  steps;
  collectedData;
  aiDecision;
  riskCheck;
  orderResult;
}
```

LangGraph 1차 전환 원칙:

- 기존 service들을 버리지 않고 node 내부에서 재사용합니다.
- `StrategyExecutionService.execute()`의 외부 응답 형태인 `StrategyRunResult`는 유지합니다.
- `StrategyRunService`, scheduler, approval, paper/live order API의 public 흐름은 바꾸지 않습니다.
- node 분리는 학습과 이후 loop 확장을 위한 구조 작업으로 진행합니다.
- 처음부터 완전한 agent graph를 만들지 않고, 현재 선형 workflow를 graph로 옮기는 수준에서 시작합니다.

2026-06-29 기준 `example/agentrade/frontend` 목업 분석:

- 프론트 목업은 `example/agentrade/frontend` 아래의 Next.js 프로젝트입니다.
- 현재 프론트는 API 호출 없이 `src/data/dashboard.ts`의 mock 데이터를 사용합니다.
- 핵심 화면은 `TradeDashboard`, `ExecutionStatusScreen`, `StrategyBuilderScreen`, `HistoryScreen`, `SettingsScreen`, `PortfolioScreen`입니다.
- 홈 대시보드는 현재 백엔드의 dashboard API로 1차 연결이 가능합니다.
- `MarketSummary`는 `GET /dashboard/market-summaries`로 연결할 수 있습니다.
- `ChartPanel`은 `GET /dashboard/chart`로 연결할 수 있습니다.
- `AiDecisionPanel`, `RiskPanel`, `WorkflowPanel`은 `GET /dashboard/strategies/:strategyId/latest-run`으로 1차 연결할 수 있습니다.
- `PortfolioPanel`은 `GET /dashboard/portfolio?mode=paper|live`로 연결할 수 있습니다.
- `TradeLogPanel`은 `GET /dashboard/trade-logs`로 연결할 수 있습니다.
- 승인 대기, 승인, 거절, live 주문 sync는 `GET /strategy-order-approvals`, `POST /strategy-order-approvals/:id/approve`, `POST /strategy-order-approvals/:id/reject`, `POST /strategy-order-approvals/:id/sync-live-order`로 연결할 수 있습니다.

프론트 목업 기준 LangGraph 이후 보강할 API:

- `GET /strategy-runs/:runId/graph`
  - `ExecutionStatusScreen`의 graph node/edge UI를 실제 실행 상태와 연결하기 위한 API입니다.
  - 응답은 `nodes`, `edges`, `run status`, `startedAt`, `finishedAt` 중심으로 설계합니다.
  - 1차에서는 polling으로 충분하며, SSE/WebSocket은 나중에 필요할 때 추가합니다.
- `GET /strategy-runs/:runId/events`
  - 실행 화면의 "실시간 이벤트" 패널을 위한 API입니다.
  - LangGraph 1차 전환 직후에는 필수는 아니며, `strategy_runs.result.steps` 기반으로 만들 수 있습니다.
  - 실시간성이 필요해지면 `GET /strategy-runs/:runId/events/stream` 같은 SSE로 확장합니다.
- `GET /upbit/markets?quote=KRW`
  - `StrategyBuilderScreen`의 마켓 선택 UI를 실제 Upbit 마켓 목록과 연결하기 위한 API입니다.
  - 응답은 `{ market, symbol, koreanName, englishName }` 형태가 좋습니다.
- `GET /dashboard/trade-logs` query 보강
  - 현재는 `page`, `limit`만 지원합니다.
  - `HistoryScreen`과 trade log 검색/필터를 위해 `strategyId`, `market`, `status`, `mode`, `dateFrom`, `dateTo`, `search`, `sort`를 차후 추가합니다.
- `GET /strategy-runs` query 보강
  - 현재는 `strategyId`, `status` 중심입니다.
  - history 화면을 위해 `market`, `dateFrom`, `dateTo`, `sort`를 차후 추가할 수 있습니다.
- `GET /strategy-order-approvals` query 보강
  - 현재는 `status` 중심입니다.
  - 승인 내역 화면을 위해 `strategyId`, `market`, `mode`, `dateFrom`, `dateTo`를 차후 추가할 수 있습니다.
- `POST /strategies/parse-preview`
  - 프론트가 "저장 전 AI 구조화 미리보기"를 원할 때 필요한 API입니다.
  - 현재는 `POST /strategies`로 draft 생성 후 `POST /strategies/:id/parse`를 호출하는 흐름으로 충분하므로 우선순위는 낮습니다.
- `GET /admin/users`, `PATCH /admin/users/:id/permissions`
  - `SettingsScreen`의 사용자 권한 승격 UI를 위한 API입니다.
  - 현재 프로젝트 핵심은 개인 전략 실행/학습 흐름이므로 우선순위는 가장 낮습니다.

프론트 연동 전에 맞춰야 할 응답/용어 차이:

- 프론트 목업은 `BTC/KRW` 표기를 쓰지만, 백엔드는 Upbit 기준 `KRW-BTC`를 사용합니다. 실제 연동 시 프론트를 `KRW-BTC` 기준으로 맞춥니다.
- 프론트 목업의 `AssetSymbol`은 `BTC | ETH | SOL`인데, 현재 백엔드 기본 대시보드 마켓은 `BTC | ETH | XRP` 흐름입니다. 실제 지원 마켓 목록은 `GET /upbit/markets?quote=KRW` 이후 UI에서 동적으로 구성합니다.
- 프론트 chart 타입은 `time: number`를 기대하고, 백엔드는 `openedAt: Date`를 내려줍니다. 프론트 API adapter에서 `Date.parse(openedAt) / 1000`으로 변환합니다.
- 프론트 `WorkflowStepStatus`는 `completed | active | waiting`이고, 백엔드 step status는 `succeeded | failed | skipped` 계열입니다. LangGraph graph API에서 UI용 status로 매핑합니다.
- 프론트 `TradeLogStatus`는 `completed | pending | waiting`이고, 백엔드 approval status는 `pending | approved | rejected | executed | cancelled | failed`입니다. dashboard adapter 또는 DTO에서 화면용 status를 매핑합니다.
- `SettingsScreen`은 관리자/권한 관리 화면이지만, 현재 백엔드 `UserController`는 비어 있습니다. 해당 화면은 마지막 단계 또는 별도 admin 기능으로 분리합니다.

LangGraph 이후 백엔드 보강 순서:

```txt
1. LangGraph 1차 전환 완료
2. GET /strategy-runs/:runId/graph 추가
3. dashboard latest-run 응답을 graph node 상태와 맞춤
4. GET /upbit/markets?quote=KRW 추가
5. dashboard trade-logs / strategy-runs / approvals 필터 보강
6. 필요하면 POST /strategies/parse-preview 추가
7. settings/admin user API는 가장 마지막에 검토
8. 그 다음 frontend 실제 API 연결
```

다음 작업 방향:

- 현재 변경 범위는 한 번 커밋해서 닫는 것이 좋습니다.
- 다음 주요 작업은 LangGraph 1차 전환입니다.
- 첫 작업은 `StrategyGraphState` 타입을 만들고, 현재 `StrategyExecutionService.execute()` 안의 단계들을 node 후보로 나누는 것입니다.
- 그 다음 `StrategyExecutionGraph` 또는 유사한 graph 실행 service를 만들고, 기존 `StrategyExecutionService.execute()`가 해당 graph service를 호출하도록 점진적으로 전환합니다.
- LangGraph 1차 전환이 끝나면 기존 수동 실행 API, scheduler, dashboard latest-run 응답이 그대로 동작하는지 확인합니다.
- LangGraph 2차 전환에서 risk retry, data collect retry, AI decision 재요청 같은 조건부 edge를 추가합니다.
- 전략 pause/archive/delete 시 live 미체결 주문 정리는 LangGraph 1차 전환 이후 차후 운영 안전장치로 진행합니다.
- frontend dashboard 실제 연동은 백엔드 LangGraph 전환과 주요 실행 검증이 끝난 뒤 마지막 단계에서 진행합니다.

2026-06-26 현재 중요한 진행 상태:

- `strategyJudgmentMode=user` 전략에서 risk check를 통과한 주문 후보를 바로 실행하지 않고 `strategy_order_approvals` 승인 대기 데이터로 저장하는 흐름을 추가했습니다.
- `StrategyRunService`는 `StrategyExecutionService.execute()`에 `strategyRunId`를 넘기도록 변경했습니다.
- `StrategyExecutionService.decideOrder()`는 사용자 확인 모드일 때 `StrategyOrderApprovalService.createPending()`을 호출하고, order step output에 `approvalRequired`, `approvalId`, `adjustedOrder`를 남깁니다.
- `src/strategy/entities/strategy-order-approval.entity.ts`를 추가했습니다.
- approval entity는 `userId`, `strategyId`, `strategyRunId`, `strategyMode`, `market`, `decision`, `orderType`, `decisionReason`, `adjustedOrder`, `riskCheckResult`, `orderResult`, `status`, `rejectReason`, `decidedAt`을 저장합니다.
- `adjustedOrder`와 `riskCheckResult`는 승인/실행에 반드시 필요한 데이터라 `jsonb NOT NULL`로 정의했습니다.
- `RiskAdjustedOrder`, `RiskCheckResult`, `TradeOrderResult`는 decorated property 타입으로만 사용되므로 `import type`으로 가져오도록 수정했습니다. 이 수정으로 `isolatedModules` + `emitDecoratorMetadata` 환경의 TS1272 오류를 해결했습니다.
- `src/strategy/enums/strategy-order-approval-status.enum.ts`를 추가했습니다.
- approval status는 `pending`, `approved`, `rejected`, `executed`, `failed`입니다.
- `src/strategy/services/strategy-order-approval.service.ts`를 추가했습니다.
- `findAllByUserId()`는 로그인 사용자의 approval 목록을 페이지네이션과 status 필터로 조회합니다.
- `createPending()`은 risk check를 통과한 주문 후보만 승인 대기로 저장합니다.
- `approve()`는 중복 승인으로 주문이 두 번 나가는 것을 막기 위해 `PENDING -> APPROVED` 조건부 update로 먼저 상태를 선점한 뒤 paper/live 주문 서비스를 호출합니다.
- `reject()`도 `PENDING -> REJECTED` 조건부 update로 처리해 approve/reject 동시 요청 충돌을 줄였습니다.
- 승인 성공 후 `PaperOrderService` 또는 `LiveOrderService`를 호출하고, 결과에 따라 approval status를 `executed` 또는 `failed`로 저장합니다.
- `src/strategy/controllers/strategy-order-approval.controller.ts`를 추가했습니다.
- 추가된 API는 `GET /strategy-order-approvals`, `POST /strategy-order-approvals/:id/approve`, `POST /strategy-order-approvals/:id/reject`입니다.
- `src/strategy/dto/strategy-order-approval-response.dto.ts`에 응답 DTO와 `fromEntity()`, `fromEntities()` 변환 메서드를 추가했습니다.
- `src/strategy/dto/reject-strategy-order-approval.dto.ts`를 추가해 거절 사유를 선택적으로 받을 수 있게 했습니다.
- `src/strategy/docs/strategy-order-approval-api.docs.ts`를 추가해 Scalar 문서용 API decorator를 분리했습니다.
- `StrategyModule`에 `StrategyOrderApprovalEntity`, `StrategyOrderApprovalService`, `StrategyOrderApprovalController`를 등록했습니다.
- `src/database/migrations/1782440262054-CreateStrategyOrderApprovals.ts` migration 파일을 생성했습니다.
- migration은 `strategy_order_approval_status` enum과 `strategy_order_approvals` 테이블을 생성합니다.
- migration 파일은 생성되었지만, 실제 DB 적용 여부는 별도로 확인해야 합니다. 적용 명령은 `pnpm migration:run`입니다.
- TypeORM schema 로딩 기준으로 `strategy_order_approvals` 생성 SQL이 정상 출력되는 것을 확인했습니다.

검증:

```bash
./node_modules/.bin/eslint "src/strategy/**/*.ts"
node -r ts-node/register -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/database/data-source.ts schema:log
```

- strategy 범위 lint는 통과했습니다.
- TypeORM schema 로딩은 통과했고, `adjusted_order jsonb NOT NULL`, `risk_check_result jsonb NOT NULL`로 생성되는 것을 확인했습니다.
- 루트 `tsc --project tsconfig.build.json`는 기존과 동일하게 `example/frontend`가 백엔드 tsconfig에 포함되어 JSX/alias 오류가 발생할 수 있습니다. approval 코드 자체의 확인은 위 lint와 schema 로딩으로 진행했습니다.

2026-06-25 현재 중요한 진행 상태:

- `RiskCheckService`를 `StrategyExecutionService` workflow에 연결했습니다.
- `RiskCheckService`는 AI decision의 `suggestedOrder`를 기준으로 주문 후보를 만들고, `confidence`, 주문 비중, 필수 데이터 수집 실패, Upbit 최소 주문 금액 5,000원, 지정가 주문의 `limitPrice` 유효성을 검사합니다.
- `RiskCheckService`는 market 주문과 limit 주문을 모두 지원합니다.
- market 주문은 최신 종가를 기준으로 예상 주문 금액/수량을 계산하고, limit 주문은 `limitPrice`를 기준으로 예상 주문 금액/수량을 계산합니다.
- 지정가 주문에서 `limitPrice`가 없을 때 `LIMIT_PRICE_REQUIRED`와 `ORDER_ESTIMATION_FAILED`가 중복으로 붙지 않도록 정리했습니다.
- `src/strategy/types/trade-order-result.type.ts`를 추가해 paper/live 주문 실행 결과 타입을 공통화했습니다.
- `src/upbit/types/private/upbit-create-order.type.ts`를 추가해 Upbit 주문 생성/test 주문 입력과 응답 타입을 정의했습니다.
- `UpbitPrivateService`에 `/v1/orders/test`, `/v1/orders` 호출 메서드를 추가했습니다.
- `UpbitAuthService.createAccessToken()`은 주문 요청 body를 `query_hash`로 포함해 Upbit 주문 API 인증에 사용할 수 있도록 변경했습니다.
- `src/upbit/services/live-order.service.ts`를 추가했습니다.
- `LiveOrderService`는 risk check를 통과한 주문 후보를 Upbit 주문 payload로 변환합니다.
- live market buy는 `side=bid`, `ord_type=price`, `price=총 매수 금액`으로 변환합니다.
- live market sell은 `side=ask`, `ord_type=market`, `volume=매도 수량`으로 변환합니다.
- live limit buy/sell은 `ord_type=limit`, `price`, `volume`으로 변환합니다.
- `LiveOrderService`는 실제 주문 전 `/v1/orders/test`를 먼저 호출하고, test 주문이 성공한 경우에만 `/v1/orders`를 호출합니다.
- `LiveOrderService`는 `UpbitModule` provider/export로 등록했고, `StrategyExecutionService`는 `UpbitModule`을 통해 주입받습니다.
- `src/paper-trading/services/paper-order.service.ts`를 추가했습니다.
- `PaperOrderService`는 risk check를 통과한 주문 후보를 transaction 안에서 paper account/position에 반영합니다.
- paper buy는 `cashBalance`를 차감하고, 기존 position 수량과 평단을 갱신하거나 새 position을 생성합니다.
- paper sell은 보유 수량을 차감하고 `cashBalance`를 증가시키며, 전량 매도 시 position을 제거합니다.
- `PaperOrderService`는 `PaperTradingModule` provider/export로 등록했고, `StrategyExecutionService`에서 paper 전략 주문 실행에 사용합니다.
- `StrategyExecutionService.decideOrder()`는 현재 아래 순서로 동작합니다.
- risk check 실패: order step skipped.
- `strategyJudgmentMode=user`: 자동 주문 없이 `approvalRequired=true`로 order step skipped.
- `strategyMode=paper`: `PaperOrderService.execute()` 호출.
- `strategyMode=live` 그리고 `strategyJudgmentMode=ai`: `LiveOrderService.execute()` 호출.
- `UpbitPublicService`에 여러 market의 현재가를 한 번에 조회하는 `getTickers(markets: string[])`를 추가했습니다.
- `getTickers()`는 Upbit public ticker API 응답을 서버 내부 타입으로 변환하고, API 실패 시 `BadGatewayException`을 반환합니다.
- `PaperPortfolio` 타입을 현재 평가 중심 구조로 확장했습니다.
- `PaperPortfolioService.getPortfolio()`는 이제 특정 market만 조회하거나 전체 paper position을 조회할 수 있도록 `market?: string`을 받습니다.
- `PaperPortfolioService.getPortfolio()`는 paper position의 수량/평단은 DB 값으로 유지하고, 조회 시점의 Upbit 현재가를 붙여 `currentPrice`, `marketValueKrw`, `unrealizedPnlKrw`, `unrealizedPnlRate`, `allocationRatio`, `totalAssetValue`를 계산합니다.
- `PaperTradingModule`은 `UpbitModule`을 import해 `PaperPortfolioService`가 `UpbitPublicService`를 사용할 수 있도록 정리했습니다.
- 이 변경으로 전략 실행의 portfolio step과 이후 dashboard portfolio API가 같은 paper 평가 데이터를 사용할 수 있는 기반이 생겼습니다.
- `paper-order.service.ts`, `live-order.service.ts`, `risk-check.service.ts`에 큰 단계가 보이도록 짧은 주석을 추가했습니다.
- 앞으로 service 로직이나 코드 예시를 설명할 때는 사용자가 흐름을 빠르게 이해할 수 있도록 핵심 단계마다 한줄 주석을 함께 작성하는 방식으로 진행합니다.
- 아래 관련 파일 lint 검증은 통과했습니다.

```bash
pnpm exec eslint "src/paper-trading/**/*.ts" "src/upbit/**/*.ts" "src/strategy/**/*.ts" --ignore-pattern "src/database/migrations/*.ts"
```

- 전체 `pnpm exec eslint "src/**/*.ts"`는 기존 migration 파일들의 Prettier 포맷 문제로 실패할 수 있습니다. 이번 변경 범위인 paper-trading/upbit/strategy 쪽 lint는 통과했습니다.
- 현재 루트 `pnpm exec tsc --noEmit --pretty false`는 `example/frontend` 목업 프로젝트까지 같이 검사하면서 JSX 설정/alias 설정 차이로 실패할 수 있습니다. 백엔드 검증용 tsconfig에서 `example/**`를 제외하거나, 프론트엔드는 `example/frontend` 내부의 별도 tsconfig로 검사하는 방식으로 정리해야 합니다.

2026-06-25 대시보드 목업 분석:

- `example/frontend`는 현재 백엔드와 분리된 목업 Next.js 프로젝트입니다.
- 핵심 목업 파일은 `example/frontend/src/components/dashboard/trade-dashboard.tsx`, `example/frontend/src/data/dashboard.ts`, `example/frontend/src/types/dashboard.ts`입니다.
- 대시보드 첫 화면은 시장 요약, 캔들 차트, AI 판단, 리스크 검사, workflow, 포트폴리오 분포, 거래 로그를 사용합니다.
- 목업 타입 기준으로 필요한 데이터는 `StrategySummary`, `ChartCandle`, `AiDecision`, `RiskCheckItem`, `WorkflowStep`, `PortfolioBalance`, `TradeLog`입니다.
- `StrategySummary`에는 심볼/마켓별 현재가, 24시간 등락률, 24시간 고가/저가, 거래량, sparkline이 필요합니다.
- `ChartCandle`에는 특정 market/timeframe의 OHLCV 캔들 리스트가 필요합니다.
- `AiDecision`은 최신 strategy run의 AI decision step에서 `decision`, `confidence`, `reason`, 판단 시간을 뽑아 만들 수 있습니다.
- `RiskCheckItem`은 최신 strategy run의 risk check step output, 특히 `violations`와 통과 여부를 UI 표시용으로 변환해 만들 수 있습니다.
- `WorkflowStep`은 `strategy_runs.result.steps`를 UI 상태(`completed`, `active`, `waiting`)와 설명으로 매핑해 만들 수 있습니다.
- `PortfolioBalance`는 paper/live portfolio의 현금과 보유 자산을 현재가 기준 평가금액과 비중으로 계산해야 합니다.
- `TradeLog`는 우선 `strategy_runs.result.steps`를 기반으로 만들 수 있고, 이후 `paper_orders`, live order history, approval/audit log 테이블이 생기면 더 정확한 로그로 분리합니다.

대시보드를 고려한 백엔드 서비스 설계 방향:

- `UpbitPublicService`에 현재가 조회 기능을 추가하거나 별도 `MarketQuoteService`를 둡니다.
- 현재가 조회는 Upbit public ticker API(`/v1/ticker?markets=KRW-BTC,KRW-ETH`)를 사용해 여러 market의 가격을 한 번에 가져오는 방향이 좋습니다.
- `MarketQuoteService`는 dashboard, paper portfolio 평가, risk/order 계산 보조에서 같이 쓸 수 있는 공통 가격 조회 계층으로 둡니다.
- `PaperPortfolioService.getPortfolio()`는 현재처럼 현금/수량만 반환하지 않고, 현재가를 붙여 `currentPrice`, `marketValueKrw`, `unrealizedPnlKrw`, `unrealizedPnlRate`, `totalAssetValue`를 계산하도록 확장합니다.
- 가격이 변해도 `paper_positions.quantity`, `paper_positions.average_entry_price`는 변경하지 않습니다. 가격 변동은 조회 시점의 평가값으로만 계산합니다.
- `PortfolioValuationService` 또는 `PortfolioDashboardService`를 만들어 paper/live portfolio를 같은 화면 응답 구조로 변환하는 계층을 둘 수 있습니다.
- live portfolio는 Upbit `/v1/accounts`로 보유 수량을 조회하고, 동일한 현재가 조회 계층을 통해 평가금액과 비중을 계산합니다.
- dashboard API는 처음부터 너무 크게 만들지 않고, 아래 view API들을 순서대로 만드는 방향이 좋습니다.
- `GET /dashboard/market-summaries`: 주요 market 현재가/24h/sparkline.
- `GET /dashboard/chart?market=KRW-BTC&timeframe=5m`: 캔들 차트.
- `GET /dashboard/portfolio?mode=paper|live`: 현금, 보유 자산, 현재 평가금액, 비중, 미실현 손익.
- `GET /dashboard/strategies/:strategyId/latest-run`: 최신 run의 AI 판단, risk check, workflow, order 결과.
- `GET /dashboard/trade-logs`: run step 기반 로그. 이후 주문/승인/audit 테이블이 생기면 소스 확장.

다음 작업 방향:

- 먼저 `pnpm migration:run`으로 `strategy_order_approvals` migration을 실제 DB에 적용합니다.
- Scalar에서 `strategyJudgmentMode=user` 전략을 수동 실행해 `order` step에 `approvalRequired=true`, `approvalId`가 남는지 확인합니다.
- `GET /strategy-order-approvals?status=pending`으로 승인 대기 주문 후보가 조회되는지 확인합니다.
- `POST /strategy-order-approvals/:id/reject`로 거절 상태 전이가 되는지 확인합니다.
- 별도 pending approval을 만든 뒤 `POST /strategy-order-approvals/:id/approve`로 paper 주문이 실행되고 approval status가 `executed` 또는 `failed`로 저장되는지 확인합니다.
- live approval approve 테스트는 Upbit credential과 실제 주문 위험이 있으므로, paper 흐름이 안정화된 뒤 소액/테스트 정책을 다시 확인하고 진행합니다.
- approval 수동 검증이 끝나면 `DashboardService` 또는 `PortfolioDashboardService`를 추가해 frontend 목업 타입에 가까운 응답 DTO를 설계합니다.
- 대시보드 API는 `GET /dashboard/portfolio?mode=paper|live`부터 만들고, 이후 `GET /dashboard/market-summaries`, `GET /dashboard/chart`, `GET /dashboard/strategies/:strategyId/latest-run`, `GET /dashboard/trade-logs` 순서로 확장합니다.
- 이후 `paper_orders` 테이블과 approval/audit log 테이블을 설계해 거래 로그와 승인 대기 UI를 더 정확한 데이터로 연결합니다.

2026-06-24 현재 중요한 진행 상태:

- `src/common/utils/is-record.ts`를 추가해 여러 validator와 외부 API response type guard에서 반복되던 `isRecord()` 함수를 공통 유틸로 분리했습니다.
- parse용 system prompt를 `src/strategy/data/parse-system.prompt.ts`로 정리했습니다.
- `StrategyParseService`에서 LLM 응답을 바로 검증하지 않고, 서버 기준 값으로 먼저 보정한 뒤 `isStructuredStrategy()`를 수행하도록 변경했습니다.
- parse 보정 시 `source.prompt`, `source.market`, `judgment`, `marketDataConfig.symbol`, `dataPermissions.allowMarketData`, `dataPermissions.allowNewsSearch`는 DB의 `StrategyEntity` 값을 기준으로 덮어씁니다.
- 이 변경으로 LLM prompt에는 없지만 validator에서는 필수였던 `judgment` 때문에 parse가 실패하던 문제를 해결했습니다.
- `src/strategy/types/ai-decision-result.type.ts`를 추가해 AI 판단 결과 타입을 정의했습니다.
- AI decision의 `decision` 값은 `buy`, `sell`, `hold`만 허용하고 `skip`은 제거했습니다.
- `suggestedOrder.sizeFraction`, `suggestedOrder.orderType`, `suggestedOrder.limitPrice`를 추가해 AI가 매수/매도 방향뿐 아니라 주문 비중 제안까지 반환할 수 있게 했습니다.
- `src/strategy/data/ai-decision-system-prompt.ts`를 추가해 AI decision 전용 system prompt를 분리했습니다.
- AI decision prompt는 `reason`, `evidence`, `riskNotes`를 한국어로 작성하도록 지시하고, `decision`, `orderType` 같은 enum 값은 영어로 유지하도록 지시합니다.
- AI decision prompt는 `reason`을 4~6개의 문장으로 상세히 작성하고 market data, portfolio, news, asset summary, 불확실성, 실패한 데이터가 있으면 언급하도록 지시합니다.
- `src/strategy/validators/ai-decision-result.validator.ts`를 추가해 AI decision JSON 응답을 검증합니다.
- `AiDecisionService`를 추가해 `LlmService` 호출, user prompt 생성, JSON parse, validator 검증, 최대 3회 재시도 흐름을 구현했습니다.
- `StrategyExecutionService`는 market data, portfolio, news, asset summary 수집 결과를 `AiDecisionService.decide()`에 전달합니다.
- `StrategyRunResult.decision`, `reason`, `confidence`는 이제 mock 값이 아니라 AI decision 결과를 사용합니다.
- `risk_check`, `order` 단계는 아직 mock/skipped 상태입니다.
- `DELETE /strategies/:id` 전략 삭제 API를 추가했습니다.
- 전략 삭제는 hard delete가 아니라 `deleted_at`을 기록하는 soft delete 방식으로 동작합니다.
- 삭제 대상 전략이 `active`이거나 `enabled=true`이면 삭제하지 않고 400을 반환합니다.
- 삭제 시 `strategyStatus=archived`, `enabled=false`, `nextRunAt=null`로 정리한 뒤 soft delete 처리합니다.
- Scalar 문서에 전략 삭제 API를 추가했습니다.
- `strategy-run-result.validator.ts`에서 `decision` 값은 `buy`, `sell`, `hold`만 허용하도록 정리했습니다.
- `src/strategy/types/risk-check-result.type.ts`를 추가해 risk check 결과 타입을 정의했습니다.
- `RiskCheckResult`는 `passed`, `retryable`, `reason`, `violations`, `adjustedOrder`를 포함합니다.
- `RiskViolationCode`에 `DECISION_HOLD`, `CONFIDENCE_TOO_LOW`, `SIZE_FRACTION_ZERO`, `SIZE_FRACTION_TOO_HIGH`, `ORDER_AMOUNT_TOO_LOW`, `LIVE_TRADING_NOT_SUPPORTED`, `REQUIRED_DATA_FAILED`를 정의했습니다.
- `MIN_UPBIT_ORDER_AMOUNT_KRW=5000` 상수를 추가해 Upbit 최소 주문 금액 기준을 risk check에서 사용할 수 있게 했습니다.
- `src/strategy/services/risk-check.service.ts`를 추가했습니다.
- `RiskCheckService`는 AI의 `suggestedOrder`, `confidence`, `riskPreferences`, 수집된 portfolio/market data step을 기준으로 주문 후보 생성 가능 여부를 판단합니다.
- `hold` 판단은 즉시 주문 후보 없음으로 처리하고 `DECISION_HOLD` violation을 남깁니다.
- `buy` 예상 주문 금액은 paper portfolio의 `cashBalance` 또는 live Upbit balances의 `KRW` balance를 기준으로 계산합니다.
- `sell` 예상 주문 금액은 현재 전략 market의 보유 수량과 최신 종가를 기준으로 계산합니다.
- paper sell은 `positions[].market`이 현재 market과 일치하는 포지션의 `quantity`를 사용합니다.
- live sell은 `KRW-BTC`에서 `BTC`를 추출해 Upbit balances의 `currency=BTC` balance를 사용합니다.
- 예상 주문 금액이 5,000원 미만이면 `ORDER_AMOUNT_TOO_LOW`, `retryable=true`로 처리합니다.
- 현재 `RiskCheckService`는 아직 `StrategyModule` provider와 `StrategyExecutionService` workflow에는 연결하지 않았습니다.
- 로컬 llama.cpp 연동 기준으로 parse와 run 테스트가 정상 동작하는 것을 수동 확인했습니다.

2026-06-24 기준 아래 검증은 통과했습니다.

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec eslint "src/common/**/*.ts" "src/auth/types/**/*.ts" "src/data-collect/**/*.ts" "src/strategy/**/*.ts"
pnpm exec eslint "src/strategy/data/ai-decision-system-prompt.ts"
```

다음 작업 방향:

- `RiskCheckService`를 `StrategyModule` providers에 등록합니다.
- `StrategyExecutionService`에 `RiskCheckService`를 주입합니다.
- 기존 mock `checkRisk()` 대신 `RiskCheckService.check()`를 호출하도록 연결합니다.
- `risk_check` step output에 `RiskCheckResult`를 저장합니다.
- risk check 실패 시 최종 run decision을 `hold`로 볼지, 원래 AI decision을 유지하되 order만 막을지 정책을 정합니다.
- risk check 실패가 `retryable=true`일 때 `AiDecisionService.revise()`를 호출하는 흐름을 추가할지 결정합니다.
- 이후 `strategyJudgmentMode` 기준으로 사용자 승인 대기 또는 paper order 생성 흐름을 연결합니다.

2026-06-23 현재 중요한 진행 상태:

- `src/paper-trading` 모듈을 추가했습니다.
- `PaperAccountEntity`와 `PaperPositionEntity`를 추가했습니다.
- `paper_accounts`, `paper_positions` 테이블 생성을 위한 migration을 생성하고 적용했습니다.
- `PaperPortfolioService.getPortfolio()`를 추가해 사용자별 paper account와 market별 paper position을 조회합니다.
- `PaperPortfolioService.createDefaultAccountForUser()`를 추가해 기본 가상 계좌를 생성합니다.
- 로컬 회원가입 시 `UserService.createLocalUser()`에서 사용자 저장 후 기본 paper account를 자동 생성합니다.
- Naver/Kakao 소셜 로그인 흐름에서도 로그인 대상 user가 확정된 뒤 기본 paper account를 보장하도록 변경했습니다.
- 이미 존재하는 사용자에게는 `paper_accounts` backfill SQL로 기본 가상 계좌를 채울 수 있습니다.
- `StrategyExecutionService.collectPortfolio()`를 `strategy.strategyMode` 기준으로 분기했습니다.
- `paper` 전략은 `PaperPortfolioService`의 paper portfolio를 조회합니다.
- `live` 전략은 기존처럼 Upbit credential 복호화 후 Upbit `/v1/accounts`를 조회합니다.
- paper 전략 실행 시 Upbit credential 없이도 portfolio step이 성공하는 방향으로 정리했습니다.
- `src/news` 모듈을 `src/data-collect` 모듈로 확장/이동했습니다.
- `DataCollectModule`은 현재 뉴스 수집과 Upbit DataLab 자산 요약 수집 책임을 가집니다.
- `NewsDataService`가 Naver News Search API를 호출합니다.
- `createNewsQuery()`를 추가해 `KRW-BTC` 같은 market 값을 뉴스 검색어로 변환합니다.
- `StrategyExecutionService.collectNews()`를 async로 변경했고, `allowNewsSearch=true`일 때 뉴스를 수집합니다.
- `allowNewsSearch=false`인 전략은 외부 뉴스 API를 호출하지 않고 `news` step을 `skipped`로 저장합니다.
- `AssetSummaryService`를 추가해 `https://datalab.upbit.com/assets/{SYMBOL}/summary` 페이지의 Next.js dehydrated data를 읽고 자산 요약 데이터로 변환합니다.
- `StrategyExecutionService`에 `asset_summary` step을 추가해 AI decision 전에 자산 요약 데이터를 항상 수집합니다.
- `KRW-BTC`, `KRW-XRP` 기준으로 자산 요약 파싱이 동작하는 것을 수동 확인했습니다.
- `StrategyEntity`에 `allowMarketData`, `allowNewsSearch`, `strategyJudgmentMode`를 추가했습니다.
- `CreateStrategyDto`, `UpdateStrategyDto`, `StrategyResponseDto`, Scalar docs에 위 설정값을 반영했습니다.
- `StructuredStrategy`에서 사용하지 않는 `allowOnchainData`를 제거했습니다.
- parse 저장 직전 `allowMarketData`, `allowNewsSearch`, `judgment`를 서버의 `StrategyEntity` 값으로 보정합니다.
- `1782240000000-AddStrategyDataPermissions.ts` migration 하나에 `allow_market_data`, `allow_news_search`, `strategy_judgment_mode` 추가를 합쳤습니다.
- 이 migration은 아직 실행 전이므로 다음 작업 시작 시 `pnpm migration:run`이 필요합니다.
- 2026-06-23 기준 아래 검증은 통과했습니다.

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/data-collect/**/*.ts" "src/strategy/services/strategy-execution.service.ts" "src/strategy/types/strategy-run-result.type.ts" "src/strategy/strategy.module.ts"
```

다음 작업 방향:

- DB에 아직 적용하지 않은 migration을 실행합니다.
- Scalar에서 전략 생성/수정/parse 응답에 `allowMarketData`, `allowNewsSearch`, `strategyJudgmentMode`, `structuredStrategy.judgment`가 잘 보이는지 확인합니다.
- `isStructuredStrategy()`가 `judgment` 값을 검증하는지 확인합니다.
- 그 다음 순서로 AI decision, risk check, paper order 순서로 확장합니다.

2026-06-22 현재 중요한 진행 상태:

- `StrategyRunService.runMockByStrategy()`를 `StrategyRunService.runByStrategy()`로 변경했습니다.
- `StrategyRunService` 안에 있던 mock workflow 책임을 `src/strategy/services/strategy-execution.service.ts`의 `StrategyExecutionService`로 분리했습니다.
- `StrategyRunService`는 전략 조회, 실행 가능 여부 확인, `strategy_runs` row 생성, 성공/실패 상태 저장, `nextRunAt` 갱신에 집중합니다.
- `StrategyExecutionService`는 `strategy.structuredStrategy`를 검증한 뒤 market data, portfolio, news, AI decision, risk check, order 단계의 `StrategyRunResult`를 생성합니다.
- `POST /strategies/:id/run` 수동 실행 API를 추가했습니다.
- `ApiRunStrategy()`를 추가해 Scalar에서 전략 수동 실행 API를 확인할 수 있게 했습니다.
- scheduler는 이제 조회된 전략마다 `StrategyRunService.runByStrategy()`를 호출합니다.
- scheduler의 각 전략 실행을 `try/catch`로 감싸, 특정 전략 실행이 실패해도 다음 전략 실행 루프가 멈추지 않도록 1차 실패 격리를 추가했습니다.
- `StrategyRunService.assertNoRunningRun()`을 추가해 같은 전략의 `running` 실행 이력이 이미 있으면 중복 실행을 막습니다.
- `src/upbit` 모듈을 추가해 Upbit public/private API 연동 책임을 분리했습니다.
- `UpbitPublicService`는 Upbit 분봉 캔들 API를 호출하고, `marketDataConfig.timeframes`의 최대 3개 timeframe에 대해 실제 캔들 데이터를 수집합니다.
- `SystemPrompt`를 보강해 LLM parse 결과가 `"1m"`, `"3m"`, `"5m"`, `"10m"`, `"15m"`, `"30m"`, `"1h"`, `"4h"` 중 1~3개 timeframe을 선택하도록 유도합니다.
- `UpbitCredentialEntity`와 `CreateUpbitCredentials` migration을 추가해 사용자별 Upbit access key/secret key를 암호화 저장합니다.
- `PUT /upbit/credential`, `GET /upbit/credential` API를 추가했고 Scalar 문서도 연결했습니다.
- `UpbitAuthService`는 credential 암호화/복호화와 Upbit JWT 생성 책임을 가집니다.
- `UpbitPrivateService`는 DB에서 복호화한 credential을 입력받아 Upbit `/v1/accounts`를 호출합니다.
- 2026-06-22 당시 `StrategyExecutionService`의 portfolio step은 Upbit credential 기반 실제 자산 조회를 사용했습니다.
- 2026-06-22 당시 paper trading 전용 portfolio 구조는 아직 없었고, 다음 작업은 `paper` 전략은 paper portfolio를 보고 `live` 전략은 Upbit 실제 자산을 보도록 분기하는 것이었습니다.
- 2026-06-22 기준 아래 검증은 통과했습니다.

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/upbit/**/*.ts" "src/strategy/**/*.ts"
```

2026-06-22 당시 다음 작업 방향:

- `StrategyExecutionService.collectPortfolio()`를 `strategy.strategyMode` 기준으로 분기합니다.
- `paper` 전략은 paper trading용 가상 포트폴리오를 조회하고, `live` 전략은 Upbit 실제 `/v1/accounts`를 조회하도록 바꿉니다.
- 처음에는 `PaperPortfolioService` mock으로 시작하고, 이후 `paper_accounts`, `paper_balances`, `paper_orders` 같은 테이블을 설계합니다.
- live trading은 `user.liveTradingEnabled`, human review, risk check가 준비되기 전까지 주문 실행으로 연결하지 않습니다.
- 뉴스 수집과 AI decision은 이후 단계에서 실제 서비스로 분리합니다.

2026-06-21 현재 중요한 진행 상태:

- `@nestjs/schedule`을 추가했고 `AppModule`에 `ScheduleModule.forRoot()`를 등록했습니다.
- `src/strategy/services/strategy-scheduler.service.ts`를 추가했습니다.
- `StrategySchedulerService`는 `@Cron('*/1 * * * *')`로 1분마다 실행됩니다.
- scheduler는 `strategyStatus=active`, `enabled=true`, `nextRunAt <= now`인 전략을 조회합니다.
- 조회된 전략마다 내부적으로 `StrategyRunService.runByStrategy()`를 호출합니다.
- active 전략이 scheduler를 통해 실행되고 `strategy_runs`에 이력이 기록되는 것까지 수동 확인했습니다.
- `GET /strategy-runs`, `GET /strategy-runs/:runId` 조회 API를 추가했습니다.
- `strategy_runs`는 사용자가 직접 생성하는 리소스가 아니라 서버 내부 실행 흐름에서 생성되는 실행 이력으로 취급합니다.
- `src/strategy/docs/strategy-run-api.docs.ts`를 추가해 Scalar 문서에 전략 실행 이력 목록/상세 API를 표시합니다.
- `FindStrategyRunsQueryDto`를 추가해 `page`, `limit`, `strategyId`, `status` 필터를 지원합니다.
- `strategyId` query는 `@Type(() => Number)`, `@IsInt()`, `@Min(1)`로 검증합니다.
- 2026-06-21 기준 아래 검증은 통과했습니다.

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/strategy/**/*.ts"
```

이 시점의 다음 작업 방향:

- `StrategyRunService` 안의 private `executeMockWorkflow()`를 별도 `StrategyExecutionService`로 분리합니다. 2026-06-22 기준 이 작업은 완료되었습니다.
- `StrategyRunService`는 run row 생성, 상태 전환, 실패 기록, `nextRunAt` 갱신처럼 실행 이력 관리에 집중하도록 정리합니다. 2026-06-22 기준 이 작업은 완료되었습니다.
- `StrategyExecutionService`는 시장 데이터 조회, 뉴스 조회, AI 판단, 리스크 체크, 주문 보류/생성 판단을 단계별 workflow 형태로 담당합니다. 2026-06-22 기준 mock 단계로 1차 분리되었습니다.
- 그 다음 단계에서 `StrategyDataCollectionService`, `MarketDataService`, `PortfolioService`, `NewsDataService` skeleton을 붙입니다.
- scheduler 중복 실행 방지는 `running` run 존재 여부 검사로 1차 방어를 추가했습니다. 실제 운영 형태로 가기 전에는 DB lock, claim 컬럼, 또는 트랜잭션 기반 원자적 claim 정책을 추가해야 합니다.

2026-06-20 현재 중요한 진행 상태:

- `POST /strategies/:id/parse`와 로컬 llama.cpp/OpenAI-compatible LLM 연동을 수동 테스트했고, parse가 실제 LLM과 연결되어 동작하는 것까지 확인했습니다.
- 전략 실행 이력을 저장하기 위해 `src/strategy/entities/strategy-run.entity.ts`를 추가했습니다.
- `strategy_runs` 테이블 migration인 `1781957638841-CreateStrategyRuns.ts`를 생성했고 DB에 적용했습니다.
- `StrategyRunStatus` enum을 추가해 실행 상태를 `running`, `succeeded`, `failed`, `cancelled`로 관리합니다.
- `StrategyRunResult` 타입을 추가해 실행 결과를 `decision`, `reason`, `confidence`, `steps`, `strategy` 구조로 저장하도록 했습니다.
- `isStrategyRunResult()` 런타임 validator를 추가해 workflow/AI 결과가 최소 실행 결과 계약을 만족하는지 검사합니다.
- `StrategyRunResponseDto`를 추가해 strategy run 응답 형태를 entity와 분리했습니다.
- `StrategyRunService.runMockByStrategy()` 초안을 추가했습니다.
- 실행 전에는 전략 소유자, active 상태, enabled 여부, `isStructuredStrategy()` 통과 여부를 검사합니다.
- 실행 시작 시 `strategy_runs` row를 먼저 `running` 상태로 저장하고, mock workflow가 끝나면 `succeeded` 또는 `failed`로 업데이트합니다.
- 성공 시 `calculateNextRunAt()`을 사용해 전략의 다음 실행 시간 `nextRunAt`을 갱신합니다.
- `StrategyModule`에 `StrategyRunEntity`와 `StrategyRunService`를 등록했습니다.
- 2026-06-20 기준 아래 검증은 통과했습니다.

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/strategy/**/*.ts"
```

이 시점의 다음 작업 방향:

- `StrategyRunController`를 추가해 실행 이력 조회 API를 연결합니다.
- Swagger/Scalar 문서를 추가해 strategy run 응답 예시와 실행 조건을 확인할 수 있게 합니다.
- scheduler를 통해 active 전략 실행, `running -> succeeded/failed` 저장, `nextRunAt` 갱신을 확인합니다. 2026-06-21 기준 이 작업은 수동 확인 완료 상태입니다.
- 그다음 scheduler worker를 설계합니다. scheduler는 `enabled=true`, `strategyStatus=active`, `nextRunAt <= now`인 전략을 찾아 run을 생성하는 역할을 맡습니다.
- scheduler 단계에서는 같은 전략이 동시에 중복 실행되지 않도록 DB lock, claim 컬럼, 또는 running run 존재 여부 검사를 추가합니다.
- 이후 mock workflow를 실제 LangGraph/AI 실행 workflow로 교체합니다.

2026-06-19 현재 중요한 진행 상태:

- `POST /strategies/:id/parse`는 이제 mock 생성이 아니라 `StrategyParseService`에서 `LlmService`를 통해 로컬 llama.cpp/OpenAI-compatible API를 호출하는 구조로 변경했습니다.
- parse 결과 구조를 `src/strategy/types/structured-strategy.type.ts`의 `StructuredStrategy` 타입으로 고정했습니다.
- `StructuredStrategy`는 `version=1`, `kind=ai_execution_plan`, `source`, `aiInstructions`, `dataPermissions`, `marketDataConfig`, `riskPreferences`, `humanReview`를 포함합니다.
- `src/llm/llm.module.ts`, `src/llm/services/llm.service.ts`, `src/llm/dto/llm-chat-completion.response.dto.ts`를 추가했습니다.
- `LlmService.createChatCompletionContent()`는 `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_TIMEOUT_MS`, `LLM_MAX_TOKENS`, `LLM_TEMPERATURE`를 읽어 `/v1/chat/completions`를 호출하고 `choices[0].message.content` 문자열만 반환합니다.
- JSON parse와 schema 검증 책임은 `StrategyParseService`가 갖습니다.
- `StrategyParseService.parseStrategy()`는 최대 3회 retry합니다.
- LLM 응답이 깨진 JSON이면 exception으로 즉시 중단하지 않고 `previousInvalidResult`에 `rawContent`와 실패 이유를 담아 다음 retry prompt에 전달합니다.
- LLM 응답이 JSON이지만 `StructuredStrategy` schema를 통과하지 못해도 다음 retry prompt에 이전 실패 결과를 전달합니다.
- 유효한 `StructuredStrategy`를 얻으면 저장 전에 `source.prompt`, `source.market`, `marketDataConfig.symbol`을 DB의 `StrategyEntity` 값으로 보정합니다.
- `src/strategy/validators/structured-strategy.validator.ts`에 `isStructuredStrategy()` 런타임 validator를 추가했습니다.
- `PATCH /strategies/:id/status`에서 active 전환 시 단순히 `structuredStrategy` 존재 여부만 보지 않고, `isStructuredStrategy()`를 통과해야 활성화되도록 보강했습니다.
- 실제 LLM instruction은 `src/strategy/data/system.prompt.ts`의 `SystemPrompt`로 분리했습니다.
- `StrategyModule` providers에 `StrategyParseService`를 등록했습니다.
- `StrategyModule` imports에 `LlmModule`을 등록했습니다.
- `src/config/env.validation.ts`에 `LLM_*` 환경 변수를 추가했고, `LLM_TEMPERATURE`를 위해 `parseNumber()` helper를 추가했습니다.
- 2026-06-19 기준 아래 검증은 통과했습니다.

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/**/*.ts"
```

이 시점의 다음 작업 방향:

- 집에서 로컬 `llama.cpp` / `llama-server`를 띄운 뒤 Scalar에서 `POST /strategies/:id/parse`를 실제 호출해 봅니다. 2026-06-20 기준 이 작업은 수동 테스트 완료 상태입니다.
- parse가 성공하면 `structuredStrategy.kind=ai_execution_plan`, `source`, `marketDataConfig.symbol`, active 전환 성공 여부를 확인합니다.
- parse가 실패하면 llama.cpp 응답 형식, `SystemPrompt`, `LLM_MAX_TOKENS`, `LLM_TEMPERATURE`, retry prompt를 조정합니다.

2026-06-18 이전 중요한 진행 상태:

- `PATCH /strategies/:id` 전략 수정 API까지 구현했습니다.
- 전략 수정은 `enabled=true`이거나 `strategyStatus=active`인 경우 막도록 1차 정책을 넣었습니다.
- 전략 수정 시 `name`, `market`, `prompt`, `intervalMinutes`, `scheduleAnchorAt` 중 하나라도 바뀌면 기존 `structuredStrategy`와 `nextRunAt`을 초기화하여 다시 parse하도록 했습니다.
- `PATCH /strategies/:id/status` 전략 상태 변경 API까지 구현했습니다.
- 상태 변경은 `draft/paused -> active`, `active -> paused`, `draft/paused -> archived` 중심으로 처리합니다.
- `active` 전환은 `structuredStrategy`가 있어야 가능하도록 막았습니다.
- `active -> archived`는 바로 허용하지 않고 먼저 `paused`로 바꾸도록 막았습니다.
- `archived` 전략은 일반 수정과 상태 변경을 막도록 했습니다.
- `POST /strategies/:id/parse` mock 구조화 API까지 구현했습니다.
- 현재 parse 결과는 세부 매매 룰 목록이 아니라 AI 실행 지침(`ai_execution_plan`)입니다.
- parse 성공 후 `structuredStrategy`가 저장되면 `PATCH /strategies/:id/status`에서 active 전환을 테스트할 수 있습니다.
- 아직 실제 LLM 전략 구조화, scheduler worker, LangGraph 실행 run, k3s job/pod 실행 구조는 만들지 않았습니다.

## 1. 프로젝트 방향

Agentrade는 Next.js 프론트엔드와 NestJS 백엔드를 기반으로 만드는 AI 투자 시뮬레이션/전략 실행 포트폴리오 프로젝트입니다.

핵심 메시지는 단순 자동매매 봇이 아니라, 다음 안전장치를 가진 AI 의사결정 제품입니다.

- 사용자가 자연어로 투자 전략을 작성한다.
- AI가 전략을 구조화한다.
- 백엔드 스케줄러가 정해진 주기마다 전략 실행을 요청한다.
- 실행 워크플로우는 시장 데이터 수집, 지표 계산, AI 판단, 리스크 검사, 승인, 주문 실행 또는 보류를 단계적으로 처리한다.
- 일반 사용자는 가상 매매만 가능하다.
- 실거래는 관리자 권한, 기능 플래그, 리스크 검사, 승인 절차를 모두 통과해야 한다.
- 중요한 판단, 승인, 주문, 실패 이력은 audit log로 남긴다.

현재 백엔드는 이 전체 제품의 인증/사용자 기반과 전략 초안 관리, AI 실행 지침 구조화 API를 먼저 만드는 단계입니다.

## 2. 기술 스택

- Package manager: `pnpm`
- Framework: NestJS
- Language: TypeScript
- Database: Local PostgreSQL
- ORM: TypeORM
- API Docs: Scalar + OpenAPI
- Validation: `class-validator`, Nest `ValidationPipe`
- Scheduler: `@nestjs/schedule`
- Auth:
  - local email/password
  - bcrypt password hashing
  - JWT access token
  - JWT refresh token
  - HttpOnly cookie
  - DB-backed auth session
  - Naver OAuth
  - Kakao OAuth
- Test runner: Jest

Docker는 현재 사용하지 않습니다. 로컬 PostgreSQL에 직접 연결합니다.

## 3. 현재 완료된 작업 요약

### 3.1 기본 백엔드 환경

`backend` 폴더에 NestJS 프로젝트가 구성되어 있습니다.

주요 명령어:

```bash
pnpm install
pnpm start
pnpm start:dev
pnpm lint
pnpm build
pnpm test
pnpm typeorm migration:show
pnpm migration:run
pnpm migration:generate -- src/database/migrations/SomeMigrationName
```

`package.json`의 `build`는 Nest build 이후 `tsc-alias`를 실행합니다. 그래서 `@/*` alias가 `dist`에서도 정상 동작합니다.

### 3.2 Path Alias

상대 경로 import가 깊어지는 문제를 줄이기 위해 `@/*` alias를 사용합니다.

예:

```ts
import { UserService } from '@/user/services/user.service';
import { UserRole } from '@/common/enums/user-role.enum';
```

Jest에서도 alias를 인식하도록 `moduleNameMapper`가 설정되어 있습니다.

### 3.3 환경 변수

`src/config/env.validation.ts`에서 환경 변수를 검증하고 일부 값은 number로 파싱합니다.

필요한 주요 환경 변수:

```env
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=agentrade
DB_PASSWORD=agentrade
DB_NAME=agentrade

TYPEORM_SYNCHRONIZE=false
TYPEORM_LOGGING=true

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_TTL_SECONDS=1800
JWT_REFRESH_TTL_SECONDS=604800

NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
NAVER_CALLBACK_URL=http://localhost:4000/auth/naver/callback

KAKAO_REST_API_KEY=...
KAKAO_CLIENT_SECRET=...
KAKAO_CALLBACK_URL=http://localhost:4000/auth/kakao/callback

FRONTEND_AUTH_REDIRECT_URL=http://localhost:3000
```

로컬 `llama.cpp` 연동을 위해 추가한 LLM 환경 변수:

```env
LLM_PROVIDER=llama_cpp
LLM_BASE_URL=http://127.0.0.1:8080/v1
LLM_API_KEY=local-dev-key
LLM_MODEL=agentrade-local
LLM_TIMEOUT_MS=120000
LLM_MAX_TOKENS=1200
LLM_TEMPERATURE=0.1
```

로컬 `llama.cpp` 서버 실행 예:

```bash
./build/bin/llama-server \
  -m ~/models/your-model.Q4_K_M.gguf \
  --host 127.0.0.1 \
  --port 8080 \
  --alias agentrade-local \
  --api-key local-dev-key
```

LLM 변수 의미:

- `LLM_PROVIDER`: 현재 LLM 제공자입니다. 우선 `llama_cpp`로 둡니다.
- `LLM_BASE_URL`: `llama-server`의 OpenAI-compatible API base URL입니다. `/v1`까지 포함합니다.
- `LLM_API_KEY`: `llama-server --api-key` 값과 맞춥니다. 로컬 개발용이라도 명시하는 편이 좋습니다.
- `LLM_MODEL`: `llama-server --alias` 값과 맞춥니다.
- `LLM_TIMEOUT_MS`: 로컬 모델은 느릴 수 있으므로 120초 정도로 시작합니다.
- `LLM_MAX_TOKENS`: 전략 구조화 JSON 생성에 사용할 최대 출력 토큰입니다.
- `LLM_TEMPERATURE`: parse는 창의성보다 일관성이 중요하므로 낮게 시작합니다.

주의:

- 실제 secret 값은 문서에 남기지 않습니다.
- `.env`는 커밋하지 않습니다.
- `JWT_ACCESS_TTL_SECONDS`, `JWT_REFRESH_TTL_SECONDS`는 `env.validation.ts`에서 number로 파싱하므로 서비스에서는 `ConfigService.getOrThrow<number>()`로 가져옵니다.
- `LLM_TEMPERATURE`는 소수 값이므로 `parsePositiveInteger()`가 아니라 `parseNumber()` helper로 파싱합니다.
- 운영 환경에서는 프론트 `https://agentrade.ldy-studio.com`, 백엔드 `https://api-agentrade.ldy-studio.com`처럼 서브도메인을 분리할 계획입니다.

### 3.4 TypeORM + PostgreSQL

TypeORM 연결 관련 파일:

- `src/config/database.config.ts`
- `src/database/data-source.ts`

현재 DB 운영 원칙:

- `TYPEORM_SYNCHRONIZE=false`
- 스키마 변경은 migration으로 반영
- entity 변경 후 migration 생성
- migration 파일 확인 후 DB에 적용

현재 적용된 migration:

- `1779862091102-CreateUsers.ts`
- `1779945199913-CreateAuthSessions.ts`
- `1780033891985-CreateSocialAccounts.ts`
- `1780380362818-CreateStrategies.ts`
- `1781957638841-CreateStrategyRuns.ts`

생성됐지만 아직 실행 전인 migration:

- `1782240000000-AddStrategyDataPermissions.ts`
  - `strategies.allow_market_data`
  - `strategies.allow_news_search`
  - `strategy_judgment_mode` enum
  - `strategies.strategy_judgment_mode`

현재 핵심 테이블:

- `users`
- `auth_sessions`
- `social_accounts`
- `strategies`
- `strategy_runs`
- `migrations`

이전에 초기 실험 과정에서 생겼던 `User`, `SocialAccount` 같은 대문자 테이블은 현재 구조에서는 필요하지 않습니다. 현재 기준은 소문자 `users`, `auth_sessions`, `social_accounts`입니다.

### 3.5 Scalar API Docs

문서 URL:

```text
http://localhost:4000/docs
```

OpenAPI JSON:

```text
http://localhost:4000/openapi.json
```

`src/main.ts`에서 완료된 설정:

- global prefix 제거
- CORS credentials 허용
- cookie parser 등록
- global validation pipe 등록
- Scalar docs 등록
- OpenAPI cookie auth scheme 등록

등록된 cookie auth:

- `access_token`
- `refresh_token`

중요:

`ApiCookieAuth()`와 `addCookieAuth()`는 문서용 설정입니다. 실제 인증은 `JwtAuthGuard`와 `JwtStrategy`가 처리합니다.

## 4. 현재 코드 구조

주요 파일:

```text
src
├── main.ts
├── app.module.ts
├── common
│   ├── dto
│   │   └── pagination-query.dto.ts
│   ├── enums
│       ├── auth-provider.enum.ts
│       └── user-role.enum.ts
│   ├── types
│   │   └── paginated.type.ts
│   └── utils
│       └── create-pagination-meta.ts
├── config
│   ├── database.config.ts
│   └── env.validation.ts
├── database
│   ├── data-source.ts
│   ├── migrations
│   └── utils
│       └── is-unique-violation.ts
├── user
│   ├── controllers
│   │   └── user.controller.ts
│   ├── dto
│   │   └── user.response.dto.ts
│   ├── entities
│   │   └── user.entity.ts
│   ├── services
│   │   └── user.service.ts
│   └── user.module.ts
├── auth
    ├── auth.module.ts
    ├── controllers
    │   └── auth.controller.ts
    ├── cookies
    │   ├── auth-cookie.extractor.ts
    │   └── cookie.options.ts
    ├── decorators
    │   └── current-user.decorator.ts
    ├── docs
    │   └── auth-api.docs.ts
    ├── dto
    │   ├── login.dto.ts
    │   ├── login.result.dto.ts
    │   ├── oauth-callback-query.dto.ts
    │   └── register.dto.ts
    ├── entities
    │   ├── auth-session.entity.ts
    │   └── social-account.entity.ts
    ├── guards
    │   └── jwt-auth.guard.ts
    ├── services
    │   ├── auth-session.service.ts
    │   ├── auth.service.ts
    │   ├── kakao-oauth.service.ts
    │   ├── naver-oauth.service.ts
    │   └── social-account.service.ts
    ├── strategies
    │   └── jwt.strategy.ts
    └── types
        ├── authenticated-user.type.ts
        ├── jwt-payload.type.ts
        ├── kakao
        └── naver
└── strategy
    ├── controllers
    │   ├── strategy-run.controller.ts
    │   └── strategy.controller.ts
    ├── docs
    │   ├── strategy-api.docs.ts
    │   └── strategy-run-api.docs.ts
    ├── dto
    │   ├── create-strategy.dto.ts
    │   ├── find-strategy-run.query.dto.ts
    │   ├── find-strategy.query.dto.ts
    │   ├── strategy-run-response.dto.ts
    │   ├── strategy-response.dto.ts
    │   ├── update-strategy.dto.ts
    │   └── update-strategy-status.dto.ts
    ├── entities
    │   ├── strategy-run.entity.ts
    │   └── strategy.entity.ts
    ├── enums
    │   ├── exchange.enum.ts
    │   ├── strategy-run-status.enum.ts
    │   ├── strategy-mode.enum.ts
    │   └── strategy-status.enum.ts
    ├── services
    │   ├── strategy-parse.service.ts
    │   ├── strategy-run.service.ts
    │   ├── strategy-scheduler.service.ts
    │   └── strategy.service.ts
    ├── types
    │   ├── strategy-run-result.type.ts
    │   └── structured-strategy.type.ts
    ├── utils
    │   └── calculate-next-run-at.ts
    ├── validators
    │   ├── strategy-run-result.validator.ts
    │   └── structured-strategy.validator.ts
    └── strategy.module.ts
```

## 5. User 도메인

`user` 도메인은 서비스 내부 사용자 정보를 저장하고 조회합니다.

주요 파일:

- `src/user/entities/user.entity.ts`
- `src/user/services/user.service.ts`
- `src/user/dto/user.response.dto.ts`

현재 `UserEntity` 주요 필드:

- `id`
- `email`
- `password`
- `name`
- `role`
- `provider`
- `providerId`
- `paperTradingEnabled`
- `liveTradingEnabled`
- `createdAt`
- `updatedAt`
- `deletedAt`

현재 상태:

- 로컬 회원가입은 `provider=local`로 user를 생성합니다.
- 소셜 로그인은 `social_accounts` 테이블을 따로 사용합니다.
- `users.provider`, `users.provider_id`는 초기에 넣어둔 필드라 아직 남아 있습니다.

나중에 결정할 점:

- `social_accounts`가 완전히 기준 구조가 되면 `users.provider`, `users.provider_id`를 제거할지 검토합니다.
- 제거하려면 별도 migration으로 정리합니다.

## 6. Auth 도메인

현재 인증 관련 API:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/refresh`
- `GET /auth/naver`
- `GET /auth/naver/callback`
- `GET /auth/kakao`
- `GET /auth/kakao/callback`

`AuthController`는 HTTP 요청/응답, cookie 설정, redirect를 담당합니다.

`AuthService`는 로컬 회원가입/로그인, token 발급, refresh, logout, me, social user 연결의 중심 로직을 담당합니다.

`NaverOauthService`, `KakaoOauthService`는 provider별 OAuth token/profile 통신과 provider profile 매핑을 담당합니다.

`AuthSessionService`는 refresh token 세션 저장, 조회, rotate, revoke를 담당합니다.

`SocialAccountService`는 외부 provider 계정과 내부 user 연결을 담당합니다.

## 7. 로컬 인증 흐름

### 7.1 회원가입

Endpoint:

```http
POST /auth/register
```

흐름:

1. `LocalRegisterDto`로 email, password, name을 받습니다.
2. `ValidationPipe`가 DTO를 검증합니다.
3. `AuthService.register()`가 이메일 중복을 검사합니다.
4. 비밀번호를 bcrypt로 hash합니다.
5. `UserService.createLocalUser()`로 user를 생성합니다.
6. 응답은 `UserResponseDto`로 제한합니다.

응답에는 password가 포함되지 않습니다.

### 7.2 로그인

Endpoint:

```http
POST /auth/login
```

흐름:

1. `LocalLoginDto`로 email, password를 받습니다.
2. `UserService.findByEmailWithPassword()`로 password까지 포함해서 사용자를 조회합니다.
3. bcrypt `compare()`로 입력 비밀번호와 저장된 hash를 비교합니다.
4. 로그인 성공 시 session id를 `randomUUID()`로 생성합니다.
5. access token payload와 refresh token payload를 만듭니다.
6. access token과 refresh token을 서로 다른 secret으로 발급합니다.
7. refresh token 원문은 DB에 저장하지 않고 bcrypt hash로 저장합니다.
8. `auth_sessions`에 세션 row를 생성합니다.
9. controller가 access token과 refresh token을 HttpOnly cookie로 내려줍니다.
10. 응답 body는 user 정보만 반환합니다.

Cookie:

- `access_token`
  - `httpOnly=true`
  - `path=/`
  - 짧은 수명
- `refresh_token`
  - `httpOnly=true`
  - `path=/auth`
  - 긴 수명

`refresh_token`의 path를 `/auth`로 제한한 이유는 refresh/logout 같은 인증 API에만 refresh token이 자동 전송되게 하기 위해서입니다.

### 7.3 토큰 재발급

Endpoint:

```http
POST /auth/refresh
```

흐름:

1. request cookie에서 `refresh_token`을 꺼냅니다.
2. refresh token이 없으면 401을 반환합니다.
3. `JWT_REFRESH_SECRET`으로 refresh token을 검증합니다.
4. payload의 `tokenType`이 `refresh`인지 확인합니다.
5. payload의 `sid`로 `auth_sessions`를 조회합니다.
6. 세션이 없거나 revoke 되었거나 만료되었으면 401을 반환합니다.
7. DB에 저장된 `refreshTokenHash`와 전달된 refresh token을 bcrypt compare합니다.
8. hash 비교가 실패하면 해당 세션을 revoke합니다.
9. 사용자 정보를 조회합니다.
10. 새 access token과 새 refresh token을 발급합니다.
11. 새 refresh token hash로 DB 세션을 rotate합니다.
12. 새 cookie를 내려줍니다.
13. 응답 body는 user 정보만 반환합니다.

이 구조는 refresh token rotation입니다.

refresh token을 DB에 저장하는 이유:

- 로그아웃 시 세션을 즉시 무효화하기 위해
- refresh token 재사용을 감지하기 위해
- 사용자별/기기별 세션 관리로 확장하기 위해
- 장기 토큰 탈취 피해를 줄이기 위해

원문이 아니라 hash로 저장하는 이유:

- DB가 유출되어도 refresh token 원문을 바로 사용할 수 없게 하기 위해
- refresh token은 장기 credential이므로 password처럼 원문 저장을 피해야 하기 때문

### 7.4 내 정보 조회

Endpoint:

```http
GET /auth/me
```

흐름:

1. `@UseGuards(JwtAuthGuard)`가 먼저 실행됩니다.
2. `JwtAuthGuard`는 Passport의 `jwt` strategy를 호출합니다.
3. `JwtStrategy`가 request cookie에서 `access_token`을 추출합니다.
4. `JWT_ACCESS_SECRET`으로 access token을 검증합니다.
5. payload의 `sid`로 `auth_sessions`를 조회합니다.
6. 세션이 없거나 revoke 되었거나 만료되었으면 401을 반환합니다.
7. 검증에 통과하면 `request.user`에 현재 사용자 정보를 넣습니다.
8. `@CurrentUser()` 데코레이터가 `request.user`를 controller method에 전달합니다.
9. `AuthService.me()`가 user id로 최신 사용자 정보를 조회합니다.
10. `UserResponseDto`를 반환합니다.

중요:

`CurrentUser` 데코레이터는 인증을 수행하지 않습니다. 인증은 `JwtAuthGuard`와 `JwtStrategy`가 수행합니다.

### 7.5 로그아웃

Endpoint:

```http
POST /auth/logout
```

흐름:

1. request cookie에서 `refresh_token`을 꺼냅니다.
2. refresh token이 있으면 검증 후 payload의 `sid`를 얻습니다.
3. 해당 `auth_sessions` row의 `revoked_at`을 현재 시간으로 업데이트합니다.
4. response에서 `access_token`, `refresh_token` cookie를 clear합니다.
5. `{ "success": true }`를 반환합니다.

로그아웃은 idempotent하게 설계했습니다. token이 없거나 이미 만료된 상태여도 클라이언트 입장에서는 로그아웃 완료로 처리할 수 있습니다.

## 8. Social Account 구조

외부 provider 계정을 내부 user와 연결하기 위해 `social_accounts` 테이블을 사용합니다.

`SocialAccountEntity` 역할:

- 외부 provider 계정 정보를 저장합니다.
- 한 명의 user가 Naver/Kakao 등 여러 provider 계정을 연결할 수 있게 합니다.
- `users`는 서비스 내부 사용자, `social_accounts`는 외부 인증 계정이라는 책임 분리를 만듭니다.

현재 주요 컬럼:

```text
id
user_id
provider
provider_user_id
email
display_name
created_at
updated_at
```

중요 제약:

```text
unique(provider, provider_user_id)
foreign key user_id -> users(id) on delete cascade
```

현재 `SocialAccountService` 주요 메서드:

- `findByProviderAndProviderUserId(provider, providerUserId)`
- `findByProviderAndProviderUserIdWithUser(provider, providerUserId)`
- `create({ userId, provider, providerUserId, email, displayName })`

## 9. Naver OAuth 흐름

현재 Naver OAuth는 1차 구현되어 있습니다.

Endpoint:

```http
GET /auth/naver
GET /auth/naver/callback
```

흐름:

1. 사용자가 `/auth/naver`로 접근합니다.
2. 서버가 `randomUUID()`로 state를 생성합니다.
3. `naver_oauth_state` HttpOnly cookie를 저장합니다.
4. Naver authorization URL로 redirect합니다.
5. Naver가 `/auth/naver/callback?code=...&state=...`로 redirect합니다.
6. 서버가 query state와 cookie state를 비교합니다.
7. state 검증 실패 시 401을 반환합니다.
8. state 검증 성공 시 code를 Naver token API로 교환합니다.
9. Naver access token으로 profile API를 조회합니다.
10. `provider=NAVER`, `providerUserId=Naver profile id` 기준으로 social account를 찾습니다.
11. 기존 social account가 있으면 연결된 user로 Agentrade login result를 생성합니다.
12. 기존 social account가 없으면 email 기준으로 기존 user를 찾거나 새 user를 생성합니다.
13. `social_accounts` row를 생성합니다.
14. Agentrade access/refresh token을 발급합니다.
15. HttpOnly cookie를 내려줍니다.
16. `FRONTEND_AUTH_REDIRECT_URL`로 redirect합니다.

중요:

- Naver access token은 Agentrade API 인증 토큰이 아닙니다.
- Naver access token은 Naver profile 조회에만 사용합니다.
- 서비스 인증은 자체 JWT cookie로 처리합니다.

## 10. Kakao OAuth 흐름

현재 Kakao OAuth도 1차 구현되어 있습니다.

Endpoint:

```http
GET /auth/kakao
GET /auth/kakao/callback
```

흐름:

1. 사용자가 `/auth/kakao`로 접근합니다.
2. 서버가 `randomUUID()`로 state를 생성합니다.
3. `kakao_oauth_state` HttpOnly cookie를 저장합니다.
4. Kakao authorization URL로 redirect합니다.
5. Kakao가 `/auth/kakao/callback?code=...&state=...`로 redirect합니다.
6. 서버가 query state와 cookie state를 비교합니다.
7. state 검증 실패 시 401을 반환합니다.
8. state 검증 성공 시 code를 Kakao token API로 교환합니다.
9. Kakao access token으로 profile API를 조회합니다.
10. `provider=KAKAO`, `providerUserId=String(kakaoProfile.id)` 기준으로 social account를 찾습니다.
11. 기존 social account가 있으면 연결된 user로 Agentrade login result를 생성합니다.
12. 신규 social account면 Kakao email을 확인합니다.
13. 현재 구현은 `is_email_valid === true`, `is_email_verified === true`인 email만 허용합니다.
14. email 기준으로 기존 user를 찾거나 새 user를 생성합니다.
15. `social_accounts` row를 생성합니다.
16. Agentrade access/refresh token을 발급합니다.
17. HttpOnly cookie를 내려줍니다.
18. `FRONTEND_AUTH_REDIRECT_URL`로 redirect합니다.

주의:

- Kakao는 email이 항상 내려오지 않을 수 있습니다.
- 현재는 email이 없거나 검증되지 않은 경우 401로 막는 정책입니다.
- 나중에 email 없는 Kakao 계정을 허용하려면 별도 온보딩/이메일 입력 흐름이 필요합니다.

## 11. 같은 이메일의 로컬/소셜 계정 처리 정책

현재 구현은 소셜 로그인 시 다음 정책을 사용합니다.

1. provider + providerUserId로 기존 social account를 먼저 찾습니다.
2. 없으면 email로 기존 user를 찾습니다.
3. 같은 email의 user가 있으면 그 user에 social account를 연결합니다.
4. 같은 email의 user가 없으면 새 user를 생성하고 social account를 연결합니다.

이 정책은 초기 포트폴리오 구현에는 단순하고 설명하기 좋습니다.

다만 실무적으로는 주의점이 있습니다.

- provider가 검증된 email을 주는지 확인해야 합니다.
- Kakao는 현재 email valid/verified 값을 확인하고 있습니다.
- Naver도 profile email을 얼마나 신뢰할지 정책을 명확히 해야 합니다.
- 보안을 더 엄격하게 하려면 local 로그인 후 social account를 연결하는 별도 API를 만들 수 있습니다.

현재 `AuthService.findOrCreateUserForSocialLogin()`은 transaction으로 user/social account 생성을 묶고, unique violation이 발생하면 social account를 다시 조회하는 fallback을 둡니다.

중요:

- transaction은 여러 DB 작업을 하나의 단위로 묶지만, 모든 동시성 문제를 자동으로 없애지는 않습니다.
- 같은 provider 계정으로 동시에 callback이 들어오는 경우 최종 방어는 `unique(provider, provider_user_id)` 제약입니다.
- unique violation fallback은 이 동시 요청 상황에서 이미 생성된 social account를 다시 찾아 정상 로그인으로 이어가기 위한 보완입니다.

## 12. Strategy 도메인

2026-06-19 기준 전략 도메인은 생성/목록/상세/수정/상태 변경/구조화까지 구현했습니다. 구조화 흐름은 `StrategyParseService`에서 `LlmService`를 통해 로컬 llama.cpp/OpenAI-compatible API를 호출하는 구조로 바뀌었습니다. 아직 실제 Scalar 수동 테스트는 집에서 llama.cpp를 띄운 뒤 진행할 예정입니다.

현재 구현된 API:

- `POST /strategies`
- `GET /strategies`
- `GET /strategies/:id`
- `PATCH /strategies/:id`
- `PATCH /strategies/:id/status`
- `POST /strategies/:id/parse`

아직 구현하지 않은 API:

- `DELETE /strategies/:id`

참고:

- 삭제 대신 보관하는 1차 흐름은 `PATCH /strategies/:id/status`에서 `strategyStatus=archived`로 처리합니다.
- 실제 hard delete API를 만들지는 아직 결정하지 않았습니다.

현재 전략 생성 입력:

- `name`
- `market`
- `prompt`
- `intervalMinutes`
- `scheduleAnchorAt`

현재 전략 생성 기본값:

- `exchange=upbit`
- `strategyMode=paper`
- `strategyStatus=draft`
- `enabled=false`
- `structuredStrategy=null`
- `nextRunAt=null`

현재 전략 수정 입력:

- `name`
- `market`
- `prompt`
- `intervalMinutes`
- `scheduleAnchorAt`

현재 전략 상태 변경 입력:

- `strategyStatus`

현재 전략 구조화 입력:

- 별도 body는 받지 않습니다.
- `strategyId`는 path param으로 받고, 로그인 사용자의 `userId`와 함께 조회합니다.
- `StrategyService.parse()`가 전략 조회와 상태 정책 검사를 담당합니다.
- `StrategyParseService.parseStrategy()`가 기존 `prompt`, `market`, 실행 옵션을 LLM prompt로 만들고 `LlmService`를 호출합니다.
- `LlmService`는 llama.cpp의 OpenAI-compatible `/v1/chat/completions`를 호출하고 raw content 문자열을 반환합니다.
- `StrategyParseService`는 raw content를 JSON parse하고 `isStructuredStrategy()`로 검증합니다.
- parse 실패 시 최대 3회까지 재시도하며, 이전 실패 결과를 다음 prompt에 포함합니다.

현재 전략 상태 변경 DTO:

- `src/strategy/dto/update-strategy-status.dto.ts`
- `@IsEnum(StrategyStatus)`로 `draft`, `active`, `paused`, `archived` 외의 값은 validation 단계에서 거절합니다.

현재 전략 수정 정책:

- 반드시 `id + userId` 조건으로 전략을 조회합니다.
- 다른 사용자의 전략은 수정할 수 없습니다.
- `strategyStatus=archived`인 전략은 수정할 수 없습니다.
- `enabled=true`인 전략은 수정할 수 없습니다.
- `strategyStatus=active`인 전략은 수정할 수 없습니다.
- 수정이 가능한 상태에서 전달된 필드만 부분 업데이트합니다.
- `scheduleAnchorAt`은 DTO에서 string으로 받고, service에서 `Date`로 변환해 저장합니다.
- `name`, `market`, `prompt`, `intervalMinutes`, `scheduleAnchorAt` 중 하나라도 수정되면 기존 `structuredStrategy`와 `nextRunAt`을 `null`로 초기화합니다.
- 따라서 전략 내용을 수정한 뒤에는 다시 `POST /strategies/:id/parse`를 실행해야 active 전환 흐름을 이어갈 수 있습니다.

현재 전략 상태 변경 정책:

- 반드시 `id + userId` 조건으로 전략을 조회합니다.
- 같은 상태로 변경 요청이 들어오면 no-op으로 처리하고 현재 전략을 반환합니다.
- `archived` 상태의 전략은 다른 상태로 변경할 수 없습니다.
- `draft/paused -> active`
  - `structuredStrategy`가 없거나 `isStructuredStrategy()` 검증에 실패하면 400을 반환합니다.
  - 유효한 `StructuredStrategy`가 있으면 `strategyStatus=active`, `enabled=true`, `nextRunAt=다음 실행 시각`으로 저장합니다.
- `active -> paused`
  - `strategyStatus=paused`, `enabled=false`, `nextRunAt=null`로 저장합니다.
- `draft/paused -> archived`
  - `strategyStatus=archived`, `enabled=false`, `nextRunAt=null`로 저장합니다.
- `active -> archived`
  - 바로 허용하지 않고 400을 반환합니다.
  - 먼저 `paused` 상태로 바꾼 뒤 `archived`로 바꾸는 흐름을 권장합니다.
- `draft -> paused`
  - 초안은 이미 비활성 상태이므로 400을 반환합니다.
- `* -> draft`
  - draft로 되돌리는 것은 허용하지 않습니다.

`nextRunAt` 계산 정책:

- 현재 시간이 `scheduleAnchorAt`보다 이전이면 `nextRunAt=scheduleAnchorAt`으로 설정합니다.
- 현재 시간이 이미 `scheduleAnchorAt`을 지났으면 `intervalMinutes` 단위로 다음 실행 시각을 계산합니다.

현재 전략 구조화 정책:

- 반드시 `id + userId` 조건으로 전략을 조회합니다.
- 다른 사용자의 전략은 구조화할 수 없습니다.
- `strategyStatus=archived`인 전략은 구조화할 수 없습니다.
- `enabled=true`이거나 `strategyStatus=active`인 전략은 구조화할 수 없습니다.
- 현재 구현은 `LlmService`를 통해 로컬 llama.cpp 서버에 구조화 요청을 보냅니다.
- `structuredStrategy`는 세부 매수/매도 룰 목록이 아니라 AI 실행 에이전트에게 전달할 실행 지침과 데이터 접근 옵션을 담습니다.
- parse 성공 여부는 별도 `parseStatus`를 두지 않고 `structuredStrategy !== null` 여부로 판단합니다.
- active 전환은 이제 단순 존재 여부가 아니라 `isStructuredStrategy()` 런타임 검증까지 통과해야 가능합니다.
- LLM이 `source.prompt`, `source.market`, `marketDataConfig.symbol`을 잘못 반환해도 저장 전 서버의 전략 값으로 보정합니다.
- LLM이 `dataPermissions`나 `judgment`를 임의로 반환해도 저장 전 서버의 `StrategyEntity` 설정값으로 보정합니다.
- `allowMarketData`, `allowNewsSearch`, `strategyJudgmentMode`는 AI가 결정하는 값이 아니라 사용자가 설정하는 전략 실행 정책입니다.
- UI에서 parse 이후 판단 모드를 함께 보여줄 수 있도록 `structuredStrategy.judgment`에도 현재 `strategyJudgmentMode` 값을 스냅샷처럼 저장합니다.

구조화 관련 파일:

- `src/strategy/types/structured-strategy.type.ts`
  - `StructuredStrategy` 타입을 정의합니다.
  - 현재 버전은 `version=1`, `kind=ai_execution_plan`으로 고정합니다.
- `src/strategy/services/strategy-parse.service.ts`
  - 전략 prompt를 구조화 결과로 변환하는 책임을 담당합니다.
  - `LlmService.createChatCompletionContent()`로 llama.cpp 응답 content를 가져옵니다.
  - JSON parse 실패나 schema 검증 실패 시 최대 3회 재시도합니다.
  - 유효한 결과를 얻으면 DB 기준 strategy 값으로 source/market symbol을 보정한 뒤 반환합니다.
- `src/strategy/validators/structured-strategy.validator.ts`
  - DB에서 꺼낸 `jsonb` 값이 실제 `StructuredStrategy` 형태인지 런타임에서 검사합니다.
  - `judgment`는 `"ai"` 또는 `"user"`만 허용합니다.
  - `StrategyService.activateStrategy()`에서 active 전환 전에 사용합니다.
- `src/strategy/data/system.prompt.ts`
  - LLM에게 반환해야 하는 `StructuredStrategy` JSON 구조와 안전 정책을 알려주는 system prompt입니다.
- `src/llm/services/llm.service.ts`
  - llama.cpp OpenAI-compatible API 호출을 담당합니다.
  - JSON parse는 하지 않고 content string만 반환합니다.

현재 LLM이 반환해야 하는 `structuredStrategy` 목표 형태:

```json
{
  "version": 1,
  "kind": "ai_execution_plan",
  "source": {
    "prompt": "사용자가 작성한 원문 전략 prompt",
    "market": "KRW-BTC"
  },
  "aiInstructions": {
    "summary": "사용자의 자연어 전략을 기반으로 안전한 투자 판단을 수행한다.",
    "decisionProcess": [
      "시장 뉴스와 거시 이벤트를 확인한다.",
      "지지/저항 구간과 주요 가격 흐름을 확인한다.",
      "근거가 부족하면 매매하지 않는다.",
      "과도한 레버리지와 올인을 피한다.",
      "수익 구간에서는 분할 익절을 고려한다."
    ]
  },
  "dataPermissions": {
    "allowNewsSearch": true,
    "allowMarketData": true
  },
  "judgment": "user",
  "marketDataConfig": {
    "symbol": "KRW-BTC",
    "timeframes": ["15m", "30m", "1h"],
    "primaryTimeframe": "1h"
  },
  "riskPreferences": {
    "riskLevel": "conservative",
    "maxIdeaExposureFraction": 0.3,
    "positionSizeFraction": 0.1,
    "allowLeverage": false
  },
  "humanReview": {
    "requiredBeforeLiveTrading": true,
    "requiredWhenConfidenceBelow": 0.7
  }
}
```

이 정책의 의도:

- 자동 실행 대상으로 잡힐 수 있는 전략을 실행 중에 바꾸는 상황을 피합니다.
- scheduler worker는 1차 구현되어 있지만 run lock은 아직 없으므로, 지금은 `enabled`와 `strategyStatus` 기준의 1차 방어만 둡니다.
- 이후에는 `strategy_runs`의 running 상태 또는 별도 claim 컬럼을 활용해 실제 running/pending/approval_waiting run 여부까지 확인해서 더 정확히 막습니다.

현재 `StrategyEntity` 주요 컬럼:

```text
id
user_id
name
exchange
market
prompt
strategy_mode
strategy_judgment_mode
interval_minutes
schedule_anchor_at
next_run_at
enabled
strategy_status
structured_strategy
allow_market_data
allow_news_search
created_at
updated_at
deleted_at
```

전략 API 설계 원칙:

- 모든 전략 API는 `JwtAuthGuard`를 통과해야 합니다.
- 전략은 반드시 로그인 사용자에게 귀속됩니다.
- 상세 조회는 `id + userId` 조건으로 조회하여 다른 사용자의 전략 접근을 막습니다.
- 수정도 `id + userId` 조건으로 조회하여 다른 사용자의 전략 변경을 막습니다.
- 상태 변경도 `id + userId` 조건으로 조회하여 다른 사용자의 전략 상태 변경을 막습니다.
- 구조화도 `id + userId` 조건으로 조회하여 다른 사용자의 전략 구조화를 막습니다.
- 목록 조회는 현재 사용자 전략만 반환합니다.
- 목록 조회는 공통 페이지네이션 응답을 사용합니다.
- `market`, `strategyStatus`, `strategyMode`, `enabled` 필터를 지원합니다.
- entity를 그대로 노출하지 않기 위해 `StrategyResponseDto`를 추가했습니다.
- create/detail/update/status/parse 응답은 `StrategyResponseDto`로 반환합니다.
- list 응답은 `PaginatedResult<StrategyResponseDto>` 형태입니다.

공통 페이지네이션 파일:

- `src/common/dto/pagination-query.dto.ts`
- `src/common/types/paginated.type.ts`
- `src/common/utils/create-pagination-meta.ts`

전략 목록 조회 예:

```http
GET /strategies?page=1&limit=15&market=KRW-BTC&strategyStatus=draft&strategyMode=paper&enabled=false
```

응답 형태:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 15,
    "total": 0,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

현재 남은 정리 포인트:

- 집에서 로컬 llama.cpp 서버를 띄운 뒤 Scalar에서 전략 생성/목록/상세/수정/구조화/상태 변경을 한 번 더 수동 확인하면 좋습니다.
- `POST /strategies/:id/parse`가 실제 llama.cpp 호출로 `structuredStrategy`를 저장하는지 확인해야 합니다.
- parse 전에는 `strategyStatus=active` 변경 요청이 400을 반환하고, parse 후에는 `isStructuredStrategy()` 검증을 통과하여 active 전환이 성공해야 합니다.
- 전략 수정 후 `structuredStrategy=null`, `nextRunAt=null`로 초기화되는지 확인해야 합니다.
- llama.cpp가 JSON을 안정적으로 반환하지 않으면 `SystemPrompt`, retry prompt, `LLM_MAX_TOKENS`, `LLM_TEMPERATURE`를 조정해야 합니다.
- `LlmService`에서 non-2xx 응답 시 response body를 포함하도록 개선하면 디버깅이 더 쉬워집니다.
- `isStructuredStrategy()` validator는 추가됐지만 별도 단위 테스트는 아직 작성하지 않았습니다.
- scheduler/run 테이블이 생기면 실제 실행 중인 전략 수정 차단을 `run_status` 기준으로 보강해야 합니다.

## 13. 현재 검증 완료 상태

코드 정적 검증:

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/**/*.ts"
pnpm exec jest --runInBand
```

위 명령은 2026-06-14 기준 통과했습니다.

2026-06-16 기준 `POST /strategies/:id/parse` mock 구조화 API를 추가했습니다.

2026-06-18 기준 구조화 결과 타입, parse service 분리, 런타임 validator 추가 작업 후 아래 명령은 Codex가 직접 실행했고 통과했습니다.

2026-06-19 기준 `LlmModule`, `LlmService`, llama.cpp 호출 흐름, retry 기반 `StrategyParseService` 수정 후 아래 명령은 Codex가 직접 실행했고 통과했습니다.

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/**/*.ts"
```

참고:

- 이번 2026-06-19 작업에서는 `pnpm exec jest --runInBand`는 다시 실행하지 않았습니다.
- 사용자는 앞 단계에서 테스트 작업을 완료했다고 보고했습니다.
- 다음 컴퓨터에서 이어갈 때는 전체 안정성 확인을 위해 `pnpm exec jest --runInBand`를 한 번 더 실행하면 좋습니다.

서버 부팅 확인:

```bash
pnpm start
```

2026-06-02 기준 서버가 정상 부팅되고 다음 route가 매핑되는 것을 확인했습니다.

- `/health`
- `/auth/register`
- `/auth/login`
- `/auth/logout`
- `/auth/me`
- `/auth/refresh`
- `/auth/naver`
- `/auth/naver/callback`
- `/auth/kakao`
- `/auth/kakao/callback`
- `/user`
- `/strategies`
- `/strategies/:id`

2026-06-04 기준 코드 정적 검증에서 `PATCH /strategies/:id` 업데이트 흐름도 통과했습니다. 단, 서버 route 매핑 로그는 필요 시 `pnpm start:dev`로 다시 확인하면 됩니다.

2026-06-14 기준 코드 정적 검증에서 `PATCH /strategies/:id/status` 상태 변경 흐름도 통과했습니다.

확인한 명령:

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/strategy/**/*.ts"
pnpm exec jest --runInBand
```

현재 Jest는 기본 spec 중심이라 상태 변경 정책을 직접 검증하는 테스트는 아직 없습니다. 다음 단계에서 `StrategyService.updateStatus` 단위 테스트를 추가하면 좋습니다.

Scalar로 이미 확인한 흐름:

- `POST /auth/register`
- `POST /auth/login`
- 로그인 시 cookie 발급
- `auth_sessions` row 생성
- `POST /auth/refresh`
- refresh 후 새 cookie 발급
- refresh 후 DB의 `refresh_token_hash` 변경
- `GET /auth/me`
- `POST /auth/logout`
- logout 후 cookie clear 및 세션 revoke

직접 확인한 OAuth 흐름:

- `GET /auth/naver`부터 실제 Naver 로그인 완료까지 확인
- `GET /auth/kakao`부터 실제 Kakao 로그인 완료까지 확인

아직 Scalar에서 최종 수동 확인하면 좋은 흐름:

- `POST /strategies`
- `GET /strategies`
- `GET /strategies/:id`
- `PATCH /strategies/:id`
- `PATCH /strategies/:id/status`
- `POST /strategies/:id/parse`
- 전략 목록 필터 및 페이지네이션 query
- `enabled=true` 또는 `strategyStatus=active`인 전략 수정 시 400 응답 확인
- `structuredStrategy=null`인 전략을 `active`로 바꾸려고 할 때 400 응답 확인
- `POST /strategies/:id/parse` 후 `structuredStrategy.kind=ai_execution_plan`이 저장되는지 확인
- parse 후 `strategyStatus=active` 변경이 성공하고 `enabled=true`, `nextRunAt`이 채워지는지 확인
- 전략 수정 후 `structuredStrategy=null`, `nextRunAt=null`로 초기화되는지 확인
- `draft/paused` 전략을 `archived`로 바꿀 때 `enabled=false`, `nextRunAt=null`이 되는지 확인
- `active` 전략을 바로 `archived`로 바꾸려고 할 때 400 응답 확인

## 14. 다른 컴퓨터에서 이어서 작업할 때

### 14.1 기본 준비

```bash
cd /path/to/agentrade/backend
pnpm install
```

새 컴퓨터에도 로컬 PostgreSQL DB와 계정이 준비되어 있어야 합니다.

예:

```text
DB_NAME=agentrade
DB_USER=agentrade
DB_PASSWORD=agentrade
DB_HOST=localhost
DB_PORT=5432
```

현재 프로젝트는 Docker로 DB를 띄우지 않습니다.

### 14.2 `.env` 구성

현재 컴퓨터의 `backend/.env`와 같은 형태로 새 컴퓨터에도 `.env`를 구성합니다.

특히 다음 값은 새 컴퓨터에서 빠지면 OAuth나 JWT가 동작하지 않습니다.

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `NAVER_CALLBACK_URL`
- `KAKAO_REST_API_KEY`
- `KAKAO_CLIENT_SECRET`
- `KAKAO_CALLBACK_URL`
- `FRONTEND_AUTH_REDIRECT_URL`

### 14.3 DB migration 적용

```bash
pnpm migration:run
```

적용 여부 확인:

```bash
pnpm typeorm migration:show
```

스키마 차이 확인:

```bash
pnpm typeorm schema:log
```

테이블 확인:

```bash
psql -d agentrade -c "\dt"
psql -d agentrade -c "\d+ users"
psql -d agentrade -c "\d+ auth_sessions"
psql -d agentrade -c "\d+ social_accounts"
psql -d agentrade -c "\d+ strategies"
```

### 14.4 서버 실행

```bash
pnpm start:dev
```

문서 확인:

```text
http://localhost:4000/docs
```

## 15. 다음 세션 시작 체크리스트

집에서 이어서 작업할 때는 아래 순서로 시작하면 됩니다.

```bash
cd backend
pnpm install
pnpm migration:run
pnpm exec tsc --noEmit
pnpm exec eslint "src/**/*.ts"
pnpm exec jest --runInBand
pnpm start:dev
```

그다음 `http://localhost:4000/docs`에서 local auth를 빠르게 확인합니다.

1. `POST /auth/register`
2. `POST /auth/login`
3. `POST /auth/refresh`
4. `GET /auth/me`
5. `POST /auth/logout`

전략 API도 확인합니다.

1. `POST /strategies`
2. `GET /strategies`
3. `GET /strategies/:id`
4. `PATCH /strategies/:id`
5. `PATCH /strategies/:id/status`
6. `POST /strategies/:id/parse`
7. `GET /strategies?page=1&limit=15&market=KRW-BTC&strategyStatus=draft&strategyMode=paper&enabled=false`
8. `structuredStrategy=null`인 전략을 `active`로 바꾸려고 할 때 400이 반환되는지 확인
9. parse 후 `active` 전환이 성공하는지 확인
10. `enabled=true` 또는 `strategyStatus=active`인 전략을 수정하려고 할 때 400이 반환되는지 확인
11. draft/paused 전략 수정 후 `structuredStrategy=null`, `nextRunAt=null`로 초기화되는지 확인
12. `draft/paused` 전략을 `archived`로 바꿀 때 `enabled=false`, `nextRunAt=null`이 되는지 확인

DB 확인:

```bash
psql -d agentrade -c "select id, email, provider, provider_id from users order by id desc limit 5;"
psql -d agentrade -c "select id, user_id, provider, provider_user_id, email from social_accounts order by id desc limit 10;"
psql -d agentrade -c "select id, user_id, revoked_at, expires_at from auth_sessions order by created_at desc limit 10;"
psql -d agentrade -c "select id, user_id, name, market, strategy_mode, strategy_status, enabled from strategies order by created_at desc limit 10;"
```

그다음 OAuth를 실제 브라우저에서 확인합니다.

1. 브라우저에서 `http://localhost:4000/auth/naver` 접속
2. Naver 로그인 완료 후 프론트 redirect URL로 이동하는지 확인
3. DB의 `users`, `social_accounts`, `auth_sessions` 확인
4. 브라우저에서 `http://localhost:4000/auth/kakao` 접속
5. Kakao 로그인 완료 후 프론트 redirect URL로 이동하는지 확인
6. DB의 `users`, `social_accounts`, `auth_sessions` 확인

## 16. 바로 다음 작업 추천

현재 코드 기준으로 parse와 LLM 연동 수동 검증, active 전환, scheduler 기반 run 생성, `strategy_runs` 기록 저장/조회, `POST /strategies/:id/run` 수동 실행 API, `StrategyExecutionService` 기반 workflow 분리, 실제 Upbit 캔들 수집, 사용자별 Upbit credential 암호화 저장, live portfolio 조회, paper portfolio 조회 분기, Naver 뉴스 수집, Upbit DataLab 자산 요약 수집, 전략별 데이터 접근 권한, 전략 판단 모드 저장, LLM 기반 AI decision, 전략 soft delete API, RiskCheckService 1차 작성까지 진행되었습니다. 다음 작업은 risk check를 실제 workflow에 연결한 뒤 `paper order`를 실제 구조로 바꾸는 것입니다.

현재 `StrategyRunService.runByStrategy()`는 다음 흐름을 갖습니다.

1. 사용자 소유 전략을 조회합니다.
2. 전략이 `active`인지 확인합니다.
3. `enabled=true`인지 확인합니다.
4. `structuredStrategy`가 `isStructuredStrategy()`를 통과하는지 확인합니다.
5. 같은 전략의 `running` 실행 이력이 이미 있는지 확인합니다.
6. `strategy_runs` row를 `running` 상태로 먼저 저장합니다.
7. `StrategyExecutionService.execute(strategy)`를 호출합니다.
8. `StrategyExecutionService`는 `structuredStrategy`를 기반으로 market data, portfolio, news, asset summary를 수집한 뒤 `AiDecisionService`에 전달합니다.
9. `AiDecisionService`는 LLM을 호출해 `buy`, `sell`, `hold` 중 하나와 confidence, reason, evidence, riskNotes, suggestedOrder를 생성합니다.
10. `StrategyExecutionService`는 AI decision 결과를 기반으로 risk check, order 단계 결과를 만듭니다. 현재 risk check와 order는 아직 mock/skipped입니다.
11. 결과가 `isStrategyRunResult()`를 통과하면 run을 `succeeded`로 업데이트합니다.
12. 실패하면 run을 `failed`로 업데이트하고 `errorMessage`를 저장합니다.
13. 성공 시 전략의 `nextRunAt`을 다음 실행 예정 시간으로 갱신합니다.

현재 `StrategySchedulerService`는 다음 흐름을 갖습니다.

1. 1분마다 `strategyStatus=active`, `enabled=true`, `nextRunAt <= now`인 전략을 조회합니다.
2. 조회된 전략마다 `StrategyRunService.runByStrategy()`를 호출합니다.
3. 각 전략 실행은 `try/catch`로 감싸져 있어, 한 전략이 실패해도 다음 전략 실행은 계속됩니다.

바로 이어서 할 작업:

- `RiskCheckService`를 `StrategyModule` providers에 등록합니다.
- `StrategyExecutionService`에 `RiskCheckService`를 주입합니다.
- 기존 mock `checkRisk()`를 `RiskCheckService.check()` 호출로 교체합니다.
- `risk_check` step output에 `RiskCheckResult`를 저장합니다.
- risk check 실패 시 `order` step은 계속 `skipped`로 둡니다.
- risk check가 통과한 경우에도 아직 실제 주문은 만들지 않고, 다음 단계의 paper order 후보로 넘길 준비만 합니다.
- 이후 retryable risk violation이 있을 때 `AiDecisionService.revise()`로 재판단시키는 흐름을 설계합니다.
- 그 다음 `paper order / paper fill` 테이블과 가상 체결 로직을 설계합니다.

현재 data-collect 폴더 구조:

```txt
src/data-collect/
  data-collect.module.ts
  services/
    news-data.service.ts
    asset-summary.service.ts
  types/
    asset-summary.type.ts
    naver-news-search.response.type.ts
    news-article.type.ts
  utils/
    create-query.ts
```

주의할 점:

- 이미 Upbit public candle API와 private account API는 연결되어 있습니다.
- `paper` 전략이 Upbit credential을 요구하면 안 됩니다.
- `live` 전략은 아직 주문 실행으로 연결하지 않습니다.
- `live` 전략은 `user.liveTradingEnabled`, human review, risk check 정책이 붙기 전까지 읽기 중심으로만 유지합니다.
- `CREDENTIAL_ENCRYPTION_KEY`는 credential 저장/복호화에 필수입니다.
- 뉴스 수집은 `NewsDataService`에서 Naver News Search API를 사용합니다.
- `allowNewsSearch=false`인 전략에서는 외부 뉴스 검색을 호출하면 안 됩니다.
- `asset_summary` step은 현재 전략의 `market`을 기준으로 Upbit DataLab 자산 요약 페이지를 수집합니다.
- Upbit DataLab 페이지 구조는 외부 웹 페이지에 의존하므로, 이후 파싱 실패 시 step 실패 처리 또는 fallback 정책을 정리해야 합니다.
- `strategyJudgmentMode`는 AI가 정하는 값이 아니라 사용자가 정하는 실행 정책입니다.
- `structuredStrategy.judgment`는 UI 표시와 실행 시점 스냅샷 용도로 저장합니다.
- 이후 LangGraph로 전환할 때는 market data, portfolio, news, asset summary 수집 흐름이 `collect_data` 노드의 내부 구현이 될 가능성이 큽니다.

완료 후 확인할 흐름:

```txt
POST /strategies
POST /strategies/:id/parse
PATCH /strategies/:id/status
POST /strategies/:id/run
GET /strategy-runs/:runId
```

`GET /strategy-runs/:runId`에서 확인할 값:

- `result.steps`에 `market_data` 단계가 있습니다.
- `market_data.output.candleGroups`가 있습니다.
- `news` 단계가 있습니다.
- `asset_summary` 단계가 있습니다.
- `portfolio` 단계가 있습니다.
- paper 전략에서는 paper portfolio가 반환됩니다.
- live 전략에서는 Upbit 실제 balances가 반환됩니다.
- `allowNewsSearch=true`인 전략에서는 `news.output.articles`가 반환됩니다.
- `allowNewsSearch=false`인 전략에서는 `news.status=skipped`가 반환됩니다.
- `asset_summary.output.fearGreed`, `asset_summary.output.technicalAnalysis`, `asset_summary.output.price`가 반환됩니다.
- `ai_decision.output.decision`은 `buy`, `sell`, `hold` 중 하나입니다.
- `ai_decision.output.reason`, `ai_decision.output.evidence`, `ai_decision.output.riskNotes`는 한국어로 반환됩니다.
- `ai_decision.output.suggestedOrder.sizeFraction`은 0 이상 1 이하입니다.
- `risk_check`, `order`는 아직 mock이어도 됩니다.

검증 명령어:

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/**/*.ts"
```

그 다음 작업:

- risk check 단계를 실제 정책 기반으로 구현합니다.
- `strategyJudgmentMode=user`이면 주문을 즉시 실행하지 않고 사용자 승인 대기 상태로 남기는 흐름을 설계합니다.
- `strategyJudgmentMode=ai`이면 risk check 통과 후 paper order 후보로 진행하는 흐름을 설계합니다.
- paper order / paper fill 테이블과 가상 체결 로직을 설계합니다.
- 이후 LangGraph로 전환할 때는 현재의 market data, portfolio, news, asset summary, ai decision, risk check 흐름을 각각 node로 옮깁니다.

### 16.1 다른 컴퓨터에서 시작 직후 확인

먼저 현재 작업 상태가 그대로 살아 있는지 확인합니다.

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm exec eslint "src/**/*.ts"
pnpm exec jest --runInBand
```

DB가 새 컴퓨터라면 migration도 적용합니다.

```bash
pnpm migration:run
pnpm typeorm migration:show
```

### 16.2 로컬 llama.cpp 서버 확인

집에서 백엔드 테스트 전에 로컬 LLM 서버가 정상 응답하는지 확인합니다.

예상 실행:

```bash
./build/bin/llama-server \
  -m ~/models/your-model.Q4_K_M.gguf \
  --host 127.0.0.1 \
  --port 8080 \
  --alias agentrade-local \
  --api-key local-dev-key
```

서버 확인:

```bash
curl http://127.0.0.1:8080/v1/models \
  -H "Authorization: Bearer local-dev-key"
```

주의:

- `--host 127.0.0.1`로 시작하면 현재 PC에서만 접근합니다.
- `--alias agentrade-local` 값을 백엔드의 `LLM_MODEL`과 맞춥니다.
- `--api-key local-dev-key` 값을 백엔드의 `LLM_API_KEY`와 맞춥니다.

### 16.3 LLM 환경 변수 추가

`.env`에 아래 값이 들어가 있어야 합니다. `src/config/env.validation.ts`에는 이미 파싱 로직이 추가되어 있습니다.

```env
LLM_PROVIDER=llama_cpp
LLM_BASE_URL=http://127.0.0.1:8080/v1
LLM_API_KEY=local-dev-key
LLM_MODEL=agentrade-local
LLM_TIMEOUT_MS=120000
LLM_MAX_TOKENS=1200
LLM_TEMPERATURE=0.1
```

현재 책임 분리:

- `StrategyService`
  - 전략 조회, 소유자 검증, 상태 정책, DB 저장
- `StrategyParseService`
  - 전략 prompt를 structured strategy로 바꾸는 도메인 흐름
  - `LlmService` 응답 content를 JSON parse
  - JSON parse 실패 또는 schema 검증 실패 시 최대 3회 retry
  - 유효한 LLM 응답을 `isStructuredStrategy()`로 검증
  - 저장 전 `source.prompt`, `source.market`, `marketDataConfig.symbol`을 DB 기준 값으로 보정
- `LlmService`
  - `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`을 읽어 HTTP 호출
  - `/v1/chat/completions` 요청
  - 응답 content string만 반환

### 16.4 집에서 parse 수동 테스트

로컬 llama.cpp 서버와 백엔드를 모두 띄운 뒤 Scalar에서 아래 흐름을 확인합니다.

```bash
pnpm start:dev
```

Scalar:

```text
http://localhost:4000/docs
```

확인 순서:

1. `POST /auth/login`으로 로그인하고 cookie 발급 확인
2. `POST /strategies`로 초안 전략 생성
3. 생성된 전략 id로 `POST /strategies/:id/parse` 호출
4. 응답의 `structuredStrategy.kind`가 `ai_execution_plan`인지 확인
5. `structuredStrategy.source.prompt`가 DB 전략 prompt와 같은지 확인
6. `structuredStrategy.source.market`이 DB 전략 market과 같은지 확인
7. `structuredStrategy.marketDataConfig.symbol`이 DB 전략 market과 같은지 확인
8. `PATCH /strategies/:id/status` body `{ "strategyStatus": "active" }`로 active 전환 확인

DB 확인:

```bash
psql -d agentrade -c "select id, name, market, strategy_status, enabled, next_run_at, structured_strategy from strategies order by created_at desc limit 3;"
```

주의:

- 실제 LLM 응답은 TypeScript 타입을 믿으면 안 됩니다.
- DB에 저장하기 전 반드시 `isStructuredStrategy()`로 검사합니다.
- active 전환 시에도 다시 `isStructuredStrategy()`로 검사하므로 2중 방어가 됩니다.
- `LlmService`는 content string만 반환하고 JSON parse는 `StrategyParseService`에서 합니다.
- 깨진 JSON이나 schema mismatch는 retry prompt로 보정합니다.

### 16.5 llama.cpp JSON 응답 방식

`llama.cpp`의 OpenAI-compatible `/v1/chat/completions`는 `response_format`을 지원합니다. 우선은 단순하게 `json_object`로 시작하고, 안정화되면 `json_schema`로 강화하는 흐름이 좋습니다.

초기 요청 방향:

```json
{
  "model": "agentrade-local",
  "temperature": 0.1,
  "max_tokens": 1200,
  "response_format": {
    "type": "json_object"
  },
  "messages": [
    {
      "role": "system",
      "content": "사용자 투자 전략을 StructuredStrategy JSON으로 변환한다."
    },
    {
      "role": "user",
      "content": "..."
    }
  ]
}
```

나중에 강화할 부분:

- `response_format.type=json_schema`로 `StructuredStrategy` schema 강제
- LLM이 JSON 외 텍스트를 섞어 반환할 때의 복구 정책 고도화
- timeout, 네트워크 실패, llama-server 미실행 상태의 에러 메시지 개선
- `LlmService`에서 non-2xx response body를 포함해 디버깅하기 쉽게 만들기
- 모델별 prompt template 차이

### 16.6 전략 API 수동 검증 유지

LLM 연동 전후로 아래 흐름은 계속 확인합니다.

1. `POST /strategies`로 초안 전략 생성
2. parse 전 `PATCH /strategies/:id/status` body `{ "strategyStatus": "active" }` 요청
3. 400 반환 확인
4. `POST /strategies/:id/parse` 요청
5. 응답의 `structuredStrategy.kind`가 `ai_execution_plan`인지 확인
6. 다시 active 전환 요청
7. `strategyStatus=active`, `enabled=true`, `nextRunAt` 확인
8. paused 전환
9. prompt 또는 market 수정
10. `structuredStrategy=null`, `nextRunAt=null` 초기화 확인

### 16.7 전략 활성화 흐름 정책 유지

AI 구조화 결과가 저장된 뒤 자동 실행을 켤 수 있게 합니다. 별도 `enable/disable` API를 만들기보다는 우선 `PATCH /strategies/:id/status`에서 상태별로 처리하는 방향을 유지합니다.

상태 변경과 내부 필드 매핑:

```text
strategyStatus=active
  enabled=true
  nextRunAt=다음 실행 예정 시간

strategyStatus=paused
  enabled=false
  nextRunAt=null

strategyStatus=archived
  enabled=false
  nextRunAt=null
```

활성화 조건:

- 현재 사용자 소유 전략
- `structuredStrategy` 존재
- `isStructuredStrategy(structuredStrategy)` 통과
- `intervalMinutes` 유효
- `scheduleAnchorAt` 유효
- `nextRunAt` 계산 가능

`nextRunAt` 계산은 처음에는 단순하게 시작해도 됩니다.

- 현재 시간이 `scheduleAnchorAt`보다 이전이면 `nextRunAt=scheduleAnchorAt`
- 현재 시간이 이미 지났으면 `intervalMinutes` 단위로 다음 실행 시간을 계산

정확한 시간 계산은 scheduler worker를 붙일 때 다시 다듬습니다.

### 16.8 작은 리팩토링

우선순위가 높지는 않지만 다음 정리는 해두면 좋습니다.

- `StrategyService.update()`의 "수정 가능 상태" 정책이 커지면 별도 private method로 분리 검토
- `StrategyParseService`의 LLM prompt 생성 로직이 커지면 별도 prompt builder로 분리 검토
- `nextRunAt` 계산 로직이 생기면 공통 util 또는 domain method로 분리 검토
- `AuthService`의 `datasource` 필드명을 `dataSource`로 변경
- `AuthService`가 계속 커지면 token 발급/검증을 `AuthTokenService`로 분리 검토
- social login 공통 흐름이 더 커지면 `SocialLoginService` 분리 검토
- `users.provider`, `users.provider_id`를 계속 유지할지 제거할지 결정

### 16.9 추가 테스트 보강

현재 테스트는 매우 얇습니다. 다만 프론트/백엔드를 모두 해야 하므로 모든 테스트를 한 번에 작성할 필요는 없습니다.

우선 추천하는 최소 테스트:

- `AuthService.login`
  - 정상 로그인
  - 잘못된 비밀번호 401
- `AuthService.refresh`
  - 정상 refresh
  - hash 불일치 시 revoke
- `JwtStrategy.validate`
  - 정상 access token payload 통과
  - revoked session이면 401
- `findOrCreateUserForSocialLogin`
  - 기존 social account 있으면 기존 user 반환
  - 같은 email user가 있으면 social account 연결
- `StrategyService.findAllByUser`
  - 사용자별 전략만 조회
  - 페이지네이션 meta 계산
  - market/status/mode/enabled 필터
- `StrategyService.findOneByUser`
  - 다른 사용자 전략 조회 차단
  - 없는 전략 404
- `StrategyService.updateStatus`
  - 구조화되지 않은 전략 active 전환 400
  - `structuredStrategy`가 존재하지만 `kind`가 틀리면 active 전환 400
  - 구조화된 전략 active 전환 성공
  - paused 전환 시 `enabled=false`, `nextRunAt=null`
  - active 전략의 직접 archived 전환 400
  - archived 전략 상태 변경 차단
- `isStructuredStrategy`
  - 정상 구조는 true
  - `null`은 false
  - `version`이 1이 아니면 false
  - `kind`가 `ai_execution_plan`이 아니면 false
  - `decisionProcess`가 `string[]`이 아니면 false
  - `riskLevel`이 허용값이 아니면 false

### 16.10 Role Guard와 관리자 권한 API

인증 기반 다음 단계로는 관리자 권한 기반을 만드는 것이 좋습니다.

추천 작업:

1. `@Roles()` decorator 생성
2. `RolesGuard` 생성
3. `JwtAuthGuard` 이후 role 검사
4. 관리자 전용 사용자 목록 API
5. 사용자 role 변경 API
6. paper/live trading 권한 변경 API

예상 API:

```http
GET /admin/users
PATCH /admin/users/:id/role
PATCH /admin/users/:id/trading-permissions
```

프론트 설정 화면은 거창한 설정 시스템보다 "특정 사용자의 권한을 올려주는 관리자 도구" 정도면 충분합니다.

## 17. 이후 큰 개발 로드맵

### Phase 1. Auth 안정화

- OAuth 수동 검증
- auth 테스트 최소 보강
- role guard 추가
- 관리자 권한 API 추가

### Phase 2. Strategy

- 전략 작성/조회/수정/삭제
- 전략 상태 변경
- 자연어 전략 저장
- 구조화 전략 JSON 저장
- 실행 주기 설정

### Phase 3. Scheduler Worker

- `@nestjs/schedule` 기반 1분 주기 scheduler 1차 구현 완료
- `strategyStatus=active`, `enabled=true`, `nextRunAt <= now` 조건으로 실행 대상 조회
- 실행 대상 전략마다 `strategy_runs` 생성 확인 완료
- 각 전략 실행을 `try/catch`로 감싸 특정 전략 실패가 전체 scheduler 루프를 막지 않도록 1차 실패 격리 완료
- 같은 전략의 `running` run 존재 여부를 확인하는 1차 중복 실행 방지 추가
- 남은 작업: `locked_until`, `failure_count` 또는 별도 claim 정책 설계
- 남은 작업: 트랜잭션 또는 DB lock 기반의 더 강한 중복 실행 방지

### Phase 4. Workflow Run

- `strategy_runs` 상태 저장
- `StrategyRunResult.steps`에 단계별 실행 결과 저장
- `StrategyExecutionService`로 workflow 책임 분리 완료
- `POST /strategies/:id/run` 수동 실행 API 추가 완료
- Upbit public candle API 기반 실제 market data 수집 완료
- Upbit credential 암호화 저장과 private account API 기반 live portfolio 조회 완료
- paper/live portfolio 조회 분기 완료
- Naver News Search API 기반 news data 수집 완료
- Upbit DataLab asset summary 기반 공포/탐욕, 기술적 분석, 가격/거래대금 요약 수집 완료
- 전략별 `allowMarketData`, `allowNewsSearch`, `strategyJudgmentMode` 설정 추가
- `AiDecisionService` 기반 LLM decision 연결 완료
- AI decision 결과에 `decision`, `confidence`, `reason`, `evidence`, `riskNotes`, `suggestedOrder` 저장 완료
- 전략 삭제 API soft delete 방식 추가 완료
- `StrategyRunResult` validator에서 `decision=skip` 제거 완료
- `RiskCheckService`와 `RiskCheckResult` 타입 1차 작성 완료
- Upbit 최소 주문 금액 5,000원 미만 주문 후보 차단 로직 추가
- paper/live portfolio 구조를 고려한 예상 주문 금액 계산 로직 추가
- 다음 작업: `RiskCheckService`를 workflow에 연결
- 이후 작업: `strategyJudgmentMode` 기준 승인 대기 또는 paper order 진행 흐름 연결
- SSE 또는 WebSocket으로 실행 상태 전달

### Phase 5. Risk Engine

- 최대 주문 금액
- 하루 손실 한도
- confidence 최소값
- 반복 주문 제한
- live trading feature flag
- 관리자 권한
- human approval

### Phase 6. Paper Trading

- paper 전략 실행 시 Upbit 실제 자산 대신 paper portfolio를 조회하도록 분기 완료
- 가상 계좌 기본 생성 완료
- 가상 포지션 조회 구조 완료
- 다음 작업: 가상 주문
- 다음 작업: 가상 체결
- 포트폴리오 화면용 API

### Phase 7. Audit Log

기록 대상:

- login/logout
- refresh token rotation 실패
- strategy create/update/delete
- AI decision
- risk result
- approval request
- paper order
- live order request
- live order result

추천 테이블:

```text
audit_logs
  id
  actor_user_id
  action
  target_type
  target_id
  metadata
  created_at
```

## 18. 이번 세션에서 다룬 학습 내용

이번 세션은 사용자가 직접 백엔드 코드를 이해하고 작성하는 것을 목표로 진행했습니다. Codex는 전체 코드를 대신 완성하기보다, 구조 설명, 에러 원인 분석, 코드 리뷰, 다음 작업 순서 제안, 필요한 예시 제공을 중심으로 도왔습니다.

다룬 내용:

- NestJS + TypeORM + PostgreSQL + Scalar 환경 구성
- Docker 없이 로컬 PostgreSQL에 연결하는 방식
- `config` 디렉토리와 `database` 디렉토리의 역할
- Scalar docs 연결 문제 점검
- Jest 타입 오류 해결
- `@/*` path alias 설정
- user 도메인과 auth 도메인의 책임 분리
- `providerId`가 필요한 이유
- TypeORM unique index 적용 방식
- enum column에서 ESLint `no-unsafe-assignment`가 발생하는 이유
- TypeORM nullable column이 `Object` 타입으로 추론되어 Postgres에서 `DataTypeNotSupportedError`가 난 문제
- migration 생성, 적용, 확인 흐름
- snake_case column으로 migration을 맞추는 방법
- Swagger/OpenAPI decorator를 `auth-api.docs.ts`로 분리하는 방식
- cookie 기반 access/refresh token 인증 구조
- refresh token을 DB에 hash로 저장하는 이유
- refresh token rotation 구조
- `JwtAuthGuard`, `JwtStrategy`, `CurrentUser` 데코레이터의 역할
- OpenAPI cookie auth가 실제 인증이 아니라 문서 설정이라는 점
- logout의 세션 revoke와 cookie clear 흐름
- social account 테이블을 별도로 두는 이유
- Naver/Kakao OAuth 흐름
- transaction과 unique constraint의 역할 차이
- unique violation fallback을 두는 이유
- Strategy 도메인 설계와 `StrategyEntity` 작성
- TypeORM relation 저장 시 `user` 객체와 `userId` 저장 방식의 차이
- `POST /strategies`, `GET /strategies`, `GET /strategies/:id` 구현
- 사용자 소유 리소스를 `id + userId`로 조회해야 하는 이유
- 공통 페이지네이션 DTO, meta helper, paginated result 타입 구성
- 전략 목록 조회에서 filter DTO를 공통 pagination DTO에 확장하는 방식
- `StrategyResponseDto`로 entity 응답을 분리하는 방식
- Strategy API docs를 `strategy-api.docs.ts`로 분리하는 방식
- `PATCH /strategies/:id` 수정 API 구현
- PATCH DTO에서는 `ApiPropertyOptional`을 사용해야 문서에서도 선택 필드로 보인다는 점
- active/enabled 전략은 수정 전에 일시정지하도록 막는 1차 정책
- 실제 실행 중인 run을 막는 것은 `strategy_runs` 또는 `graph_runs` 테이블이 생긴 뒤 보강하는 것이 좋다는 점
- 상태 변경은 `PATCH /strategies/:id/status`처럼 일반 수정 API와 분리하는 것이 좋다는 점
- `PATCH /strategies/:id/status` 상태 변경 API 구현
- `UpdateStrategyStatusDto`에서 `@IsEnum(StrategyStatus)`로 요청 body를 검증해야 한다는 점
- `ApiUpdateStrategyStatus()` 문서 decorator를 분리해 Scalar에서 일반 수정 API와 상태 변경 API를 구분하는 방식
- `strategyStatus`, `enabled`, `nextRunAt`의 역할 차이
- `active` 전환 전에 `structuredStrategy`를 요구하는 이유
- `active -> archived`를 직접 막고 `paused -> archived` 흐름을 권장하는 이유
- `nextRunAt`을 `scheduleAnchorAt`과 `intervalMinutes` 기준으로 계산하는 초기 방식
- `POST /strategies/:id/parse` mock 구조화 API 구현
- parse 결과를 `entryRules`, `exitRules` 같은 세부 룰 기반 JSON이 아니라 `ai_execution_plan` 형태의 AI 실행 지침으로 저장하는 방향
- `structuredStrategy`의 존재 여부를 parse 완료 여부와 active 가능 조건으로 사용하는 방식
- 별도 `parseStatus`를 두지 않고 `structuredStrategy=null`이면 미구조화, `structuredStrategy!==null`이면 구조화 완료로 보는 단순 정책
- 전략 수정 시 기존 `structuredStrategy`와 `nextRunAt`을 초기화하여 다시 parse하도록 만드는 이유
- 실제 LLM 연동 전 mock parse로 상태 변경, scheduler 준비 흐름을 먼저 검증하는 방식
- `StructuredStrategy` 타입을 먼저 고정하고 parse 결과 계약을 명확히 하는 방식
- `version=1`, `kind=ai_execution_plan`처럼 구조화 결과의 버전과 종류를 고정하는 이유
- TypeScript 타입은 컴파일 타임 검사이고, DB의 `jsonb` 값은 런타임 검증이 별도로 필요하다는 점
- `isStructuredStrategy()` validator로 `structuredStrategy`가 실제 실행 가능한 구조인지 검사하는 방식
- active 전환 조건을 단순 존재 여부에서 런타임 validator 통과로 강화하는 방식
- `StrategyParseService`를 분리해 `StrategyService`가 mock/LLM 구현 세부사항을 모르도록 만드는 방식
- 실제 LLM 호출은 비동기이므로 `parseStrategy()`를 `Promise<StructuredStrategy>`로 미리 맞춰두는 이유
- 로컬 PC의 `llama.cpp` / `llama-server`를 OpenAI-compatible API로 붙이는 방향
- `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` 같은 provider 중립적인 환경 변수 설계 방향
- `llama-server --alias` 값과 백엔드 `LLM_MODEL` 값을 맞추는 이유
- `llama-server --host 127.0.0.1`로 로컬 개발 서버를 외부 네트워크에 열지 않는 이유
- `LlmService`는 HTTP 호출과 content 추출만 담당하고, JSON parse는 도메인 계층인 `StrategyParseService`에서 처리하는 책임 분리
- LLM이 깨진 JSON을 반환할 수 있으므로 JSON parse 실패도 retry 대상에 넣어야 한다는 점
- 재귀보다 명시적인 `for` loop와 `maxAttempts`로 LLM retry를 관리하는 방식
- 실패한 LLM 응답을 `previousInvalidResult`로 다음 prompt에 전달해 자기 보정 가능성을 높이는 방식
- LLM이 잘못된 `source.market`이나 `marketDataConfig.symbol`을 반환해도 서버 DB 값을 기준으로 normalize하는 이유
- `response_format=json_object`로 시작하고 나중에 `json_schema`로 강화하는 단계적 접근

개발 원칙:

- 먼저 개념과 책임 경계를 이해한다.
- 사용자가 직접 코드를 작성한다.
- 작성한 코드를 리뷰하고 위험한 부분을 짚는다.
- 에러 메시지는 원인과 해결 방향을 함께 본다.
- 기능을 한 번에 크게 만들지 않고 작은 인증 단위부터 검증한다.
- Codex가 코드 예시를 전달할 때는 핵심 흐름이 보이도록 service 메서드의 주요 단계에 짧은 한줄 주석을 포함한다.
