import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { UserType } from '../enum/user-type.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  loginSei?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(UserType)
  typeUser?: UserType;

  @IsOptional()
  @IsString()
  pg?: string;

  @IsOptional()
  @IsNumber()
  mat?: number;

  @IsOptional()
  @IsString()
  nomeGuerra?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  funcao?: string;

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
