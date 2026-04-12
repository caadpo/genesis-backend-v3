import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Sistema {
  PJES = 'PJES',
  DIARIAS = 'DIARIAS',
}

export enum TipoPeriodo {
  MENSAL = 'MENSAL',
  OPERACAO = 'OPERACAO',
}

@Entity('tetos')
export class Teto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'imagem_url', nullable: true })
  imagemUrl: string;

  @Column({ type: 'enum', enum: Sistema })
  sistema: Sistema;

  @Column({ type: 'varchar', length: 100 })
  nome_verba: string;

  @Column({ type: 'varchar', length: 50 })
  cod_verba: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  valor_total: number;

  @Column({ type: 'int' })
  ttctof: number;

  @Column({ type: 'int' })
  ttctprc: number;

  @Column({ type: 'date' })
  data_inicio: string;

  @Column({ type: 'date', nullable: true })
  data_fim?: string;

  @Column({ type: 'enum', enum: TipoPeriodo })
  tipo_periodo: TipoPeriodo;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
