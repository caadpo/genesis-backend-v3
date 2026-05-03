import { Distribuicao } from 'src/distribuicao/entities/distribuicao.entity';
import { OmeEntity } from 'src/ome/entities/ome.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StatusEvento } from '../enum/eventos-status.enum';

@Entity('evento')
export class Evento {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Distribuicao, { nullable: false })
  @JoinColumn({ name: 'distribuicao_id' })
  distribuicao!: Distribuicao;

  @ManyToOne(() => OmeEntity, { nullable: false })
  @JoinColumn({ name: 'ome_id' })
  ome!: OmeEntity;

  @Column({ type: 'varchar', length: 100 })
  nome_evento!: string;

  @Column({ type: 'int' })
  qtd_of_evento!: number;

  @Column({ type: 'int' })
  qtd_prc_evento!: number;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'user_id_evento' })
  user!: UserEntity;

  @Column({
    type: 'enum',
    enum: StatusEvento,
    default: StatusEvento.CRIADO,
  })
  status_evento!: StatusEvento;

  @Column({ nullable: true })
  homologado_em?: Date;

  @Column({ nullable: true })
  pd_concluida_em?: Date;

  @Column({ nullable: true })
  pago_em?: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
