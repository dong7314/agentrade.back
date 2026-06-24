import {
  Get,
  Body,
  Post,
  Param,
  Query,
  Patch,
  Delete,
  HttpCode,
  UseGuards,
  Controller,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { CurrentUser } from '@/auth/decorators/current-user.decorator';

import { StrategyService } from '../services/strategy.service';
import { StrategyRunService } from '../services/strategy-run.service';

import {
  ApiRunStrategy,
  ApiGetStrategy,
  ApiGetStrategies,
  ApiParseStrategy,
  ApiCreateStrategy,
  ApiUpdateStrategy,
  ApiDeleteStrategy,
  ApiUpdateStrategyStatus,
} from '../docs/strategy-api.docs';

import { PaginatedResult } from '@/common/types/paginated.type';
import { CreateStrategyDto } from '../dto/create-strategy.dto';
import { UpdateStrategyDto } from '../dto/update-strategy.dto';
import { StrategyResponseDto } from '../dto/strategy-response.dto';
import { FindStrategiesQueryDto } from '../dto/find-strategy.query.dto';
import { StrategyRunResponseDto } from '../dto/strategy-run-response.dto';
import { UpdateStrategyStatusDto } from '../dto/update-strategy-status.dto';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';

@ApiTags('Strategies')
@Controller('strategies')
export class StrategyController {
  constructor(
    private readonly strategyService: StrategyService,
    private readonly strategyRunService: StrategyRunService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiGetStrategies()
  async getStrategies(
    @Query() query: FindStrategiesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResult<StrategyResponseDto>> {
    const result = await this.strategyService.findAllByUser(user.id, query);

    return {
      items: StrategyResponseDto.fromEntities(result.items),
      meta: result.meta,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiGetStrategy()
  async getDetailStrategy(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StrategyResponseDto> {
    const strategy = await this.strategyService.findOneByUser(id, user.id);

    return StrategyResponseDto.fromEntity(strategy);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCreateStrategy()
  async create(
    @Body() dto: CreateStrategyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StrategyResponseDto> {
    const strategy = await this.strategyService.create({
      userId: user.id,
      ...dto,
    });

    return StrategyResponseDto.fromEntity(strategy);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiUpdateStrategy()
  async update(
    @Body() dto: UpdateStrategyDto,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StrategyResponseDto> {
    const strategy = await this.strategyService.update({
      userId: user.id,
      strategyId: id,
      ...dto,
    });

    return StrategyResponseDto.fromEntity(strategy);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiDeleteStrategy()
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.strategyService.remove({
      userId: user.id,
      strategyId: id,
    });
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiUpdateStrategyStatus()
  async updateStatus(
    @Body() dto: UpdateStrategyStatusDto,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StrategyResponseDto> {
    const strategy = await this.strategyService.updateStatus({
      userId: user.id,
      strategyId: id,
      ...dto,
    });

    return StrategyResponseDto.fromEntity(strategy);
  }

  @Post(':id/parse')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiParseStrategy()
  async parse(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StrategyResponseDto> {
    const strategy = await this.strategyService.parse({
      userId: user.id,
      strategyId: id,
    });

    return StrategyResponseDto.fromEntity(strategy);
  }

  @Post(':id/run')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiRunStrategy()
  async runStrategy(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StrategyRunResponseDto> {
    const strategyRun = await this.strategyRunService.runByStrategy({
      userId: user.id,
      strategyId: id,
    });

    return StrategyRunResponseDto.fromEntity(strategyRun);
  }
}
