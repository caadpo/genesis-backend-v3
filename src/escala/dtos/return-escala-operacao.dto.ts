import { ReturnEscalaDto } from './return-escala.dto';

export class ReturnEscalaOperacaoDto {
  escalas: ReturnEscalaDto[];
  totalCotasOficiais: number;
  totalCotasPracas: number;

  constructor(escalas: ReturnEscalaDto[]) {
    this.escalas = escalas;
    this.totalCotasOficiais = escalas
      .filter((e) => e.tipo_escala === 'O')
      .reduce((sum, e) => sum + e.cota_escala, 0);
    this.totalCotasPracas = escalas
      .filter((e) => e.tipo_escala === 'P')
      .reduce((sum, e) => sum + e.cota_escala, 0);
  }
}
