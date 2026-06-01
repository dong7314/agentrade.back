import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthSessionEntity } from '../entities/auth-session.entity';

import { Repository } from 'typeorm';

@Injectable()
export class AuthSessionService {
  constructor(
    @InjectRepository(AuthSessionEntity)
    private readonly sessionRepository: Repository<AuthSessionEntity>,
  ) {}

  findById(id: string): Promise<AuthSessionEntity | null> {
    return this.sessionRepository.findOneBy({ id });
  }

  // 토큰 해쉬 값을 가져오는 서비스
  findByIdWithTokenHash(id: string) {
    return this.sessionRepository
      .createQueryBuilder('session')
      .addSelect('session.refreshTokenHash')
      .where('session.id = :id', { id })
      .getOne();
  }

  // session 생성
  create(input: {
    id: string;
    userId: number;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const session = this.sessionRepository.create({
      id: input.id,
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });

    return this.sessionRepository.save(session);
  }

  // 저장된 값을 업데이트 진행
  async rotate(id: string, refreshTokenHash: string, expiresAt: Date) {
    await this.sessionRepository.update(id, {
      refreshTokenHash,
      expiresAt,
      revokedAt: null,
    });
  }

  async revoke(id: string) {
    await this.sessionRepository.update(id, {
      revokedAt: new Date(),
    });
  }
}
