export class ReturnDiretoriaDto {
  id: number;
  nomeDiretoria: string;

  constructor(diretoria: any) {
    this.id = diretoria.id;
    this.nomeDiretoria = diretoria.nomeDiretoria;
  }
}
