import { Distribuicao } from 'src/distribuicao/entities/distribuicao.entity';
import { OmeEntity } from 'src/ome/entities/ome.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('evento')
export class Evento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Distribuicao, { nullable: false })
  @JoinColumn({ name: 'distribuicao_id' })
  distribuicao: Distribuicao;

  @ManyToOne(() => OmeEntity, { nullable: false })
  @JoinColumn({ name: 'ome_id' })
  ome: OmeEntity;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ type: 'int' })
  qtd_oficiais: number;

  @Column({ type: 'int' })
  qtd_pracas: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  valor_total: number;

  @Column({ type: 'varchar', length: 20, default: 'CRIADO' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
