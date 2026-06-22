import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  createHash,
  randomUUID,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'crypto';
import { Repository } from 'typeorm';
import jwt from 'jsonwebtoken';

import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';

import { UpbitCredentialEntity } from '../entities/upbit-credential.entity';

import { UpbitPlainCredential } from '../types/auth/upbit-plain-credential.type';

@Injectable()
export class UpbitAuthService {
  constructor(
    @InjectRepository(UpbitCredentialEntity)
    private readonly upbitCredentialRepository: Repository<UpbitCredentialEntity>,
    private readonly configService: ConfigService,
  ) {}

  createAccessToken(input: UpbitPlainCredential): string {
    const payload = {
      access_key: input.accessKey,
      nonce: randomUUID(),
    };

    return jwt.sign(payload, input.secretKey);
  }

  createAuthorizationHeader(input: UpbitPlainCredential): string {
    return `Bearer ${this.createAccessToken(input)}`;
  }

  // credential 값 저장 로직
  async upsertCredential(input: {
    userId: number;
    accessKey: string;
    secretKey: string;
  }): Promise<UpbitCredentialEntity> {
    // encrypt화 진행
    const encryptedAccessKey = this.encrypt(input.accessKey);
    const encryptedSecretKey = this.encrypt(input.secretKey);

    const existingCredential = await this.upbitCredentialRepository.findOneBy({
      userId: input.userId,
    });

    if (existingCredential) {
      // 이미 저장된 데이터가 존재한다면 업데이트 진행
      existingCredential.encryptedAccessKey = encryptedAccessKey;
      existingCredential.encryptedSecretKey = encryptedSecretKey;

      return this.upbitCredentialRepository.save(existingCredential);
    }

    return this.upbitCredentialRepository.save(
      this.upbitCredentialRepository.create({
        userId: input.userId,
        encryptedAccessKey,
        encryptedSecretKey,
      }),
    );
  }

  // credential 존재 여부 확인
  async hasCredential(userId: number): Promise<boolean> {
    const count = await this.upbitCredentialRepository.count({
      where: {
        userId,
      },
    });

    return count > 0;
  }

  // encrypt화 된 credential을 decrypt화 진행
  async getDecryptedCredential(userId: number): Promise<UpbitPlainCredential> {
    const credential = await this.upbitCredentialRepository.findOneBy({
      userId,
    });

    if (!credential) {
      throw new NotFoundException('업비트 API 키가 등록되어 있지 않습니다.');
    }

    return {
      accessKey: this.decrypt(credential.encryptedAccessKey),
      secretKey: this.decrypt(credential.encryptedSecretKey),
    };
  }

  // credential encrypt 진행
  private encrypt(value: string): string {
    const key = this.createEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  // credential decrypt 진행
  private decrypt(value: string): string {
    const [ivText, authTagText, encryptedText] = value.split(':');

    if (!ivText || !authTagText || !encryptedText) {
      throw new BadRequestException(
        '저장된 업비트 API 키 형식이 올바르지 않습니다.',
      );
    }

    const key = this.createEncryptionKey();
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivText, 'base64'),
    );

    decipher.setAuthTag(Buffer.from(authTagText, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedText, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  // encrpy화를 진행할 key 값을 가져오는 메서드
  private createEncryptionKey(): Buffer {
    const secret = this.configService.getOrThrow<string>(
      'CREDENTIAL_ENCRYPTION_KEY',
    );

    return createHash('sha256').update(secret).digest();
  }
}
