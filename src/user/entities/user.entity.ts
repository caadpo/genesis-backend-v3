import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { UserType } from '../enum/user-type.enum';
import { OmeEntity } from 'src/ome/entities/ome.entity';
import { ContaEntity } from 'src/conta/entities/conta.entity';

@Entity({ name: 'user' })
@Index(['mat'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('rowid')
  id!: number;

  @Column({ name: 'imagem_url', nullable: true })
  imagemUrl!: string;

  @Column({ name: 'mat', nullable: false })
  mat!: string;

  @Column({ name: 'password', nullable: false })
  password!: string;

  @Column({ name: 'ativo', type: 'boolean', default: false })
  ativo!: boolean;

  @Column({ name: 'omeid', nullable: false })
  omeId!: number;

  @Column({ name: 'phone' })
  phone!: string;

  // 🔹 NÍVEL DO USUÁRIO (hierarquia)
  @Column({
    name: 'type_user',
    nullable: false,
    type: 'enum',
    enum: UserType,
  })
  typeUser!: UserType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => OmeEntity, (ome) => ome.users, { nullable: false })
  @JoinColumn({ name: 'omeid', referencedColumnName: 'id' })
  ome!: OmeEntity;

  @OneToOne(() => ContaEntity, (conta) => conta.usuario)
  conta!: ContaEntity;
}
