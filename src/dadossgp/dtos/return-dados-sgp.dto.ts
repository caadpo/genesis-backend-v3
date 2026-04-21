export class ReturnDadosSgpDto {
  matSgp: number;
  pgSgp: string;
  nomeGuerraSgp: string;
  nomeCompletoSgp: string;
  omeSgp: string;
  tipoSgp: string;
  nunfuncSgp: number;
  nunvincSgp: number;
  localApresentacaoSgp: string;
  situacaoSgp: string;
  mesSgp: number;
  anoSgp: number;

  constructor(entity: Partial<ReturnDadosSgpDto>) {
    Object.assign(this, entity);
  }
}
