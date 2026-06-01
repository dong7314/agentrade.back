type RawEnv = Record<string, string | undefined>;
type ValidatedEnv = Record<string, string | number | boolean | undefined>;

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer env value: ${value}`);
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;

  if (value !== 'true' && value !== 'false') {
    throw new Error(`Invalid boolean env value: ${value}`);
  }

  return value === 'true';
}

export function validateEnv(config: RawEnv): ValidatedEnv {
  return {
    ...config,
    NODE_ENV: config.NODE_ENV ?? 'development',
    PORT: parsePositiveInteger(config.PORT, 4000),
    CORS_ORIGIN: config.CORS_ORIGIN ?? 'http://localhost:3000',
    DB_HOST: config.DB_HOST ?? 'localhost',
    DB_PORT: parsePositiveInteger(config.DB_PORT, 5432),
    DB_USER: config.DB_USER ?? 'agentrade',
    DB_PASSWORD: config.DB_PASSWORD ?? 'agentrade',
    DB_NAME: config.DB_NAME ?? 'agentrade',
    TYPEORM_SYNCHRONIZE: parseBoolean(config.TYPEORM_SYNCHRONIZE, false),
    TYPEORM_LOGGING: parseBoolean(config.TYPEORM_LOGGING, true),
    NAVER_CLIENT_ID: config.NAVER_CLIENT_ID,
    NAVER_CLIENT_SECRET: config.NAVER_CLIENT_SECRET,
    NAVER_CALLBACK_URL: config.NAVER_CALLBACK_URL,
    FRONTEND_AUTH_REDIRECT_URL: config.FRONTEND_AUTH_REDIRECT_URL,
    KAKAO_REST_API_KEY: config.KAKAO_REST_API_KEY,
    KAKAO_CLIENT_SECRET: config.KAKAO_CLIENT_SECRET,
    KAKAO_CALLBACK_URL: config.KAKAO_CALLBACK_URL,
    JWT_ACCESS_SECRET: config.JWT_ACCESS_SECRET ?? 'test_jwt_access_secret',
    JWT_REFRESH_SECRET: config.JWT_REFRESH_SECRET ?? 'test_jwt_refresh_secret',
    JWT_ACCESS_TTL_SECONDS: parsePositiveInteger(
      config.JWT_ACCESS_TTL_SECONDS,
      1800,
    ),
    JWT_REFRESH_TTL_SECONDS: parsePositiveInteger(
      config.JWT_REFRESH_TTL_SECONDS,
      604800,
    ),
  };
}
