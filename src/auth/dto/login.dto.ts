import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LocalLoginDto {
  @IsEmail()
  @ApiProperty({
    example: 'kim.investor@example.com',
    description: '로그인 할 이메일',
  })
  email!: string;

  @IsString()
  @ApiProperty({
    example: 'password1!',
    description: '8자 이상, 숫자, 특수문자를 포함한 비밀번호',
  })
  password!: string;
}
