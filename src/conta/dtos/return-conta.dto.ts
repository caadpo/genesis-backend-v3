import { ContaEntity } from '../entities/conta.entity';

export class ReturnContaDto {
  id: number;
  banco: string;
  cod_banco: string;
  agencia: string;
  conta: string;
  dig_conta: string;
  createdAt: Date;
  updatedAt: Date;

  createdByUser?: {
    id: number;
    mat: string;
  };

  updatedByUser?: {
    id: number;
    mat: string;
  };

  constructor(conta: ContaEntity) {
    this.id = conta.id;
    this.banco = conta.banco;
    this.cod_banco = conta.cod_banco;
    this.agencia = conta.agencia;
    this.conta = conta.conta;
    this.dig_conta = conta.dig_conta;
    this.createdAt = conta.createdAt;
    this.updatedAt = conta.updatedAt;

    this.createdByUser = conta.createdByUser
      ? {
          id: conta.createdByUser.id,
          mat: conta.createdByUser.mat,
        }
      : undefined;

    this.updatedByUser = conta.updatedByUser
      ? {
          id: conta.updatedByUser.id,
          mat: conta.updatedByUser.mat,
        }
      : undefined;
  }
}
