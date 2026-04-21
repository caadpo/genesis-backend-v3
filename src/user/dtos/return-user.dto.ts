import { ReturnOmeDto } from 'src/ome/dtos/return-ome.dto';
import { UserType } from '../enum/user-type.enum';
import { ReturnContaDto } from 'src/conta/dtos/return-conta.dto';

export class ReturnUserDto {
  id: number;
  imagemUrl?: string;
  loginSei: string;
  phone: string;
  omeId: number;
  pg: string;
  mat: number;
  nomeGuerra: string;
  tipo: string;
  cpf: string;
  nunfunc: string;
  nunvinc: string;
  typeUser: UserType;
  ome?: ReturnOmeDto;
  conta?: ReturnContaDto;

  constructor(userEntity: any) {
    this.id = userEntity.id;
    this.imagemUrl = userEntity.imagemUrl;
    this.loginSei = userEntity.loginSei;
    this.phone = userEntity.phone;
    this.omeId = userEntity.omeId;
    this.pg = userEntity.pg;
    this.mat = userEntity.mat;
    this.nomeGuerra = userEntity.nomeGuerra;
    this.tipo = userEntity.tipo;
    this.cpf = userEntity.cpf;
    this.nunfunc = userEntity.nunfunc;
    this.nunvinc = userEntity.nunvinc;
    this.typeUser = userEntity.typeUser;

    this.ome = userEntity.ome ? new ReturnOmeDto(userEntity.ome) : undefined;
    this.conta = userEntity.conta
      ? new ReturnContaDto(userEntity.conta)
      : undefined;
  }
}
