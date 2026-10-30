import { ArrayUnique, IsArray, IsInt } from 'class-validator';

export class SetCompartilhamentoDto {
  /** Lista COMPLETA de OMEs com quem a operação é compartilhada ([] remove tudo). */
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  omeIds!: number[];
}
