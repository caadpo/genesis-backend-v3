import { EscalaEntity } from '../entities/escala.entity';

/** DTO enxuto: só o necessário para listar "quem está comigo no serviço". */
export class ReturnColegaDto {
  id: number;
  pg_escala: string | null;
  mat_escala: string | null;
  ng_escala: string | null;
  tipo_escala: string;
  funcao: string;
  viaturaId: number | null;
  phone: string | null;

  constructor(e: EscalaEntity) {
    this.id = e.id;
    this.pg_escala = e.pg_escala ?? null;
    this.mat_escala = e.mat_escala ?? null;
    this.ng_escala = e.ng_escala ?? null;
    this.tipo_escala = e.tipo_escala;
    this.funcao = e.funcao;
    this.viaturaId = e.viaturaId ?? null;
    this.phone = e.usuario?.phone ?? null;
  }
}
