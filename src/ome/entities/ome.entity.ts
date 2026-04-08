import { DiretoriaEntity } from 'src/diretoria/entities/diretoria.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'ome' })
export class OmeEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'nomeome', nullable: false })
  nomeOme: string;

  @Column({ name: 'diretoriaid', nullable: false })
  diretoriaId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => UserEntity, (user) => user.ome)
  users?: UserEntity[];

  @ManyToOne(() => DiretoriaEntity, (diretoria) => diretoria.omes)
  @JoinColumn({ name: 'diretoriaid', referencedColumnName: 'id' })
  diretoria?: DiretoriaEntity;
}
