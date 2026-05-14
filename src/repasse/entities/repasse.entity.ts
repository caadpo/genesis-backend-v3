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
  ABERTO = 'ABERTO', // aguardando alguém pegar
  ACEITO = 'ACEITO', // outro usuário aceitou
  CANCELADO = 'CANCELADO', // ninguém pegou até a data/hora do serviço
}

// ✅ Uma escala só pode ter um repasse ativo (ABERTO) por vez
@Index(['escala', 'statusRepasse'], { unique: false })
@Entity('repasse')
export class RepasseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // ─── Escala sendo repassada ───────────────────────────────────────────────
  @ManyToOne(() => EscalaEntity, { nullable: false, eager: false })
  @JoinColumn({ name: 'escala_id' })
  escala!: EscalaEntity;

  // ─── Quem está oferecendo o repasse ──────────────────────────────────────
  @ManyToOne(() => UserEntity, { nullable: false, eager: false })
  @JoinColumn({ name: 'ofertante_id' })
  ofertante!: UserEntity;

  // ─── Quem aceitou (preenchido apenas quando ACEITO) ───────────────────────
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

  // ─── Snapshot da escala no momento do repasse (evita joins) ──────────────
  // Guardamos apenas o necessário para listagem rápida
  @Column({ type: 'varchar', name: 'sistema_repasse' })
  sistemaRepasse!: string; // 'PJES' | 'DIARIAS'

  @Column({ type: 'varchar', name: 'tipo_escala_repasse' })
  tipoEscalaRepasse!: string; // 'P' | 'O'

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
