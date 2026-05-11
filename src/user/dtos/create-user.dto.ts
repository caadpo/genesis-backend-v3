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
  mat!: string;

  @IsEnum(UserType)
  typeUser!: UserType;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNumber()
  @IsNotEmpty()
  omeId!: number;

  @IsOptional()
  @IsString()
  imagemUrl?: string;
}
