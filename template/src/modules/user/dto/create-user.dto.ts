import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'USER_20250815001' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Kyaw Soe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'kyawsoe@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword@123' })
  @IsString()
  password: string;
}
