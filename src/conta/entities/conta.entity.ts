import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';

@Entity('conta')
export class ContaEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  banco: string;

  @Column()
  agencia: string;

  @Column()
  conta: string;

  @Column({ name: 'usuario_id', unique: true })
  usuarioId: number;

  @OneToOne(() => UserEntity, (usuario) => usuario.conta)
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
