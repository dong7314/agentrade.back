import { isRecord } from '@/common/utils/is-record';

export type NaverProfileResponse = {
  resultcode: string;
  message: string;
  response: {
    id: string;
    email?: string;
    name?: string;
  };
};

export const isNaverProfileResponse = (
  value: unknown,
): value is NaverProfileResponse => {
  if (!isRecord(value)) return false;
  if (typeof value.resultcode !== 'string') return false;
  if (typeof value.message !== 'string') return false;

  const response = value.response;

  if (!isRecord(response)) return false;
  if (typeof response.id !== 'string') return false;
  if (response.email !== undefined && typeof response.email !== 'string') {
    return false;
  }
  if (response.name !== undefined && typeof response.name !== 'string') {
    return false;
  }

  return true;
};
