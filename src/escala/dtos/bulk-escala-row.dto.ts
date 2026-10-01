import { IsEnum, IsInt, IsOptional, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { Sistema } from 'src/tetos/entities/teto.entity';

export class BulkEscalaRowDto {
  @IsEnum(Sistema, { message: 'sistema deve ser PJES ou DIARIAS' })
  sistema!: Sistema;

  @Type(() => Number)
  @IsInt({ message: 'operacaoId deve ser um número inteiro' })
  operacaoId!: number;

  @Type(() => Number)
  @IsInt({ message: 'usuarioId deve ser um número inteiro' })
  usuarioId!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dataInicio deve estar no formato AAAA-MM-DD',
  })
  dataInicio!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'horaInicio deve estar no formato HH:mm',
  })
  horaInicio!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'horaFim deve estar no formato HH:mm',
  })
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

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'viaturaId deve ser um número inteiro' })
  viaturaId?: number;
}
