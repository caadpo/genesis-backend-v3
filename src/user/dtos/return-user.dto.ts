import { ReturnOmeDto } from 'src/ome/dtos/return-ome.dto';
import { UserType } from '../enum/user-type.enum';
import { ReturnContaDto } from 'src/conta/dtos/return-conta.dto';

export class ReturnUserDto {
  id: number;
  imagemUrl?: string;
  mat: string;
  phone: string;
  omeId: number;
  pg: string;
  nomeGuerra: string;
  tipo: string;
  cpf: string;
  nunfunc: string;
  nunvinc: string;
  situacao: string;
  typeUser: UserType;
  ativo: boolean;
  ome?: ReturnOmeDto;
  conta?: ReturnContaDto;

  constructor(userEntity: any) {
    this.id = userEntity.id;
    this.imagemUrl = userEntity.imagemUrl;
    this.mat = userEntity.mat;
    this.phone = userEntity.phone;
    this.omeId = userEntity.omeId;
    this.pg = userEntity.pg;
    this.nomeGuerra = userEntity.nomeGuerra;
    this.tipo = userEntity.tipo;
    this.cpf = userEntity.cpf;
    this.nunfunc = userEntity.nunfunc;
    this.nunvinc = userEntity.nunvinc;
    this.situacao = userEntity.situacao;
    this.typeUser = userEntity.typeUser;
    this.ativo = userEntity.ativo ?? false;
    this.ome = userEntity.ome ? new ReturnOmeDto(userEntity.ome) : undefined;
    this.conta = userEntity.conta
      ? new ReturnContaDto(userEntity.conta)
      : undefined;
  }
}
