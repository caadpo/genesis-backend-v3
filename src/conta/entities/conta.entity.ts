import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
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

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: UserEntity;

  //Quem atualizou pela ultima vez
  @Column({ name: 'updated_by_user_id', nullable: true })
  updatedByUserId: number;

  //Quem atualizou pela ultima vez
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updated_by_user_id' })
  updatedByUser: UserEntity;
}
