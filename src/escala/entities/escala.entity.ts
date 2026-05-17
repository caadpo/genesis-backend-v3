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
import { Sistema } from 'src/tetos/entities/teto.entity';
import { ViaturaEntity } from 'src/viatura/entities/viatura.entity';

// ✅ Unicidade: mesma matrícula, mesma data, mesmo sistema → BLOQUEADO
@Index(['mat', 'dataInicio', 'sistema'], { unique: true })
@Entity('escala')
export class EscalaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: Sistema })
  sistema!: Sistema;

  @Column({ type: 'varchar' })
  mat!: string;

  @ManyToOne(() => Operacao, { nullable: false })
  @JoinColumn({ name: 'operacao_id' })
  operacao!: Operacao;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: UserEntity;

  @Column({ type: 'varchar', name: 'cpf_escala' })
  cpf_escala!: string;

  @Column({ type: 'varchar', name: 'pg_escala' })
  pg_escala!: string;

  @Column({ type: 'varchar', name: 'tipo_escala' })
  tipo_escala!: string;

  @Column({ type: 'varchar', name: 'nome_escala' })
  nome_escala!: string;

  @Column({ type: 'varchar', name: 'nomeome_escala' })
  nomeome_escala!: string;

  @Column({ type: 'varchar', name: 'phone_escala' })
  phone_escala!: string;

  @Column({ type: 'varchar', name: 'banco_escala' })
  banco_escala!: string;

  @Column({ type: 'varchar', name: 'agencia_escala' })
  agencia_escala!: string;

  @Column({ type: 'varchar', name: 'conta_escala' })
  conta_escala!: string;

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
