import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Between,
  Repository,
  LessThanOrEqual,
  MoreThanOrEqual,
  FindOptionsWhere,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { StrategyEntity } from '../entities/strategy.entity';
import { StrategyOrderApprovalEntity } from '../entities/strategy-order-approval.entity';

import { LiveOrderService } from '@/upbit/services/live-order.service';
import { PaperOrderService } from '@/paper-trading/services/paper-order.service';

import { createPaginationMeta } from '@/common/utils/create-pagination-meta';

import { StrategyMode } from '../enums/strategy-mode.enum';
import { RiskCheckResult } from '../types/risk-check-result.type';
import { PaginatedResult } from '@/common/types/paginated.type';
import { AiDecisionResult } from '../types/ai-decision-result.type';
import { StrategyOrderApprovalStatus } from '../enums/strategy-order-approval-status.enum';
import { FindStrategyOrderApprovalQueryDto } from '../dto/find-strategy-order-approval.query.dto';
import type { TradeOrderResult } from '../types/trade-order-result.type';

@Injectable()
export class StrategyOrderApprovalService {
  constructor(
    @InjectRepository(StrategyOrderApprovalEntity)
    private readonly approvalRepository: Repository<StrategyOrderApprovalEntity>,
    private readonly liveOrderService: LiveOrderService,
    private readonly paperOrderService: PaperOrderService,
  ) {}

