import { ReturnOmeDto } from 'src/ome/dtos/return-ome.dto';

export class ReturnUserPublicDto {
  id: number;
  pg: string;
  nomeGuerra: string;
  ome?: ReturnOmeDto;

  constructor(user: any) {
    this.id = user.id;
    this.pg = user.pg ?? ''; // ✅ já funciona se vier do objeto combinado
    this.nomeGuerra = user.nomeGuerra ?? '';
    this.ome = user.ome ? new ReturnOmeDto(user.ome) : undefined;
  }
}
