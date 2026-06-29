import { Injectable } from '@nestjs/common';

import { UpbitPublicService } from '@/upbit/services/upbit.public.service';

import { toUpbitMinuteUnit } from '@/upbit/types/public/upbit-minute-unit.type';

import { DashboardChartQueryDto } from '../dto/query/dashboard-chart-query.dto';
import { DashboardChartResponseDto } from '../dto/response/dashboard-chart-response.dto';

@Injectable()
export class DashboardChartService {
  constructor(private readonly upbitPublicService: UpbitPublicService) {}

  async getChart(
    query: DashboardChartQueryDto,
  ): Promise<DashboardChartResponseDto> {
    // dashboard query timeframe을 upbit 분봉 unit으로 전환
    const unit = toUpbitMinuteUnit(query.timeframe);

    // upbit에서 최신 캔들 데이터 조회
    const candles = await this.upbitPublicService.getMinuteCandles({
      market: query.market,
      unit,
      count: query.count ?? 50,
    });

    // 차트 ui는 오래된 캔들에서 최신 캔들 순으로 볼 수 있도록 설정
    const sortedCandles = [...candles].sort(
      (a, b) => a.openedAt.getTime() - b.openedAt.getTime(),
    );

    return DashboardChartResponseDto.fromCandles({
      market: query.market,
      timeframe: query.timeframe,
      candles: sortedCandles,
    });
  }
}
