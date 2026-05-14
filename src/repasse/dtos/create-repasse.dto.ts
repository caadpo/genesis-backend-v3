// ─── create-repasse.dto.ts ────────────────────────────────────────────────────
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateRepasseDto {
  @IsInt()
  escalaId!: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}

// ─── aceitar-repasse.dto.ts ───────────────────────────────────────────────────
// (arquivo separado em produção — agrupado aqui por praticidade)
export class AceitarRepasseDto {
  // Sem campos obrigatórios: o receptor é o usuário logado
  // Mantido como DTO vazio para extensão futura (ex: comentário do receptor)
}
