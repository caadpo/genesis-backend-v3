import { ReturnUserPublicDto } from 'src/user/dtos/return-user-public.dto';
import { ReturnOmeDto } from 'src/ome/dtos/return-ome.dto';

export class ReturnEventoDto {
  id: number;
  nome_evento: string;
  qtd_of_evento: number;
  qtd_prc_evento: number;
  status_evento: string;

  created_at: string;
  updated_at: string;

  ome: ReturnOmeDto;
  user: ReturnUserPublicDto;

  constructor(evento: any) {
    this.id = evento.id;
    this.nome_evento = evento.nome_evento;
    this.qtd_of_evento = evento.qtd_of_evento;
    this.qtd_prc_evento = evento.qtd_prc_evento;
    this.status_evento = evento.status_evento;

    this.created_at = evento.created_at;
    this.updated_at = evento.updated_at;

    this.ome = new ReturnOmeDto(evento.ome);
    this.user = new ReturnUserPublicDto(evento.user);
  }
}
