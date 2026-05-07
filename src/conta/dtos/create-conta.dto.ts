// src/conta/dtos/update-conta.dto.ts
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateContaDto {
  @IsNumber()
  usuarioId!: number;

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
