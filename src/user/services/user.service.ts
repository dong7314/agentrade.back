import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { UserEntity } from '../entities/user.entity';
import { AuthProvider } from '@/common/enums/auth-provider.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  // email을 통해서 사용자 정보 찾기
  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOneBy({ email });

    return user;
  }

  // id를 통해서 사용자 정보 찾기
  async findById(id: number): Promise<UserEntity | null> {
    const user = await this.userRepository.findOneBy({ id });

    return user;
  }

  // email을 통해서 password가 포함된 사용자 정보 찾기
  async findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    return user;
  }

  // 로컬 회원가입
  async createLocalUser(input: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<UserEntity> {
    const user = this.userRepository.create({
      email: input.email,
      password: input.passwordHash,
      name: input.name,
    });

    const savedUser = await this.userRepository.save(user);

    return savedUser;
  }

  // 소셜 회원가입
  async createSocialUser(input: {
    email: string;
    name: string;
    provider: AuthProvider;
    providerId: string;
  }): Promise<UserEntity> {
    const user = this.userRepository.create({
      email: input.email,
      name: input.name,
      provider: input.provider,
      providerId: input.providerId,
    });

    const savedUser = await this.userRepository.save(user);

    return savedUser;
  }
}
