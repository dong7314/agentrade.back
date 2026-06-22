import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpsertUpbitCredentialDto {
  @ApiProperty({
    example: 'upbit-access-key',
    description: '업비트 access key입니다.',
  })
  @IsString()
  @MinLength(10)
  accessKey!: string;

  @ApiProperty({
    example: 'upbit-secret-key',
    description:
      '업비트 secret key입니다. 저장 시 암호화되며 응답으로 반환하지 않습니다.',
  })
  @IsString()
  @MinLength(10)
  secretKey!: string;
}
