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

  @Column({ type: 'varchar', length: 100 })
  ne!: string;

  @Column({ type: 'varchar', length: 100 })
  dh!: string;

  @Column({ type: 'boolean', default: false })
  bloqueado!: boolean;

  @Column({ type: 'int' })
  qtd_of_evento!: number;

  @Column({ type: 'int' })
  qtd_prc_evento!: number;

  // Usuário que criou o evento
  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'user_id_evento' })
  user!: UserEntity;

  @Column({
    type: 'enum',
    enum: StatusEvento,
    default: StatusEvento.CRIADO,
  })
  status_evento!: StatusEvento;

  // ─── Timestamps e responsáveis por fase ──────────────────────────────────────

  @Column({ type: 'timestamp', nullable: true })
  homologado_em?: Date | null;

  @ManyToOne(() => UserEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'homologado_por_id' })
  homologado_por?: UserEntity | null;

  @Column({ type: 'timestamp', nullable: true })
  pd_concluida_em?: Date;

  @ManyToOne(() => UserEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'pd_concluida_por_id' })
  pd_concluida_por?: UserEntity;

  @Column({ type: 'timestamp', nullable: true })
  pago_em?: Date;

  @ManyToOne(() => UserEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'pago_por_id' })
  pago_por?: UserEntity;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
