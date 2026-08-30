import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateRepasseDto {
  @IsInt()
  escalaId!: number;

  @IsOptional()
  @IsString()
  motivo?: string;

  // ✅ NOVO — mat do usuário escolhido. Se vazio/ausente, repasse é comum.
  @IsOptional()
  @IsString()
  matDestinatario?: string;
}

export class AceitarRepasseDto {}