  // 페이지를 통해서 결재 이력들 아이템을 가져오는 메서드
  async findAllByUserId(
    userId: number,
    query: FindStrategyOrderApprovalQueryDto,
  ): Promise<PaginatedResult<StrategyOrderApprovalEntity>> {
    const { page, limit } = query;

    const where: FindOptionsWhere<StrategyOrderApprovalEntity> = {
      userId,
      ...(query.strategyId ? { strategyId: query.strategyId } : {}),
      ...(query.market ? { market: query.market } : {}),
      ...(query.mode ? { strategyMode: query.mode } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    if (query.dateFrom && query.dateTo) {
      where.createdAt = Between(
        new Date(query.dateFrom),
        new Date(query.dateTo),
      );
    } else if (query.dateFrom) {
      where.createdAt = MoreThanOrEqual(new Date(query.dateFrom));
    } else if (query.dateTo) {
      where.createdAt = LessThanOrEqual(new Date(query.dateTo));
    }

    const [items, total] = await this.approvalRepository.findAndCount({
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

  // 사용자 id 및 approval id를 통하여 pending 상태의 approval을 반환
  async findPendingByUser(
    userId: number,
    approvalId: number,
  ): Promise<StrategyOrderApprovalEntity> {
    const approval = await this.approvalRepository.findOneBy({
      userId,
      id: approvalId,
      status: StrategyOrderApprovalStatus.PENDING,
    });

    if (!approval) {
      throw new NotFoundException(
        'Pending 상태인 주문 후보가 존재하지 않습니다.',
      );
    }

    return approval;
  }

  async findOneByStrategyRunId(input: {
    userId: number;
    strategyRunId: number;
  }): Promise<StrategyOrderApprovalEntity | null> {
    // 특정 strategy run에서 생성된 approval이 있는지 조회
    return this.approvalRepository.findOneBy({
      userId: input.userId,
      strategyRunId: input.strategyRunId,
    });
  }

  // 승인 대기 상태 생성
  async createPending(input: {
    strategy: StrategyEntity;
    strategyRunId: number;
    aiDecision: AiDecisionResult;
    riskCheck: RiskCheckResult;
  }): Promise<StrategyOrderApprovalEntity> {
    // risk check 통과 주문만 승인 대기로 저장
    if (!input.riskCheck.passed || !input.riskCheck.adjustedOrder) {
      throw new BadRequestException(
        '승인 대기 주문 후보를 생성할 수 없습니다.',
      );
    }

    const adjustedOrder = input.riskCheck.adjustedOrder;

    // 사용자가 나중에 승인/거절할 주문 후보 저장
    return this.approvalRepository.save(
      this.approvalRepository.create({
        userId: input.strategy.userId,
        strategyId: input.strategy.id,
        strategyRunId: input.strategyRunId,
        strategyMode: input.strategy.strategyMode,
        market: input.strategy.market,
        decision: adjustedOrder.decision,
        orderType: adjustedOrder.orderType,
        decisionReason: input.aiDecision.reason,
        adjustedOrder,
        riskCheckResult: input.riskCheck,
        orderResult: null,
        status: StrategyOrderApprovalStatus.PENDING,
        rejectReason: null,
        decidedAt: null,
      }),
    );
  }

  // 승인 거절
  async reject(input: {
    userId: number;
    approvalId: number;
    reason?: string;
  }): Promise<StrategyOrderApprovalEntity> {
    // pending 상태일 때만 rejected로 변경
    const rejectResult = await this.approvalRepository.update(
      {
        id: input.approvalId,
        userId: input.userId,
        status: StrategyOrderApprovalStatus.PENDING,
      },
      {
        status: StrategyOrderApprovalStatus.REJECTED,
        rejectReason: input.reason ?? null,
        decidedAt: new Date(),
      },
    );

    if (rejectResult.affected !== 1) {
      throw new BadRequestException(
        '이미 처리되었거나 거절할 수 없는 주문 후보입니다.',
      );
    }

    const approval = await this.approvalRepository.findOneBy({
      id: input.approvalId,
      userId: input.userId,
    });

    if (!approval) {
      throw new NotFoundException('주문 후보가 존재하지 않습니다.');
    }

    return approval;
  }

  // 승인 진행
  async approve(input: {
    userId: number;
    approvalId: number;
  }): Promise<StrategyOrderApprovalEntity> {
    // 같은 approval을 동시에 승인하지 못하도록 pending 상태를 먼저 선점 진행
    const claimResult = await this.approvalRepository.update(
      {
        id: input.approvalId,
        userId: input.userId,
        status: StrategyOrderApprovalStatus.PENDING,
      },
      {
        status: StrategyOrderApprovalStatus.APPROVED,
        decidedAt: new Date(),
      },
    );

    if (claimResult.affected !== 1) {
      throw new BadRequestException(
        '이미 처리되었거나 승인할 수 없는 주문 후보입니다.',
      );
    }

    // 선점한 approval을 다시 조회해서 주문 실행에 필요한 데이터를 가져옴
    const approval = await this.approvalRepository.findOneBy({
      id: input.approvalId,
      userId: input.userId,
    });

    if (!approval) {
      throw new NotFoundException('주문 후보가 존재하지 않습니다.');
    }

    try {
      // 승인 시점에 paper/live 주문 서비스 호출
      const orderResult = await this.executeOrder(approval);

      // 주문 결과를 approval에 저장해서 나중에 대시보드 및 로그에서 확인 가능하게끔
      approval.orderResult = orderResult;
      approval.status = this.resolveStatusAfterOrder({
        approval,
        orderResult,
      });
      approval.decidedAt = new Date();

      return this.approvalRepository.save(approval);
    } catch (error) {
      // 주문 처리 중 예외가 발생해도 approval을 failed 상태로 남김
      approval.orderResult = this.createFailedOrderResult({
        approval,
        error,
      });
      approval.status = StrategyOrderApprovalStatus.FAILED;
      approval.decidedAt = new Date();

      return this.approvalRepository.save(approval);
    }
  }

  private async executeOrder(
    approval: StrategyOrderApprovalEntity,
  ): Promise<TradeOrderResult> {
    if (approval.strategyMode === StrategyMode.PAPER) {
      return this.paperOrderService.execute({
        userId: approval.userId,
        market: approval.market,
        riskCheck: approval.riskCheckResult,
      });
    }

    return this.liveOrderService.execute({
      userId: approval.userId,
      market: approval.market,
      riskCheck: approval.riskCheckResult,
    });
  }

  private resolveStatusAfterOrder(input: {
    approval: StrategyOrderApprovalEntity;
    orderResult: TradeOrderResult;
  }): StrategyOrderApprovalStatus {
    if (input.orderResult.status !== 'created') {
      return StrategyOrderApprovalStatus.FAILED;
    }

    // paper 주문은 내부 잔고 반영까지 끝난 상태이므로 executed로 볼 수 있음
    if (input.approval.strategyMode === StrategyMode.PAPER) {
      return StrategyOrderApprovalStatus.EXECUTED;
    }

    // live 주문은 Upbit에 주문이 접수된 상태라 체결 완료로 보지 않음
    return StrategyOrderApprovalStatus.APPROVED;
  }

  private createFailedOrderResult(input: {
    approval: StrategyOrderApprovalEntity;
    error: unknown;
  }): TradeOrderResult {
    const adjustedOrder = input.approval.adjustedOrder;

    return {
      mode:
        input.approval.strategyMode === StrategyMode.PAPER ? 'paper' : 'live',
      market: input.approval.market,
      decision: input.approval.decision,
      orderType: input.approval.orderType,
      amountKrw: adjustedOrder.estimatedOrderAmountKrw,
      volume: adjustedOrder.estimatedVolume,
      priceKrw: adjustedOrder.priceKrw,
      status: 'failed',
      externalOrderId: null,
      reason:
        input.error instanceof Error
          ? `주문 실행 중 오류가 발생했습니다. ${input.error.message}`
          : '주문 실행 중 알 수 없는 오류가 발생했습니다.',
    };
  }

  async syncLiveOrder(input: {
    userId: number;
    approvalId: number;
  }): Promise<StrategyOrderApprovalEntity> {
    // 현재 사용자의 approval만 조회
    const approval = await this.approvalRepository.findOneBy({
      id: input.approvalId,
      userId: input.userId,
    });

    if (!approval) {
      throw new NotFoundException('주문 후보가 존재하지 않습니다.');
    }

    if (approval.strategyMode !== StrategyMode.LIVE) {
      throw new BadRequestException('live 주문만 상태를 동기화할 수 있습니다.');
    }

    const uuid = approval.orderResult?.externalOrderId;

    if (!uuid) {
      throw new BadRequestException('동기화할 Upbit 주문 uuid가 없습니다.');
    }

    // Upbit에서 실제 주문 상태를 다시 조회
    const upbitOrder = await this.liveOrderService.getOrder({
      userId: approval.userId,
      uuid,
    });

    const previousResult = approval.orderResult;

    approval.orderResult = {
      ...previousResult,
      mode: 'live',
      market: approval.market,
      decision: approval.decision,
      orderType: approval.orderType,
      amountKrw:
        previousResult?.amountKrw ??
        approval.adjustedOrder.estimatedOrderAmountKrw,
      volume: previousResult?.volume ?? approval.adjustedOrder.estimatedVolume,
      priceKrw: previousResult?.priceKrw ?? approval.adjustedOrder.priceKrw,
      status:
        upbitOrder.state === 'cancel'
          ? 'cancelled'
          : (previousResult?.status ?? 'created'),
      externalOrderId: upbitOrder.uuid,
      reason: `Upbit 주문 상태를 동기화했습니다. state=${upbitOrder.state}`,
      liveOrderState: upbitOrder.state,
      executedVolume: upbitOrder.executedVolume,
      remainingVolume: upbitOrder.remainingVolume,
      paidFee: upbitOrder.paidFee,
    };

    // wait: 주문 접수/대기, done: 체결 완료, cancel: 취소됨
    if (upbitOrder.state === 'done') {
      approval.status = StrategyOrderApprovalStatus.EXECUTED;
    } else if (upbitOrder.state === 'cancel') {
      approval.status = StrategyOrderApprovalStatus.CANCELLED;
    } else {
      approval.status = StrategyOrderApprovalStatus.APPROVED;
    }

    return this.approvalRepository.save(approval);
  }

  async cancelOpenLiveOrdersBeforeRun(input: {
    userId: number;
    strategyId: number;
    market: string;
  }): Promise<void> {
    const approvals = await this.approvalRepository.find({
      where: {
        userId: input.userId,
        strategyId: input.strategyId,
        market: input.market,
        strategyMode: StrategyMode.LIVE,
        status: StrategyOrderApprovalStatus.APPROVED,
      },
    });

    for (const approval of approvals) {
      const uuid = approval.orderResult?.externalOrderId;

      if (!uuid) {
        throw new BadRequestException(
          '기존 live 주문 uuid가 없어 다음 전략을 실행할 수 없습니다.',
        );
      }

      // 취소 전에 현재 주문 상태를 먼저 확인
      const currentOrder = await this.liveOrderService.getOrder({
        userId: input.userId,
        uuid,
      });

      if (currentOrder.state === 'done') {
        // 이미 체결된 주문이면 executed로만 정리
        approval.status = StrategyOrderApprovalStatus.EXECUTED;
        approval.orderResult = {
          ...approval.orderResult!,
          liveOrderState: currentOrder.state,
          executedVolume: currentOrder.executedVolume,
          remainingVolume: currentOrder.remainingVolume,
          paidFee: currentOrder.paidFee,
          reason:
            '다음 전략 실행 전에 기존 live 주문 체결 상태를 반영했습니다.',
        };

        await this.approvalRepository.save(approval);
        continue;
      }

      if (currentOrder.state === 'cancel') {
        // 이미 취소된 주문이면 cancelled로 정리
        approval.status = StrategyOrderApprovalStatus.CANCELLED;
        approval.orderResult = {
          ...approval.orderResult!,
          status: 'cancelled',
          liveOrderState: currentOrder.state,
          executedVolume: currentOrder.executedVolume,
          remainingVolume: currentOrder.remainingVolume,
          paidFee: currentOrder.paidFee,
          reason: '기존 live 주문이 이미 취소되어 상태를 반영했습니다.',
        };

        await this.approvalRepository.save(approval);
        continue;
      }

      // 아직 wait 상태면 다음 전략 판단 전에 기존 주문을 취소
      const cancelledOrder = await this.liveOrderService.cancelOrder({
        userId: input.userId,
        uuid,
      });

      approval.status = StrategyOrderApprovalStatus.CANCELLED;
      approval.orderResult = {
        ...approval.orderResult!,
        status: 'cancelled',
        liveOrderState: cancelledOrder.state,
        executedVolume: cancelledOrder.executedVolume,
        remainingVolume: cancelledOrder.remainingVolume,
        paidFee: cancelledOrder.paidFee,
        reason: '다음 전략 실행 전에 미체결 live 주문을 취소했습니다.',
      };

      await this.approvalRepository.save(approval);
    }
  }
}
