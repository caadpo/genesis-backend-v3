import { ReturnDiretoriaDto } from 'src/diretoria/dtos/return-diretoria.dto';

export class ReturnOmeDto {
  id: number;
  nomeOme: string;
  efisco: string;
  diretoria?: ReturnDiretoriaDto;

  constructor(ome: any) {
    this.id = ome.id;
    this.nomeOme = ome.nomeOme;
    this.efisco = ome.efisco;
    this.diretoria = ome.diretoria
      ? new ReturnDiretoriaDto(ome.diretoria)
      : undefined;
  }
}
