export type KakaoProfileResponse = {
  id: number;
  kakao_account?: {
    email?: string;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
    profile?: {
      nickname?: string;
    };
  };
};

export const isKakaoProfileResponse = (
  value: unknown,
): value is KakaoProfileResponse => {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'number') return false;

  const kakaoAccount = value.kakao_account;

  if (kakaoAccount === undefined) return true;
  if (!isRecord(kakaoAccount)) return false;

  if (
    kakaoAccount.email !== undefined &&
    typeof kakaoAccount.email !== 'string'
  ) {
    return false;
  }

  if (
    kakaoAccount.is_email_valid !== undefined &&
    typeof kakaoAccount.is_email_valid !== 'boolean'
  ) {
    return false;
  }

  if (
    kakaoAccount.is_email_verified !== undefined &&
    typeof kakaoAccount.is_email_verified !== 'boolean'
  ) {
    return false;
  }

  const profile = kakaoAccount.profile;

  if (profile === undefined) return true;
  if (!isRecord(profile)) return false;

  return profile.nickname === undefined || typeof profile.nickname === 'string';
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};
