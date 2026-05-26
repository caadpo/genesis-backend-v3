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
  pg_escala!: string; //Cb ou Cap

  @Column({ type: 'varchar', name: 'mat_escala' })
  mat_escala!: string; //1157590

  @Column({ type: 'varchar', name: 'ng_escala' })
  ng_escala!: string; //Nome de Guerra

  @Column({ type: 'varchar', name: 'tipo_escala' })
  tipo_escala!: string; //O ou P

  @Column({ type: 'varchar', name: 'cpf_escala' })
  cpf_escala!: string; //08289997612

  @Column({ type: 'varchar', name: 'nomecompleto_escala' })
  nomecompleto_escala!: string; //EMERSON FRANCISCO DA SILVA

  @Column({ type: 'varchar', name: 'nomeome_escala' })
  nomeome_escala!: string; //OME do usuário na escala

  @Column({ type: 'varchar', name: 'nunfunc_escala' })
  nunfunc_escala!: string; //Número de Funcionário

  @Column({ type: 'varchar', name: 'nunvinc_escala' })
  nunvinc_escala!: string; //Número de Vinculo

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
