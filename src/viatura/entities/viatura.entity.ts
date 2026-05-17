import { OmeEntity } from 'src/ome/entities/ome.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StatusViatura {
  DISPONIVEL = 'DISPONIVEL',
  INDISPONIVEL = 'INDISPONIVEL',
}

@Entity({ name: 'viatura' })
export class ViaturaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'patrimonio', nullable: false, unique: true })
  patrimonio!: string;

  @Column({ name: 'km_atual', type: 'integer', nullable: false, default: 0 })
  kmAtual!: number;

  @Column({
    name: 'status_vtr',
    type: 'enum',
    enum: StatusViatura,
    default: StatusViatura.DISPONIVEL,
  })
  statusVtr!: StatusViatura;

  @Column({ name: 'anotacao', nullable: true, type: 'text' })
  anotacao?: string;

  @Column({ name: 'omeid', nullable: false })
  omeId!: number;

  @ManyToOne(() => OmeEntity, { nullable: false, eager: false })
  @JoinColumn({ name: 'omeid', referencedColumnName: 'id' })
  ome!: OmeEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
