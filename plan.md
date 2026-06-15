# Agentrade Backend Plan

최종 업데이트: 2026-06-16

이 문서는 `backend` 폴더에서 현재까지 어디까지 개발했는지, 이번 세션에서 어떤 방식으로 학습/개발을 진행했는지, 다른 컴퓨터에서 이어서 작업할 때 무엇부터 확인하면 되는지 정리한 인수인계 문서입니다.

현재 백엔드는 NestJS + TypeORM + PostgreSQL + Scalar 기반으로 로컬 회원가입/로그인, 쿠키 기반 access/refresh token, DB 세션, Naver/Kakao OAuth 로그인, 전략 생성/목록/상세/수정/상태 변경/구조화 흐름까지 1차 구현된 상태입니다.

2026-06-16 현재 중요한 진행 상태:

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

주의:

- 실제 secret 값은 문서에 남기지 않습니다.
- `.env`는 커밋하지 않습니다.
- `JWT_ACCESS_TTL_SECONDS`, `JWT_REFRESH_TTL_SECONDS`는 `env.validation.ts`에서 number로 파싱하므로 서비스에서는 `ConfigService.getOrThrow<number>()`로 가져옵니다.
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

현재 핵심 테이블:

- `users`
- `auth_sessions`
- `social_accounts`
- `strategies`
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
    │   └── strategy.controller.ts
    ├── docs
    │   └── strategy-api.docs.ts
    ├── dto
    │   ├── create-strategy.dto.ts
    │   ├── find-strategy.query.dto.ts
    │   ├── strategy-response.dto.ts
    │   ├── update-strategy.dto.ts
    │   └── update-strategy-status.dto.ts
    ├── entities
    │   └── strategy.entity.ts
    ├── enums
    │   ├── exchange.enum.ts
    │   ├── strategy-mode.enum.ts
    │   └── strategy-status.enum.ts
    ├── services
    │   └── strategy.service.ts
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

2026-06-16 기준 전략 도메인은 생성/목록/상세/수정/상태 변경/구조화까지 구현했습니다.

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
- service가 기존 `prompt`, `market`, 실행 옵션을 읽어 mock `structuredStrategy`를 생성합니다.

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
  - `structuredStrategy`가 없으면 400을 반환합니다.
  - `structuredStrategy`가 있으면 `strategyStatus=active`, `enabled=true`, `nextRunAt=다음 실행 시각`으로 저장합니다.
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
- 현재 구현은 실제 LLM 호출 없이 mock `structuredStrategy`를 생성합니다.
- `structuredStrategy`는 세부 매수/매도 룰 목록이 아니라 AI 실행 에이전트에게 전달할 실행 지침과 데이터 접근 옵션을 담습니다.
- parse 성공 여부는 별도 `parseStatus`를 두지 않고 `structuredStrategy !== null` 여부로 판단합니다.
- `structuredStrategy`가 있으면 active 전환이 가능하고, 없으면 active 전환 시 400을 반환합니다.

