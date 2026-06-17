import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity({ name: 'dadossgp' })
@Index(['matSgp'], { unique: true })
export class DadosSgpEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'pgsgp', type: 'varchar' })
  pgSgp!: string;

  @Column({ name: 'matsgp', type: 'varchar' })
  matSgp!: string;

  @Column({ name: 'nomeguerrasgp', type: 'varchar' })
  nomeGuerraSgp!: string;

  @Column({ name: 'nomeomesgp', type: 'varchar' })
  nomeOmeSgp!: string;

  @Column({ name: 'tiposgp', type: 'varchar' })
  tipoSgp!: string;

  @Column({ name: 'nomecompletosgp', type: 'varchar' })
  nomeCompletoSgp!: string;

  @Column({ name: 'cpfsgp', type: 'varchar' })
  cpfSgp!: string;

  @Column({ name: 'nunfuncsgp', type: 'varchar' })
  nunfuncSgp!: string;

  @Column({ name: 'nunvincsgp', type: 'varchar' })
  nunvincSgp!: string;

  @Column({ name: 'localapresentacaosgp', type: 'varchar' })
  localApresentacaoSgp!: string;

  @Column({ name: 'situacaosgp', type: 'varchar' })
  situacaoSgp!: string;
}
