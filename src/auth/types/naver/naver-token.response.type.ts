export type NaverTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: string;
};

export const isNaverTokenResponse = (
  value: unknown,
): value is NaverTokenResponse => {
  return (
    isRecord(value) &&
    typeof value.access_token === 'string' &&
    typeof value.token_type === 'string'
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};
