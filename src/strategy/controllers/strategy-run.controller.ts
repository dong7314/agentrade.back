import {
  Get,
  Param,
  UseGuards,
  Controller,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { StrategyRunService } from '../services/strategy-run.service';

import { StrategyRunResponseDto } from '../dto/strategy-run-response.dto';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { FindStrategyRunsQueryDto } from '../dto/find-strategy-run.query.dto';
import { PaginatedResult } from '@/common/types/paginated.type';
import {
  ApiGetStrategyRun,
  ApiGetStrategyRuns,
} from '../docs/strategy-run-api.docs';

@ApiTags('Strategy Runs')
@Controller('strategy-runs')
export class StrategyRunController {
  constructor(private readonly strategyRunService: StrategyRunService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiGetStrategyRuns()
  async getStrategyRuns(
    @Query() query: FindStrategyRunsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResult<StrategyRunResponseDto>> {
    const result = await this.strategyRunService.findAllByUserId(
      user.id,
      query,
    );

    return {
      items: StrategyRunResponseDto.fromEntities(result.items),
      meta: result.meta,
    };
  }

  @Get(':runId')
  @UseGuards(JwtAuthGuard)
  @ApiGetStrategyRun()
  async getDetailStrategyRun(
    @Param('runId', ParseIntPipe) runId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StrategyRunResponseDto> {
    const strategyRun = await this.strategyRunService.findOneByStrategyRunId(
      runId,
      user.id,
    );

    return StrategyRunResponseDto.fromEntity(strategyRun);
  }
}
