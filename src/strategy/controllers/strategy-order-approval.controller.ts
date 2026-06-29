import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '@/auth/decorators/current-user.decorator';

import { StrategyOrderApprovalService } from '../services/strategy-order-approval.service';

import {
  ApiSyncLiveOrderApproval,
  ApiGetStrategyOrderApprovals,
  ApiRejectStrategyOrderApproval,
  ApiApproveStrategyOrderApproval,
} from '../docs/strategy-order-approval-api.docs';

import { PaginatedResult } from '@/common/types/paginated.type';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { RejectStrategyOrderApprovalDto } from '../dto/reject-strategy-order-approval.dto';
import { StrategyOrderApprovalResponseDto } from '../dto/strategy-order-approval-response.dto';
import { FindStrategyOrderApprovalQueryDto } from '../dto/find-strategy-order-approval.query.dto';

@ApiTags('Strategy Order Approvals')
@Controller('strategy-order-approvals')
export class StrategyOrderApprovalController {
  constructor(private readonly approvalService: StrategyOrderApprovalService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiGetStrategyOrderApprovals()
  async getStrategyOrderApprovals(
    @Query() query: FindStrategyOrderApprovalQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResult<StrategyOrderApprovalResponseDto>> {
    const result = await this.approvalService.findAllByUserId(user.id, query);

    return {
      items: StrategyOrderApprovalResponseDto.fromEntities(result.items),
      meta: result.meta,
    };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiApproveStrategyOrderApproval()
  async approveApproval(
    @Param('id', ParseIntPipe) approvalId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StrategyOrderApprovalResponseDto> {
    const result = await this.approvalService.approve({
      userId: user.id,
      approvalId,
    });

    return StrategyOrderApprovalResponseDto.fromEntity(result);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiRejectStrategyOrderApproval()
  async rejectApproval(
    @Body() dto: RejectStrategyOrderApprovalDto | undefined,
    @Param('id', ParseIntPipe) approvalId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StrategyOrderApprovalResponseDto> {
    const result = await this.approvalService.reject({
      userId: user.id,
      approvalId,
      reason: dto?.reason,
    });

    return StrategyOrderApprovalResponseDto.fromEntity(result);
  }

  @Post(':id/sync-live-order')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiSyncLiveOrderApproval()
  async syncLiveOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StrategyOrderApprovalResponseDto> {
    const approval = await this.approvalService.syncLiveOrder({
      userId: user.id,
      approvalId: id,
    });

    return StrategyOrderApprovalResponseDto.fromEntity(approval);
  }
}
