import { UserRole } from '@/common/enums/user-role.enum';

export type AccessTokenPayload = {
  sub: number;
  email: string;
  role: UserRole;
  sid: string;
};

export type RefreshTokenPayload = {
  sub: number;
  sid: string;
  tokenType: 'refresh';
};
