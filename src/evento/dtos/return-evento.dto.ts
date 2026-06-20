import { ReturnUserPublicDto } from 'src/user/dtos/return-user-public.dto';
import { ReturnOmeDto } from 'src/ome/dtos/return-ome.dto';

export class ReturnEventoDto {
  id: number;
  nome_evento: string;
  ne: string;
  dh: string;
  qtd_of_evento: number;
  qtd_prc_evento: number;
  status_evento: string;
  bloqueado: boolean;
  created_at: string;
  updated_at: string;
  homologado_em?: Date;
  ome: ReturnOmeDto;
  user: ReturnUserPublicDto;
  status_teto?: string;

  constructor(evento: any) {
    this.id = evento.id;
    this.nome_evento = evento.nome_evento;
    this.ne = evento.ne;
    this.dh = evento.dh;
    this.qtd_of_evento = evento.qtd_of_evento;
    this.qtd_prc_evento = evento.qtd_prc_evento;
    this.status_evento = evento.status_evento;
    this.bloqueado = evento.bloqueado ?? false;
    this.created_at = evento.created_at;
    this.updated_at = evento.updated_at;
    this.homologado_em = evento.homologado_em ?? undefined;
    this.ome = new ReturnOmeDto(evento.ome);
    this.user = new ReturnUserPublicDto(evento.user);
    this.status_teto = evento.distribuicao?.teto?.status ?? undefined;
  }
}
