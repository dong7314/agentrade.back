# Agentrade Backend Plan

최종 업데이트: 2026-06-01

이 문서는 `backend` 폴더에서 현재까지 어디까지 개발했는지, 이번 세션에서 어떤 방식으로 학습/개발을 진행했는지, 다른 컴퓨터에서 이어서 작업할 때 무엇부터 확인하면 되는지 정리한 인수인계 문서입니다.

현재 백엔드는 NestJS + TypeORM + PostgreSQL + Scalar 기반으로 로컬 회원가입/로그인, 쿠키 기반 access/refresh token, DB 세션, Naver/Kakao OAuth 로그인 흐름까지 1차 구현된 상태입니다.

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

현재 백엔드는 이 전체 제품의 인증/사용자 기반을 먼저 만드는 단계입니다.

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

현재 핵심 테이블:

- `users`
- `auth_sessions`
- `social_accounts`
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
│   └── enums
│       ├── auth-provider.enum.ts
│       └── user-role.enum.ts
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
└── auth
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

## 12. 현재 검증 완료 상태

코드 정적 검증:

```bash
pnpm exec tsc --noEmit
pnpm exec eslint "src/**/*.ts"
pnpm exec jest --runInBand
```

위 명령은 2026-06-01 기준 통과했습니다.

서버 부팅 확인:

```bash
pnpm start
```

2026-06-01 기준 서버가 정상 부팅되고 다음 route가 매핑되는 것을 확인했습니다.

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

아직 직접 브라우저에서 끝까지 확인해야 하는 흐름:

- `GET /auth/naver`부터 실제 Naver 로그인 완료까지
- `GET /auth/kakao`부터 실제 Kakao 로그인 완료까지
- OAuth 성공 후 `users`, `social_accounts`, `auth_sessions` row 생성 확인
- 같은 email로 local 가입 후 Naver/Kakao 로그인 시 기존 user에 연결되는지 확인

## 13. 다른 컴퓨터에서 이어서 작업할 때

### 13.1 기본 준비

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

### 13.2 `.env` 구성

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

### 13.3 DB migration 적용

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
```

### 13.4 서버 실행

```bash
pnpm start:dev
```

문서 확인:

```text
http://localhost:4000/docs
```

## 14. 다음 세션 시작 체크리스트

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

DB 확인:

```bash
psql -d agentrade -c "select id, email, provider, provider_id from users order by id desc limit 5;"
psql -d agentrade -c "select id, user_id, provider, provider_user_id, email from social_accounts order by id desc limit 10;"
psql -d agentrade -c "select id, user_id, revoked_at, expires_at from auth_sessions order by created_at desc limit 10;"
```

그다음 OAuth를 실제 브라우저에서 확인합니다.

1. 브라우저에서 `http://localhost:4000/auth/naver` 접속
2. Naver 로그인 완료 후 프론트 redirect URL로 이동하는지 확인
3. DB의 `users`, `social_accounts`, `auth_sessions` 확인
4. 브라우저에서 `http://localhost:4000/auth/kakao` 접속
5. Kakao 로그인 완료 후 프론트 redirect URL로 이동하는지 확인
6. DB의 `users`, `social_accounts`, `auth_sessions` 확인

## 15. 바로 다음 작업 추천

현재 코드 기준으로 다음 작업은 아래 순서가 좋습니다.

### 15.1 OAuth 수동 검증

가장 먼저 Naver/Kakao OAuth를 실제 브라우저로 끝까지 테스트합니다.

확인할 것:

- redirect URL이 provider 개발자 콘솔에 등록된 callback URL과 정확히 일치하는지
- state cookie가 저장되고 callback에서 정상 검증되는지
- OAuth 성공 후 `access_token`, `refresh_token` cookie가 내려오는지
- `social_accounts`에 provider 계정이 생성되는지
- 같은 provider 계정으로 다시 로그인하면 user가 중복 생성되지 않는지
- 같은 email의 local user가 있을 때 social account가 기존 user에 연결되는지

### 15.2 작은 리팩토링

우선순위가 높지는 않지만 다음 정리는 해두면 좋습니다.

- `AuthService`의 `datasource` 필드명을 `dataSource`로 변경
- `AuthService`가 계속 커지면 token 발급/검증을 `AuthTokenService`로 분리 검토
- social login 공통 흐름이 더 커지면 `SocialLoginService` 분리 검토
- `users.provider`, `users.provider_id`를 계속 유지할지 제거할지 결정

### 15.3 테스트 보강

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

### 15.4 Role Guard와 관리자 권한 API

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

### 15.5 Strategy 도메인 시작

관리자 권한 기반까지 잡히면 AI 투자 제품의 핵심인 전략 도메인으로 넘어갑니다.

추천 테이블:

```text
strategies
  id
  user_id
  name
  natural_language_prompt
  structured_strategy_json
  market
  symbol
  time_frame
  interval_minutes
  enabled
  last_run_at
  next_run_at
  failure_count
  locked_until
  created_at
  updated_at
```

추천 API:

```http
POST /strategies
GET /strategies
GET /strategies/:id
PATCH /strategies/:id
DELETE /strategies/:id
POST /strategies/:id/parse
POST /strategies/:id/enable
POST /strategies/:id/disable
```

처음에는 LLM 연동 없이 structured JSON mock 또는 수동 저장으로 시작해도 됩니다.

## 16. 이후 큰 개발 로드맵

### Phase 1. Auth 안정화

- OAuth 수동 검증
- auth 테스트 최소 보강
- role guard 추가
- 관리자 권한 API 추가

### Phase 2. Strategy

- 전략 작성/조회/수정/삭제
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

## 17. 이번 세션에서 다룬 학습 내용

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

개발 원칙:

- 먼저 개념과 책임 경계를 이해한다.
- 사용자가 직접 코드를 작성한다.
- 작성한 코드를 리뷰하고 위험한 부분을 짚는다.
- 에러 메시지는 원인과 해결 방향을 함께 본다.
- 기능을 한 번에 크게 만들지 않고 작은 인증 단위부터 검증한다.
