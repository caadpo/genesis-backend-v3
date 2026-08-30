import { RepasseEntity, StatusRepasse } from '../entities/repasse.entity';

export class ReturnRepasseDto {
  id: number;
  escalaId: number;
  ofertanteId: number;
  receptorId: number | null;
  destinatarioId: number | null; // ✅ NOVO
  statusRepasse: StatusRepasse;
  sistemaRepasse: string;
  tipoEscalaRepasse: string;
  dataInicioRepasse: string;
  horaInicioRepasse: string;
  horaFimRepasse: string;
  matOfertante: string;
  matDestinatario: string | null; // ✅ NOVO
  motivo: string | null;
  createdAt: Date;
  updatedAt: Date;

  nome_evento: string;
  nome_ome: string;
  nome_operacao: string;
  funcao: string;
  localApresentacao: string;
  anotacoes: string | null;
  ofertante_img: string;
  ofertante_pg: string;
  ofertante_nome_guerra: string;
  ofertante_situacao: string;
  receptor_mat: string;
  receptor_img: string;
  receptor_pg: string | null;
  receptor_nome_guerra: string | null;
  receptor_situacao: string | null;

  constructor(
    r: RepasseEntity,
    sgpOfertante?:
      | { pgSgp: string; nomeGuerraSgp: string; situacaoSgp: string }
      | null
      | undefined,
    sgpReceptor?:
      | { pgSgp: string; nomeGuerraSgp: string; situacaoSgp: string }
      | null
      | undefined,
  ) {
    this.id = r.id;
    this.escalaId = r.escala?.id;
    this.ofertanteId = r.ofertante?.id;
    this.receptorId = r.receptor?.id ?? null;
    this.destinatarioId = r.destinatario?.id ?? null; // ✅ NOVO
    this.statusRepasse = r.statusRepasse;
    this.sistemaRepasse = r.sistemaRepasse;
    this.tipoEscalaRepasse = r.tipoEscalaRepasse;
    this.dataInicioRepasse = r.dataInicioRepasse;
    this.horaInicioRepasse = r.horaInicioRepasse;
    this.horaFimRepasse = r.horaFimRepasse;
    this.matOfertante = r.matOfertante;
    this.matDestinatario = r.matDestinatario ?? null; // ✅ NOVO
    this.motivo = r.motivo;
    this.createdAt = r.createdAt;
    this.updatedAt = r.updatedAt;

    this.nome_evento = r.escala?.operacao?.evento?.nome_evento || '';
    this.nome_ome = r.escala?.operacao?.evento?.ome?.nomeOme || '';
    this.nome_operacao = r.escala?.operacao?.nome_operacao || '';
    this.funcao = r.escala?.funcao || '';
    this.localApresentacao = r.escala?.localApresentacao || '';
    this.anotacoes = r.escala?.anotacoes || null;
    this.ofertante_img = r.ofertante?.imagemUrl || '';
    this.ofertante_pg = sgpOfertante?.pgSgp || '';
    this.ofertante_nome_guerra = sgpOfertante?.nomeGuerraSgp || '';
    this.ofertante_situacao = sgpOfertante?.situacaoSgp || '';
    this.receptor_img = r.receptor?.imagemUrl || '';
    this.receptor_mat = r.receptor?.mat || '';
    this.receptor_pg = sgpReceptor?.pgSgp || null;
    this.receptor_nome_guerra = sgpReceptor?.nomeGuerraSgp || null;
    this.receptor_situacao = sgpReceptor?.situacaoSgp || null;
  }
}
