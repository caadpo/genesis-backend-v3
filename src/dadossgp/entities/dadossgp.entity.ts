import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'dadossgp' })
export class DadosSgpEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'matsgp', type: 'int' })
  matSgp: number;

  @Column({ name: 'pgsgp', type: 'varchar' })
  pgSgp: string;

  @Column({ name: 'ngsgp', type: 'varchar' })
  nomeGuerraSgp: string;

  @Column({ name: 'nomecompletosgp', type: 'varchar' })
  nomeCompletoSgp: string;

  @Column({ name: 'omesgp', type: 'varchar' })
  omeSgp: string;

  @Column({ name: 'tiposgp', type: 'varchar', length: 1 })
  tipoSgp: string;

  @Column({ name: 'nunfuncsgp', type: 'int' })
  nunfuncSgp: number;

  @Column({ name: 'nunvincsgp', type: 'int' })
  nunvincSgp: number;

  @Column({ name: 'localapresentacaosgp', type: 'varchar' })
  localApresentacaoSgp: string;

  @Column({ name: 'situacaosgp', type: 'varchar' })
  situacaoSgp: string;
}
