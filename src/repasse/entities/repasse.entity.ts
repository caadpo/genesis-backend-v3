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
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import { UserEntity } from 'src/user/entities/user.entity';

export enum StatusRepasse {
  ABERTO = 'ABERTO',
  ACEITO = 'ACEITO',
  CANCELADO = 'CANCELADO',
}

@Index(['escala', 'statusRepasse'], { unique: false })
@Entity('repasse')
export class RepasseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => EscalaEntity, { nullable: false, eager: false })
  @JoinColumn({ name: 'escala_id' })
  escala!: EscalaEntity;

  @ManyToOne(() => UserEntity, { nullable: false, eager: false })
  @JoinColumn({ name: 'ofertante_id' })
  ofertante!: UserEntity;

  // ✅ NOVO — destinatário escolhido pelo ofertante (repasse direcionado)
  @ManyToOne(() => UserEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'destinatario_id' })
  destinatario!: UserEntity | null;

  @Column({ type: 'varchar', name: 'mat_destinatario', nullable: true })
  matDestinatario!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'receptor_id' })
  receptor!: UserEntity | null;

  @Column({
    type: 'enum',
    enum: StatusRepasse,
    default: StatusRepasse.ABERTO,
    name: 'status_repasse',
  })
  statusRepasse!: StatusRepasse;

  @Column({ type: 'varchar', name: 'sistema_repasse' })
  sistemaRepasse!: string;

  @Column({ type: 'varchar', name: 'tipo_escala_repasse' })
  tipoEscalaRepasse!: string;

  @Column({ type: 'date', name: 'data_inicio_repasse' })
  dataInicioRepasse!: string;

  @Column({ type: 'time', name: 'hora_inicio_repasse' })
  horaInicioRepasse!: string;

  @Column({ type: 'time', name: 'hora_fim_repasse' })
  horaFimRepasse!: string;

  @Column({ type: 'varchar', name: 'mat_ofertante' })
  matOfertante!: string;

  @Column({ type: 'text', name: 'motivo', nullable: true })
  motivo!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
