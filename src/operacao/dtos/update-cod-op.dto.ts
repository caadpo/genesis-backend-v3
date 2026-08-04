import { IsString, Length, Matches } from 'class-validator';

export class UpdateCodOpDto {
  @IsString()
  @Length(1, 10, { message: 'O código deve ter no máximo 10 dígitos' })
  @Matches(/^\d+$/, { message: 'O código deve conter apenas números' })
  cod_op!: string;
}
