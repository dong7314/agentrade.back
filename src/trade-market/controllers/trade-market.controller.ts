import {
  Get,
  Body,
  Post,
  Param,
  Patch,
  Query,
  Delete,
  HttpCode,
  UseGuards,
  Controller,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AdminGuard } from '@/auth/guards/admin.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { TradeMarketService } from '../services/trade-market.service';
import { CreateTradeMarketDto } from '../dto/create-trade-market.dto';
import { UpdateTradeMarketDto } from '../dto/update-trade-market.dto';
import { TradeMarketResponseDto } from '../dto/trade-market-response.dto';
import { FindTradeMarketQueryDto } from '../dto/find-trade-market-query.dto';
import {
  ApiGetTradeMarkets,
  ApiCreateTradeMarket,
  ApiUpdateTradeMarket,
  ApiDisableTradeMarket,
  ApiGetAdminTradeMarkets,
} from '../docs/trade-market-api.docs';

@ApiTags('Trade Markets')
@Controller('trade-markets')
export class TradeMarketController {
  constructor(private readonly tradeMarketService: TradeMarketService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiGetTradeMarkets()
  async findAll(
    @Query() query: FindTradeMarketQueryDto,
  ): Promise<TradeMarketResponseDto[]> {
    // 일반 사용자는 enabled=true로 조회해서 전략 생성 화면에서 사용
    const markets = await this.tradeMarketService.findAll({
      ...query,
      enabled: 'true',
    });

    return TradeMarketResponseDto.fromEntities(markets);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiGetAdminTradeMarkets()
  async findAllForAdmin(
    @Query() query: FindTradeMarketQueryDto,
  ): Promise<TradeMarketResponseDto[]> {
    // 관리자는 비활성 마켓까지 확인할 수 있도록 enabled query를 그대로 사용
    const markets = await this.tradeMarketService.findAll({
      ...query,
    });

    return TradeMarketResponseDto.fromEntities(markets);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiCreateTradeMarket()
  async create(
    @Body() dto: CreateTradeMarketDto,
  ): Promise<TradeMarketResponseDto> {
    const market = await this.tradeMarketService.create(dto);

    return TradeMarketResponseDto.fromEntity(market);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiUpdateTradeMarket()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTradeMarketDto,
  ): Promise<TradeMarketResponseDto> {
    const market = await this.tradeMarketService.update(id, dto);

    return TradeMarketResponseDto.fromEntity(market);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiDisableTradeMarket()
  async disable(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.tradeMarketService.disable(id);
  }
}
