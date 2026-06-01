import { UserRole } from '@/common/enums/user-role.enum';

export type AuthenticatedUser = {
  id: number;
  email: string;
  role: UserRole;
  sessionId: string;
};
