// returnDiretoria.dto.ts
import { ReturnOmeDto } from 'src/ome/dtos/return-ome.dto';
import { DiretoriaEntity } from '../entities/diretoria.entity';

export class ReturnDiretoriaDto {
  id: number;
  nomeDiretoria: string;
  dpoId: number;
  omes?: ReturnOmeDto[];

  constructor(diretoria: DiretoriaEntity) {
    this.id = diretoria.id;
    this.nomeDiretoria = diretoria.nomeDiretoria;

    if (diretoria.omes) {
      this.omes = diretoria.omes.map((ome) => new ReturnOmeDto(ome));
    }
  }
}
