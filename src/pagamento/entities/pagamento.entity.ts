import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Evento } from 'src/evento/entities/evento.entity';
import { UserEntity } from 'src/user/entities/user.entity';

// ✅ Unicidade: mesmo usuário não pode ter dois registros de pagamento no mesmo evento
@Index(['eventoId', 'usuarioId'], { unique: true })
@Entity('pagamento')
export class PagamentoEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'evento_id' })
  eventoId!: number;

  @ManyToOne(() => Evento, { nullable: false })
  @JoinColumn({ name: 'evento_id' })
  evento!: Evento;

  @Column({ name: 'usuario_id' })
  usuarioId!: number;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: UserEntity;

  // ─── Snapshot do usuário no momento do pagamento ──────────────────────────

  @Column({ name: 'nome_pagamento', type: 'varchar' })
  nome_pagamento!: string;

  @Column({ name: 'nomeome_pagamento', type: 'varchar' })
  nomeome_pagamento!: string;

  @Column({ name: 'cpf_pagamento', type: 'varchar' })
  cpf_pagamento!: string;

  @Column({ name: 'tipo_pagamento', type: 'varchar' })
  tipo_pagamento!: string;

  @Column({ name: 'banco_pagamento', type: 'varchar' })
  banco_pagamento!: string;

  @Column({ name: 'agencia_pagamento', type: 'varchar' })
  agencia_pagamento!: string;

  @Column({ name: 'conta_pagamento', type: 'varchar' })
  conta_pagamento!: string;

  // ─── Dados do pagamento ───────────────────────────────────────────────────
  @Column({ name: 'sistema', type: 'varchar' })
  sistema!: string;

  @Column({ name: 'nome_verba', type: 'varchar' })
  nome_verba!: string;

  @Column({ name: 'total_cotas', type: 'integer' })
  total_cotas!: number;

  @Column({ name: 'valor_cota', type: 'numeric', precision: 10, scale: 2 })
  valor_cota!: number;

  @Column({ name: 'valor_total', type: 'numeric', precision: 10, scale: 2 })
  valor_total!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
