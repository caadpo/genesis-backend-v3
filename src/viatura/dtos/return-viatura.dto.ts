import { StatusViatura, ViaturaEntity } from '../entities/viatura.entity';

export class ReturnViaturaDto {
  id: number;
  patrimonio: string;
  kmAtual: number;
  statusVtr: StatusViatura;
  anotacao?: string;
  omeId: number;

  constructor(v: ViaturaEntity) {
    this.id = v.id;
    this.patrimonio = v.patrimonio;
    this.kmAtual = v.kmAtual;
    this.statusVtr = v.statusVtr;
    this.anotacao = v.anotacao;
    this.omeId = v.omeId;
  }
}
