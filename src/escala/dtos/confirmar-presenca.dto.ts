import { IsLatitude, IsLongitude, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class ConfirmarPresencaDto {
  @Type(() => Number)
  @IsNotEmpty({ message: 'Informe a latitude' })
  @IsLatitude({ message: 'Latitude inválida' })
  latitude!: number;

  @Type(() => Number)
  @IsNotEmpty({ message: 'Informe a longitude' })
  @IsLongitude({ message: 'Longitude inválida' })
  longitude!: number;
}
