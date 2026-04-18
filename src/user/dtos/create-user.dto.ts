import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { UserType } from '../enum/user-type.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  loginSei: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(UserType)
  typeUser: UserType;

  @IsString()
  @IsNotEmpty()
  pg: string;

  @IsNumber()
  @IsNotEmpty()
  mat: number;

  @IsString()
  @IsNotEmpty()
  nomeGuerra: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsString()
  @IsNotEmpty()
  nunfunc: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNumber()
  @IsNotEmpty()
  omeId: number;

  @IsOptional()
  @IsString()
  imagemUrl?: string;
}
