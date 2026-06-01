import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsStrongPassword } from 'class-validator';

export class LocalRegisterDto {
  @ApiProperty({
    example: 'kim.investor@example.com',
    description: '로그인에 사용할 이메일',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'password1!',
    description: '8자 이상, 숫자, 특수문자를 포함한 비밀번호',
  })
  @IsStrongPassword({
    minLength: 8,
    minSymbols: 1,
    minUppercase: 0,
  })
  password!: string;

  @ApiProperty({
    example: '김투자',
    description: '서비스에 표시될 사용자 이름',
  })
  @IsString()
  name!: string;
}
