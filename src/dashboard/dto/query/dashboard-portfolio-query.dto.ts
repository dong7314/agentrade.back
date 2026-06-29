import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DashboardPortfolioMode } from '../../enums/dashboard-portfolio-mode.enum';

export class DashboardPortfolioQueryDto {
  @IsEnum(DashboardPortfolioMode)
  mode!: DashboardPortfolioMode;

  @IsOptional()
  @IsString()
  market?: string;
}
