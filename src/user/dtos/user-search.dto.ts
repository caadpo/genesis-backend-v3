export class UserSearchDto {
  id: number;
  pg: string;
  nomeGuerra: string;
  tipo: string;
  imagemUrl?: string;
  mat: number;
  loginSei: string;
  phone?: string;
  typeUser: number;
  cpf: string;
  nunfunc: string;
  nunvinc: string;
  situacaoSgp: string;

  ome?: {
    id: number;
    nomeOme: string;
  };
}
