import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { PaperPortfolioService } from '@/paper-trading/services/paper-portfolio.service';

import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly paperPortfolioService: PaperPortfolioService,
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

    // 사용자 저장
    const savedUser = await this.userRepository.save(user);
    // 가상 계좌 저장
    await this.paperPortfolioService.createDefaultAccountForUser(savedUser.id);

    return savedUser;
  }
}
