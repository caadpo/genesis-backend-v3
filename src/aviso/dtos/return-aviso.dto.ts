export class ReturnAvisoDto {
  id!: number;
  nome!: string;
  descricao!: string | null;
  imagemUrl!: string | null;
  dataHora!: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
