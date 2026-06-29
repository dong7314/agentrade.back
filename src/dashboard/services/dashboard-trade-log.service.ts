import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { StrategyOrderApprovalEntity } from '@/strategy/entities/strategy-order-approval.entity';

import { createPaginationMeta } from '@/common/utils/create-pagination-meta';

import {
  DashboardTradeLogItemDto,
  DashboardTradeLogsResponseDto,
} from '../dto/response/dashboard-trade-log-response.dto';
import { DashboardTradeLogsQueryDto } from '../dto/query/dashboard-trade-log-query.dto';

@Injectable()
export class DashboardTradeLogService {
  constructor(
    @InjectRepository(StrategyOrderApprovalEntity)
    private readonly approvalRepository: Repository<StrategyOrderApprovalEntity>,
  ) {}

  async getTradeLogs(input: {
    userId: number;
    query: DashboardTradeLogsQueryDto;
  }): Promise<DashboardTradeLogsResponseDto> {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;

    // 현재 단계에서는 approval 테이블을 거래/주문 로그의 1차 소스로 사용
    const [approvals, total] = await this.approvalRepository.findAndCount({
      where: {
        userId: input.userId,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: DashboardTradeLogItemDto.fromApprovals(approvals),
      meta: createPaginationMeta({ page, limit, total }),
    };
  }
}
