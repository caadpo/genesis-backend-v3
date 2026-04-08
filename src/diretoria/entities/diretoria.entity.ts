import { OmeEntity } from 'src/ome/entities/ome.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'diretoria' })
export class DiretoriaEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'nomediretoria', nullable: false })
  nomeDiretoria: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OmeEntity, (ome) => ome.diretoria)
  omes?: OmeEntity[];
}
