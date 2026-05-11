import { IsInt, IsNumber, IsString } from 'class-validator';

export class CreatePagamentoDto {
  @IsInt()
  eventoId!: number;
}