현재 mock `structuredStrategy` 형태:

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
    "allowMarketData": true,
    "allowOnchainData": false
  },
  "marketDataConfig": {
    "symbol": "KRW-BTC",
    "timeframes": ["15m", "1h", "4h", "1d"],
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
- 아직 scheduler worker와 run lock이 없으므로, 지금은 `enabled`와 `strategyStatus` 기준의 1차 방어만 둡니다.
- 나중에 `strategy_runs` 또는 `graph_runs`가 생기면 실제 running/pending/approval_waiting run 여부까지 확인해서 더 정확히 막습니다.

현재 `StrategyEntity` 주요 컬럼:

```text
id
user_id
name
exchange
market
prompt
strategy_mode
interval_minutes
schedule_anchor_at
next_run_at
enabled
strategy_status
structured_strategy
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

- 실제 Scalar에서 전략 생성/목록/상세/수정/구조화/상태 변경을 한 번 더 수동 확인하면 좋습니다.
- `POST /strategies/:id/parse` 이후 `structuredStrategy`가 저장되는지 확인해야 합니다.
- parse 전에는 `strategyStatus=active` 변경 요청이 400을 반환하고, parse 후에는 active 전환이 성공해야 합니다.
- 전략 수정 후 `structuredStrategy=null`, `nextRunAt=null`로 초기화되는지 확인해야 합니다.
- 현재 parse는 mock이므로, 다음 단계에서 실제 LLM 구조화와 schema 검증 계층을 붙여야 합니다.
- scheduler/run 테이블이 생기면 실제 실행 중인 전략 수정 차단을 `run_status` 기준으로 보강해야 합니다.

## 13. 현재 검증 완료 상태

코드 정적 검증:

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/**/*.ts"
pnpm exec jest --runInBand
```

위 명령은 2026-06-14 기준 통과했습니다.

2026-06-16 기준 `POST /strategies/:id/parse` mock 구조화 API를 추가했습니다. 다만 현재 작업 환경에서는 `pnpm` 명령을 찾지 못해 Codex가 직접 정적 검증을 다시 실행하지 못했습니다. 로컬 터미널에서 아래 명령을 다시 확인하면 됩니다.

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/strategy/**/*.ts"
pnpm exec jest --runInBand
```

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

현재 코드 기준으로 다음 작업은 아래 순서가 좋습니다.

### 16.1 전략 API 수동 검증

다음으로는 Scalar에서 전략 생성/수정/parse/상태 변경 흐름을 끝까지 확인하는 것이 좋습니다. 현재 parse API는 구현되어 있으므로, 이제는 active 전환 성공/실패 정책이 실제 HTTP 흐름에서 의도대로 동작하는지 확인하는 단계입니다.

확인할 흐름:

1. `POST /strategies`로 초안 전략 생성
2. `PATCH /strategies/:id/status` body `{ "strategyStatus": "active" }` 요청
3. parse 전이므로 `structuredStrategy=null` 때문에 400이 반환되는지 확인
4. `POST /strategies/:id/parse` 요청
5. 응답의 `structuredStrategy.kind`가 `ai_execution_plan`인지 확인
6. 다시 `PATCH /strategies/:id/status` body `{ "strategyStatus": "active" }` 요청
7. 응답에서 `strategyStatus=active`, `enabled=true`, `nextRunAt` 값 확인
8. `PATCH /strategies/:id/status` body `{ "strategyStatus": "paused" }` 요청
9. 응답에서 `strategyStatus=paused`, `enabled=false`, `nextRunAt=null` 확인
10. paused 상태에서 `PATCH /strategies/:id`로 `prompt` 또는 `market` 수정
11. 응답에서 `structuredStrategy=null`, `nextRunAt=null`로 초기화되는지 확인
12. 다시 active 전환을 시도하면 400, 다시 parse하면 active 전환 성공인지 확인

### 16.2 Strategy 테스트 보강

상태 변경과 parse 정책은 앞으로 scheduler와 주문 실행의 안전장치가 되므로 최소 단위 테스트를 붙이는 것이 좋습니다.

우선 추천하는 테스트:

- `StrategyService.parse`
  - archived 전략이면 400
  - active/enabled 전략이면 400
  - draft 또는 paused 전략이면 `structuredStrategy` 저장
  - 저장된 `structuredStrategy.kind`가 `ai_execution_plan`
  - 저장된 `structuredStrategy.source.prompt`와 `source.market`이 전략 값과 일치
- `StrategyService.update`
  - prompt/market/interval/schedule 변경 시 `structuredStrategy=null`
  - prompt/market/interval/schedule 변경 시 `nextRunAt=null`
  - active/enabled 전략 수정 400
  - archived 전략 수정 400
- `StrategyService.updateStatus`
  - `structuredStrategy=null`이면 active 전환 400
  - `structuredStrategy`가 있으면 active 전환 성공
  - active 전환 시 `enabled=true`, `nextRunAt` 계산
  - active 전략을 paused로 바꾸면 `enabled=false`, `nextRunAt=null`
  - active 전략을 바로 archived로 바꾸면 400
  - draft/paused 전략을 archived로 바꾸면 `enabled=false`, `nextRunAt=null`
  - archived 전략은 다른 상태로 변경 불가
  - 같은 상태 요청은 no-op으로 반환

### 16.3 실제 LLM parse 준비

mock parse가 검증되면 실제 LLM 연동을 붙이기 전에 `structuredStrategy` schema를 명확히 고정하는 것이 좋습니다. 지금 구조는 룰 기반 자동매매 JSON이 아니라 AI 실행 에이전트에게 전달할 실행 지침과 데이터 접근 옵션입니다.

현재 유지할 핵심 구조:

```json
{
  "version": 1,
  "kind": "ai_execution_plan",
  "source": {
    "prompt": "사용자 원문 prompt",
    "market": "KRW-BTC"
  },
  "aiInstructions": {
    "summary": "AI가 참고할 전략 요약",
    "decisionProcess": []
  },
  "dataPermissions": {
    "allowNewsSearch": true,
    "allowMarketData": true,
    "allowOnchainData": false
  },
  "marketDataConfig": {
    "symbol": "KRW-BTC",
    "timeframes": ["15m", "1h", "4h", "1d"],
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

다음에 정할 것:

- `allowNewsSearch`, `timeframes`, `primaryTimeframe` 같은 옵션을 사용자가 직접 입력하게 할지 여부
- `riskPreferences` 기본값을 사용자 설정에서 가져올지 여부
- LLM 응답을 저장하기 전에 class-validator, zod, 또는 별도 검증 함수로 schema를 검사할지 여부
- `structuredStrategy !== null`만으로 active를 허용할지, `kind=ai_execution_plan`까지 확인할지 여부

### 16.4 전략 활성화 흐름 정책 유지

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
- `intervalMinutes` 유효
- `scheduleAnchorAt` 유효
- `nextRunAt` 계산 가능

`nextRunAt` 계산은 처음에는 단순하게 시작해도 됩니다.

- 현재 시간이 `scheduleAnchorAt`보다 이전이면 `nextRunAt=scheduleAnchorAt`
- 현재 시간이 이미 지났으면 `intervalMinutes` 단위로 다음 실행 시간을 계산

정확한 시간 계산은 scheduler worker를 붙일 때 다시 다듬습니다.

### 16.5 작은 리팩토링

우선순위가 높지는 않지만 다음 정리는 해두면 좋습니다.

- `StrategyService.update()`의 "수정 가능 상태" 정책이 커지면 별도 private method로 분리 검토
- `StrategyService.createMockStructuredStrategy()`가 커지면 `StrategyParseService` 또는 별도 builder로 분리 검토
- `nextRunAt` 계산 로직이 생기면 공통 util 또는 domain method로 분리 검토
- `AuthService`의 `datasource` 필드명을 `dataSource`로 변경
- `AuthService`가 계속 커지면 token 발급/검증을 `AuthTokenService`로 분리 검토
- social login 공통 흐름이 더 커지면 `SocialLoginService` 분리 검토
- `users.provider`, `users.provider_id`를 계속 유지할지 제거할지 결정

### 16.6 추가 테스트 보강

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
  - 구조화된 전략 active 전환 성공
  - paused 전환 시 `enabled=false`, `nextRunAt=null`
  - active 전략의 직접 archived 전환 400
  - archived 전략 상태 변경 차단

### 16.7 Role Guard와 관리자 권한 API

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

- `next_run_at`, `enabled`, `locked_until`, `failure_count` 기반 claim
- 중복 실행 방지
- `graph_runs` 생성

### Phase 4. Workflow Run

- run 상태 저장
- step 상태 저장
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

- 가상 계좌
- 가상 포지션
- 가상 주문
- 가상 체결
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

개발 원칙:

- 먼저 개념과 책임 경계를 이해한다.
- 사용자가 직접 코드를 작성한다.
- 작성한 코드를 리뷰하고 위험한 부분을 짚는다.
- 에러 메시지는 원인과 해결 방향을 함께 본다.
- 기능을 한 번에 크게 만들지 않고 작은 인증 단위부터 검증한다.
