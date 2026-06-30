import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';

import { PaperPortfolioService } from '@/paper-trading/services/paper-portfolio.service';

import { UserEntity } from '../entities/user.entity';

import { PaginatedResult } from '@/common/types/paginated.type';
import { createPaginationMeta } from '@/common/utils/create-pagination-meta';
import { FindAdminUsersQueryDto } from '../dto/find-admin-users-query.dto';
import { UpdateUserPermissionsDto } from '../dto/update-user-permissions.dto';

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

  // 사용자 검색 메서드
  async findAllForAdmin(
    query: FindAdminUsersQueryDto,
  ): Promise<PaginatedResult<UserEntity>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;

    const paperTradingEnabled =
      query.paperTradingEnabled === undefined
        ? undefined
        : query.paperTradingEnabled === 'true';

    const liveTradingEnabled =
      query.liveTradingEnabled === undefined
        ? undefined
        : query.liveTradingEnabled === 'true';

    const baseWhere: FindOptionsWhere<UserEntity> = {
      ...(query.role ? { role: query.role } : {}),
      ...(paperTradingEnabled === undefined ? {} : { paperTradingEnabled }),
      ...(liveTradingEnabled === undefined ? {} : { liveTradingEnabled }),
    };

    const where: FindOptionsWhere<UserEntity>[] | FindOptionsWhere<UserEntity> =
      query.search
        ? [
            // email 또는 name 중 하나라도 검색어와 맞으면 조회
            { ...baseWhere, email: ILike(`%${query.search}%`) },
            { ...baseWhere, name: ILike(`%${query.search}%`) },
          ]
        : baseWhere;

    const [items, total] = await this.userRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: createPaginationMeta({ page, limit, total }),
    };
  }

  // 사용자 한명을 찾는 메서드
  async findOneForAdmin(userId: number): Promise<UserEntity> {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  // 권한 업데이트
  async updatePermissions(
    userId: number,
    dto: UpdateUserPermissionsDto,
  ): Promise<UserEntity> {
    const user = await this.findOneForAdmin(userId);

    // 관리자 화면에서 사용자 권한을 필요한 값만 부분 수정
    user.paperTradingEnabled =
      dto.paperTradingEnabled ?? user.paperTradingEnabled;
    user.liveTradingEnabled = dto.liveTradingEnabled ?? user.liveTradingEnabled;
    user.role = dto.role ?? user.role;

    return this.userRepository.save(user);
  }
}
