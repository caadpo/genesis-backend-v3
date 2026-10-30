import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Operacao } from './operacao.entity';
import { OmeEntity } from 'src/ome/entities/ome.entity';

@Entity('operacao_ome_compartilhada')
@Unique('UQ_operacao_ome_compartilhada', ['operacao', 'ome'])
export class OperacaoOmeCompartilhada {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Operacao, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'operacao_id' })
  operacao!: Operacao;

  @ManyToOne(() => OmeEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ome_id' })
  ome!: OmeEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
