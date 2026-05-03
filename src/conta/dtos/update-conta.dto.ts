// src/conta/dtos/update-conta.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateContaDto {
  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @IsString()
  agencia?: string;

  @IsOptional()
  @IsString()
  conta?: string;
}
