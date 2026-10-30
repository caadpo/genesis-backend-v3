import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { Sistema } from 'src/tetos/entities/teto.entity';

/** Criada pela OME DONA. Não tem usuário: a OME destino preenche depois. */
export class CreateVagaDto {
  @IsEnum(Sistema)
  sistema!: Sistema;

  @IsInt()
  operacaoId!: number;

  /** OME que poderá preencher (precisa estar no compartilhamento da operação). */
  @IsInt()
  omeDestinoId!: number;

  /** O = Oficial, P = Praça. Define de qual cota a vaga consome. */
  @IsIn(['O', 'P'])
  tipoEscala!: 'O' | 'P';

  @IsDateString()
  dataInicio!: string;

  @IsString()
  horaInicio!: string;

  @IsString()
  horaFim!: string;

  @IsString()
  funcao!: string;

  @IsOptional()
  @IsString()
  localApresentacao?: string;

  @IsOptional()
  @IsString()
  situacao?: string;

  @IsOptional()
  @IsString()
  anotacoes?: string;
}

export class PreencherVagaDto {
  @IsInt()
  usuarioId!: number;

  @IsOptional()
  @IsInt()
  viaturaId?: number;
}

export class SubstituirUsuarioDto {
  @IsInt()
  usuarioId!: number;
}
