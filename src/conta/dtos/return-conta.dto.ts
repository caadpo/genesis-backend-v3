import { ContaEntity } from '../entities/conta.entity';

export class ReturnContaDto {
  id: number;
  banco: string;
  agencia: string;
  conta: string;
  createdAt: Date;
  updatedAt: Date;

  createdByUser?: {
    id: number;
    loginSei: string;
  };

  updatedByUser?: {
    id: number;
    loginSei: string;
  };

  constructor(conta: ContaEntity) {
    this.id = conta.id;
    this.banco = conta.banco;
    this.agencia = conta.agencia;
    this.conta = conta.conta;
    this.createdAt = conta.createdAt;
    this.updatedAt = conta.updatedAt;

    this.createdByUser = conta.createdByUser
      ? {
          id: conta.createdByUser.id,
          loginSei: conta.createdByUser.loginSei,
        }
      : undefined;

    this.updatedByUser = conta.updatedByUser
      ? {
          id: conta.updatedByUser.id,
          loginSei: conta.updatedByUser.loginSei,
        }
      : undefined;
  }
}
