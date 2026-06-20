// src/conta/dtos/update-conta.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateContaDto {
  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @IsString()
  cod_banco?: string;

  @IsOptional()
  @IsString()
  agencia?: string;

  @IsOptional()
  @IsString()
  conta?: string;

  @IsOptional()
  @IsString()
  dig_conta?: string;
}
