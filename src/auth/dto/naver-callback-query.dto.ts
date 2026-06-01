import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class NaverCallbackQueryDto {
  @ApiProperty({
    description: 'Naver OAuth authorization code',
    example: 'abc123',
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: 'CSRF 방지를 위한 OAuth state',
    example: 'random-state',
  })
  @IsString()
  state!: string;
}
