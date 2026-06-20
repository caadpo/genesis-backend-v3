export class UserSearchDto {
  id!: number;
  mat!: string;
  phone?: string;
  ativo?: string;
  typeUser!: number;
  imagemUrl?: string;
  //agora vêm do SGP
  pg!: string;
  nomeGuerra!: string;
  tipo!: string;
  cpf!: string;
  nunfunc!: string;
  nunvinc!: string;
  nomeCompleto!: string;
  localApresentacao!: string;
  situacao!: string;

  ome?: {
    id: number;
    nomeOme: string;
  };

  conta?: {
    id: number;
    banco: string;
    cod_banco: string;
    agencia: string;
    conta: string;
    dig_conta: string;
  };
}
