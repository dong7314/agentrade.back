import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

import { UserRole } from '@/common/enums/user-role.enum';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();

    // JwtAuthGuard가 먼저 실행되어 request.user를 넣어줘야 함
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }

    return true;
  }
}
