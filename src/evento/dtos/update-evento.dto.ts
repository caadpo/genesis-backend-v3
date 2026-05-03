import { PartialType } from '@nestjs/mapped-types';
import { CreateEventoDto } from './create-evento.dto';
import { StatusEvento } from '../enum/eventos-status.enum';

export class UpdateEventoDto extends PartialType(CreateEventoDto) {
  status_evento?: StatusEvento;
}
