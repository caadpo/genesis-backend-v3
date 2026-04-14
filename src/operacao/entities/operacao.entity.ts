import { OmeEntity } from 'src/ome/entities/ome.entity';
import { Evento } from 'src/evento/entities/evento.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('operacao')
@Index(['cod_op'], { unique: true })
export class Operacao {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Evento, { nullable: false })
  @JoinColumn({ name: 'evento_id' })
  evento: Evento;

  @ManyToOne(() => OmeEntity, { nullable: false })
  @JoinColumn({ name: 'ome_id' })
  ome: OmeEntity;

  @Column({ type: 'varchar', length: 120 })
  nome_operacao: string;

  @Column({ type: 'varchar', length: 30 })
  cod_verba: string;

  @Column({ type: 'int' })
  qtd_oficiais_oper: number;

  @Column({ type: 'int' })
  qtd_pracas_oper: number;

  @Column({ type: 'varchar', length: 50 })
  cod_op: string;

  @Column({ type: 'int' })
  user_id: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
