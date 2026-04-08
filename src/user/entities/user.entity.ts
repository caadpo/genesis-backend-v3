import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserType } from '../enum/user-type.enum';
import { OmeEntity } from 'src/ome/entities/ome.entity';

@Entity({ name: 'user' })
@Index(['loginSei'], { unique: true })
@Index(['mat'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'imagem_url', nullable: true })
  imagemUrl: string;

  @Column({ name: 'loginsei', nullable: false })
  loginSei: string;

  @Column({ name: 'password', nullable: false })
  password: string;

  @Column({ name: 'pg', nullable: false })
  pg: string;

  @Column({ name: 'mat', nullable: false })
  mat: number;

  @Column({ name: 'ng', nullable: false })
  nomeGuerra: string;

  @Column({ name: 'tipo', nullable: false })
  tipo: string;

  @Column({ name: 'omeid', nullable: false })
  omeId: number;

  @Column({ name: 'phone' })
  phone: string;

  @Column({ name: 'funcao', nullable: false })
  funcao: string;

  // 🔹 NÍVEL DO USUÁRIO (hierarquia)
  @Column({
    name: 'type_user',
    nullable: false,
    type: 'enum',
    enum: UserType,
  })
  typeUser: UserType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => OmeEntity, (ome) => ome.users)
  @JoinColumn({ name: 'omeid', referencedColumnName: 'id' })
  ome?: OmeEntity;
}
