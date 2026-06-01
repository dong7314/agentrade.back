import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { randomUUID } from 'crypto';
import { hash, compare } from 'bcrypt';

import { JwtService } from '@nestjs/jwt';
import { UserService } from '@/user/services/user.service';
import { ConfigService } from '@nestjs/config';
import { AuthSessionService } from './auth-session.service';
import { SocialAccountService } from './social-account.service';

import { UserEntity } from '@/user/entities/user.entity';
import { SocialAccountEntity } from '../entities/social-account.entity';

import { isUniqueViolation } from '@/database/utils/is-unique-violation';

import { AuthProvider } from '@/common/enums/auth-provider.enum';
import { LocalLoginDto } from '../dto/login.dto';
import { LoginResultDto } from '../dto/login.result.dto';
import { LocalRegisterDto } from '../dto/register.dto';
import { toUserResponse, UserResponseDto } from '@/user/dto/user.response.dto';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly authSessionService: AuthSessionService,
    private readonly socialAccountService: SocialAccountService,
  ) {}

  async register(dto: LocalRegisterDto): Promise<UserResponseDto> {
    // 이메일 중복 검사
    const isExistUser = await this.userService.findByEmail(dto.email);

    if (isExistUser) {
      throw new ConflictException('이메일이 중복 되었습니다.');
    }
    // 암호 해쉬화
    const passwordHash = await hash(dto.password, 10);

    const user = await this.userService.createLocalUser({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    return toUserResponse(user);
  }

  async login(dto: LocalLoginDto): Promise<LoginResultDto> {
    // 이메일을 통해 사용자 정보 확인
    const user = await this.userService.findByEmailWithPassword(dto.email);
    // 사용자 정보가 없거나 사용자 정보의 패스워드가 존재 하지 않을 때 오류 발생
    if (!user || !user.password) {
      throw new UnauthorizedException('사용자의 정보가 일치하지 않습니다.');
    }
    // 찾은 사용자 정보와 해시된 패스워드 체크
    const isPasswordCorrect = await compare(dto.password, user.password);

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('사용자의 정보가 일치하지 않습니다.');
    }

    return await this.createLoginResult(user);
  }

  // refresh 재발급
  async refresh(
    refreshToken: string | undefined | null,
  ): Promise<LoginResultDto> {
    // refresh 토큰이 없을 때
    if (!refreshToken) {
      throw new UnauthorizedException('인증 정보가 유효하지 않습니다.');
    }

    let payload: RefreshTokenPayload;
    // env에 있는 refresh secret 정보로 refresh token 검증 진행
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('인증 정보가 유효하지 않습니다.');
    }
    // 타입이 refresh가 아닐 시 인증 거절
    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('인증 정보가 유효하지 않습니다.');
    }

    const session = await this.authSessionService.findByIdWithTokenHash(
      payload.sid,
    );

    // 전달된 세션 데이터가 기간 만료, 만료 되었을 시에 인증 거절
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('인증 정보가 유효하지 않습니다.');
    }

    // db에 저장된 refresh 값과 받아온 refresh 값을 비교해 탈취 여부 검사
    const isRefreshTokenValid = await compare(
      refreshToken,
      session.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      await this.authSessionService.revoke(payload.sid);
      throw new UnauthorizedException('인증 정보가 유효하지 않습니다.');
    }

    const user = await this.userService.findById(payload.sub);

    if (!user) {
      // 만료처리 진행
      await this.authSessionService.revoke(payload.sid);
      throw new UnauthorizedException('인증 정보가 유효하지 않습니다.');
    }

    const userResponse = toUserResponse(user);

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: payload.sid,
    };

    const nextRefreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sid: payload.sid,
      tokenType: 'refresh',
    };

    const [accessToken, nextRefreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.getAccessTtlSeconds(),
      }),
      this.jwtService.signAsync(nextRefreshPayload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.getRefreshTtlSeconds(),
      }),
    ]);

    // refresh 토큰 업데이트 진행
    await this.authSessionService.rotate(
      payload.sid,
      await hash(nextRefreshToken, 10),
      new Date(Date.now() + this.getRefreshTtlSeconds() * 1000),
    );

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      user: userResponse,
    };
  }

  // id를 통해 아이디 정보 찾은 후 사용자 정보 전달
  async me(userId: number): Promise<UserResponseDto> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('인증 정보가 유효하지 않습니다.');
    }

    return toUserResponse(user);
  }

  // 로그아웃 기능
  async logout(refreshToken: string | null | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      return;
    }

    if (payload.tokenType !== 'refresh') {
      return;
    }

    await this.authSessionService.revoke(payload.sid);
  }

  // 사용자 정보를 찾은 후 소셜 로그인을 진행하거나 연결을 도와주는 메서드
  async findOrCreateUserForSocialLogin(input: {
    provider: AuthProvider;
    providerUserId: string;
    email: string;
    name: string;
    displayName: string | null;
  }): Promise<UserEntity> {
    try {
      // 트렌젝션 처리로 db 저장 흐름 그룹핑
      return this.dataSource.transaction(async (manager) => {
        const userRepository = manager.getRepository(UserEntity);
        const socialAccountRepository =
          manager.getRepository(SocialAccountEntity);

        const existingSocialAccount = await socialAccountRepository.findOne({
          where: {
            provider: input.provider,
            providerUserId: input.providerUserId,
          },
          relations: {
            user: true,
          },
        });

        if (existingSocialAccount) {
          return existingSocialAccount.user;
        }

        let user = await userRepository.findOneBy({
          email: input.email,
        });

        if (!user) {
          user = userRepository.create({
            email: input.email,
            name: input.name,
            provider: input.provider,
            providerId: input.providerUserId,
          });

          user = await userRepository.save(user);
        }

        const socialAccount = socialAccountRepository.create({
          userId: user.id,
          provider: input.provider,
          providerUserId: input.providerUserId,
          email: input.email,
          displayName: input.displayName,
        });

        await socialAccountRepository.save(socialAccount);

        return user;
      });
    } catch (error) {
      // 유니크 위배 시에 계정 정보 재조회 진행
      if (isUniqueViolation(error)) {
        const socialAccount =
          await this.socialAccountService.findByProviderAndProviderUserIdWithUser(
            input.provider,
            input.providerUserId,
          );

        if (socialAccount) {
          return socialAccount.user;
        }
      }

      throw error;
    }
  }

  // 사용자에 따라서 토큰 생성 후 결과 값을 반환
  async createLoginResult(user: UserEntity): Promise<LoginResultDto> {
    const userResponse = toUserResponse(user);
    // refresh 토큰 session id 생성
    const sessionId = randomUUID();

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sid: sessionId,
      tokenType: 'refresh',
    };

    // payload를 통한 토큰 발급 진행
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.getAccessTtlSeconds(),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.getRefreshTtlSeconds(),
      }),
    ]);

    await this.authSessionService.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: await hash(refreshToken, 10),
      expiresAt: new Date(Date.now() + this.getRefreshTtlSeconds() * 1000),
    });

    return {
      accessToken,
      refreshToken,
      user: userResponse,
    };
  }

  private getAccessTtlSeconds(): number {
    return this.configService.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS');
  }

  private getRefreshTtlSeconds(): number {
    return this.configService.getOrThrow<number>('JWT_REFRESH_TTL_SECONDS');
  }
}
