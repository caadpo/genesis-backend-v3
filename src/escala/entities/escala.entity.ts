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
import { Operacao } from 'src/operacao/entities/operacao.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { ContaEntity } from 'src/conta/entities/conta.entity';
import { Sistema } from 'src/tetos/entities/teto.entity';
import { ViaturaEntity } from 'src/viatura/entities/viatura.entity';

// ✅ Unicidade: mesma matrícula, mesma data, mesmo sistema → BLOQUEADO
@Index(['mat_escala', 'dataInicio', 'sistema'], { unique: true })
@Entity('escala')
export class EscalaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: Sistema })
  sistema!: Sistema;

  @ManyToOne(() => Operacao, { nullable: false })
  @JoinColumn({ name: 'operacao_id' })
  operacao!: Operacao;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: UserEntity;

  /* Campos vindos da tabel dadosSGP */

  @Column({ type: 'varchar', name: 'pg_escala' })
  pg_escala!: string;

  @Column({ type: 'varchar', name: 'mat_escala' })
  mat_escala!: string;

  @Column({ type: 'varchar', name: 'ng_escala' })
  ng_escala!: string; //Nome de Guerra

  @Column({ type: 'varchar', name: 'tipo_escala' })
  tipo_escala!: string;

  @Column({ type: 'varchar', name: 'cpf_escala' })
  cpf_escala!: string;

  @Column({ type: 'varchar', name: 'nomecompleto_escala' })
  nomecompleto_escala!: string;

  @Column({ type: 'varchar', name: 'nomeome_escala' })
  nomeome_escala!: string;

  @Column({ type: 'varchar', name: 'nunfunc_escala' })
  nunfunc_escala!: string;

  @Column({ type: 'varchar', name: 'nunvinc_escala' })
  nunvinc_escala!: string;

  // Conta relacionada
  @ManyToOne(() => ContaEntity, { nullable: true })
  @JoinColumn({ name: 'conta_id' })
  conta?: ContaEntity;

  @Column({ type: 'date', name: 'data_inicio' })
  dataInicio!: string;

  @Column({ type: 'time', name: 'hora_inicio' })
  horaInicio!: string;

  @Column({ type: 'time', name: 'hora_fim' })
  horaFim!: string;

  @Column({ type: 'integer', name: 'cota_escala' })
  cota_escala!: number;

  @Column({
    type: 'varchar',
    name: 'local_apresentacao',
    default: 'SEDE DA OME',
  })
  localApresentacao!: string;

  @Column({ type: 'varchar', length: 100, name: 'funcao' })
  funcao!: string;

  @Column({ type: 'varchar', length: 50, name: 'situacao', default: 'REGULAR' })
  situacao!: string;

  @Column({ type: 'text', name: 'anotacoes', nullable: true })
  anotacoes!: string;

  @Column({ name: 'viatura_id', nullable: true })
  viaturaId?: number;

  @ManyToOne(() => ViaturaEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'viatura_id' })
  viatura?: ViaturaEntity;

  @Column({ type: 'boolean', default: false, name: 'is_repasse' })
  isRepasse!: boolean;

  @Column({ type: 'integer', nullable: true, name: 'repasse_origem_id' })
  repasseOrigemId?: number | null;

  @Column({
    name: 'presenca_confirmada_por_id',
    nullable: true,
  })
  presencaConfirmadaPorId?: number;

  @Column({ type: 'boolean', default: false, name: 'presenca_confirmada' })
  presencaConfirmada!: boolean;

  @Column({ type: 'text', name: 'presenca_observacao', nullable: true })
  presencaObservacao?: string | null;

  @Column({ type: 'timestamp', name: 'presenca_confirmada_em', nullable: true })
  presencaConfirmadaEm?: Date | null;

  @ManyToOne(() => UserEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'presenca_confirmada_por_id' })
  presencaConfirmadaPor?: UserEntity | null;

  @ManyToOne(() => UserEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'observacao_escrita_por_id' })
  observacaoEscritaPor!: UserEntity | null;

  @Column({ name: 'observacao_escrita_em', type: 'timestamp', nullable: true })
  observacaoEscritaEm!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
