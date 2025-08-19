import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'USER_20250815001' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Asdfasdf@123' })
  @IsString()
  password: string;
}
