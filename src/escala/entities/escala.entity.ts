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

  // ── Presença ────────────────────────────────────────────────────────────
  // Só o próprio usuário escalado confirma, a partir de 15 min antes do
  // início da escala (ver EscalaService.calcularJanelaEscala).
  @Column({ type: 'boolean', default: false, name: 'presenca_confirmada' })
  presencaConfirmada!: boolean; // Sim ou Não

  @Column({
    name: 'presenca_confirmada_por_id',
    nullable: true,
  })
  presencaConfirmadaPorId?: number; // ID do usuário que confirmou a presença (o próprio escalado)

  @ManyToOne(() => UserEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'presenca_confirmada_por_id' })
  presencaConfirmadaPor?: UserEntity | null;

  @Column({ type: 'timestamp', name: 'presenca_confirmada_em', nullable: true })
  presencaConfirmadaEm?: Date | null;

  @Column({
    type: 'double precision',
    name: 'presenca_latitude',
    nullable: true,
  })
  presencaLatitude?: number | null;

  @Column({
    type: 'double precision',
    name: 'presenca_longitude',
    nullable: true,
  })
  presencaLongitude?: number | null;

  // ── Saída de serviço ────────────────────────────────────────────────────
  // Liberada assim que a presença é confirmada. Se o usuário não confirmar,
  // o sistema fecha automaticamente ao término da escala (cron em
  // EscalaService.encerrarSaidasAutomaticamente).
  @Column({ type: 'boolean', default: false, name: 'saida_confirmada' })
  saidaConfirmada!: boolean;

  @Column({ name: 'saida_confirmada_por_id', nullable: true })
  saidaConfirmadaPorId?: number | null; // null quando o fechamento foi automático (sistema)

  @ManyToOne(() => UserEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'saida_confirmada_por_id' })
  saidaConfirmadaPor?: UserEntity | null;

  @Column({ type: 'timestamp', name: 'saida_confirmada_em', nullable: true })
  saidaConfirmadaEm?: Date | null;

  // ── 1ª verificação (fiscal) ─────────────────────────────────────────────
  // idVerificador1 só pode ser um usuário escalado como FISCAL na mesma
  // operação/data (ver EscalaService.validarFiscal). dataHoraVerificador1 é
  // atualizada tanto ao marcar o boolean quanto ao gravar a observação.
  @Column({ type: 'boolean', default: false, name: 'primeira_verificacao' })
  primeiraVerificacao!: boolean;

  @Column({ name: 'id_verificador1', nullable: true })
  idVerificador1?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'id_verificador1' })
  verificador1?: UserEntity | null;

  @Column({ type: 'timestamp', name: 'data_hora_verificador1', nullable: true })
  dataHoraVerificador1?: Date | null;

  @Column({ type: 'text', name: 'obs_verificador1', nullable: true })
  obsVerificador1?: string | null;

  // ── 2ª verificação (fiscal) ─────────────────────────────────────────────
  @Column({ type: 'boolean', default: false, name: 'segunda_verificacao' })
  segundaVerificacao!: boolean;

  @Column({ name: 'id_verificador2', nullable: true })
  idVerificador2?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'id_verificador2' })
  verificador2?: UserEntity | null;

  @Column({ type: 'timestamp', name: 'data_hora_verificador2', nullable: true })
  dataHoraVerificador2?: Date | null;

  @Column({ type: 'text', name: 'obs_verificador2', nullable: true })
  obsVerificador2?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
