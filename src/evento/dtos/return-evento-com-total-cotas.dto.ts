import { ReturnEventoDto } from './return-evento.dto';

export class TotalCotasPorTipo {
  tipo_escala: string;
  totalCotas: number;
}

export class ReturnEventoComTotalCotasDto extends ReturnEventoDto {
  totalCotasOficiais?: number;
  totalCotasPracas?: number;
  cotasPorTipo?: TotalCotasPorTipo[];

  constructor(evento: any, cotasPorTipo?: TotalCotasPorTipo[]) {
    super(evento);
    this.cotasPorTipo = cotasPorTipo || [];

    // Calcula totais para oficiais e praças
    this.totalCotasOficiais =
      cotasPorTipo?.find((c) => c.tipo_escala === 'O')?.totalCotas ?? 0;
    this.totalCotasPracas =
      cotasPorTipo?.find((c) => c.tipo_escala === 'P')?.totalCotas ?? 0;
  }
}
