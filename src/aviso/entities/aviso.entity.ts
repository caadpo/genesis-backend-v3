import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('avisos')
export class Aviso {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  nome!: string;

  @Column({ type: 'text', nullable: true })
  descricao?: string | null;

  // Caminho de imagem que já existe no front (ex: "/logo_dpo.png").
  // Se vier vazio, o front mostra o ícone FaComment.
  @Column({ name: 'imagem_url', type: 'varchar', nullable: true })
  imagemUrl?: string | null;

  // Definida pelo Master na criação/edição do aviso
  @Column({ name: 'data_hora', type: 'timestamptz' })
  dataHora!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
