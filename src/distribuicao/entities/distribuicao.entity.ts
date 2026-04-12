// src/distribuicao/entities/distribuicao.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Teto } from 'src/tetos/entities/teto.entity';
import { DiretoriaEntity } from 'src/diretoria/entities/diretoria.entity';

@Entity('distribuicao')
export class Distribuicao {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Teto, { nullable: false })
  @JoinColumn({ name: 'teto_id' })
  teto: Teto;

  @ManyToOne(() => DiretoriaEntity, { nullable: false })
  @JoinColumn({ name: 'diretoria_id' })
  diretoria: DiretoriaEntity;

  @Column({ type: 'int' })
  qtd_dist_of: number;

  @Column({ type: 'int' })
  qtd_dist_prc: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
