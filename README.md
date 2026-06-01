# Agentrade Backend

NestJS + TypeORM + 로컬 PostgreSQL + Scalar API Docs 기반 백엔드 학습 환경입니다.

## Stack

- pnpm
- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- Scalar API Reference

## Setup

```bash
pnpm install
cp .env.example .env
```

로컬 PostgreSQL을 사용합니다. `.env`의 DB 값을 본인 로컬 설정에 맞게 수정하세요.

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=agentrade
DB_PASSWORD=agentrade
DB_NAME=agentrade
```

DB가 없다면 로컬에서 먼저 생성합니다.

```bash
createdb agentrade
```

## Run

```bash
pnpm start:dev
```

- API health: http://localhost:4000/api/health
- Scalar docs: http://localhost:4000/docs
- OpenAPI JSON: http://localhost:4000/openapi.json

## Scripts

```bash
pnpm lint
pnpm build
pnpm test
pnpm test:e2e

pnpm migration:generate src/database/migrations/CreateUsers
pnpm migration:run
pnpm migration:revert
```

## Folder Notes

- `src/config`: 환경변수 검증과 Nest 런타임 설정
- `src/database`: TypeORM CLI용 data source와 migration 위치
- `TYPEORM_SYNCHRONIZE=false`가 기본값입니다. 스키마 변경은 migration으로 관리합니다.
