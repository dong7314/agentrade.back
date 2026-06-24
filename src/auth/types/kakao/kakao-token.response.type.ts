import { isRecord } from '@/common/utils/is-record';

export type KakaoTokenResponse = {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
};

export const isKakaoTokenResponse = (
  value: unknown,
): value is KakaoTokenResponse => {
  return (
    isRecord(value) &&
    typeof value.token_type === 'string' &&
    typeof value.access_token === 'string' &&
    typeof value.expires_in === 'number'
  );
};
