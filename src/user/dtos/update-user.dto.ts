import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { UserType } from '../enum/user-type.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  mat?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(UserType)
  typeUser?: UserType;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  omeId?: number;

  @IsOptional()
  @IsString()
  imagemUrl?: string;
}
