export class ReturnOmeDto {
  id: number;
  nomeOme: string;
  diretoriaId: number;

  constructor(ome: any) {
    this.id = ome.id;
    this.nomeOme = ome.nomeOme;
    this.diretoriaId = ome.diretoriaId;
  }
}
