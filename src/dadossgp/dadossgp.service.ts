import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DadosSgpEntity } from './entities/dadossgp.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DadosSgpService {
  constructor(
    @InjectRepository(DadosSgpEntity)
    private readonly dadosSgpRepository: Repository<DadosSgpEntity>,
  ) {}

  async buscarPorMatricula(matSgp: string): Promise<DadosSgpEntity> {
    const dados = await this.dadosSgpRepository.findOne({
      where: { matSgp },
    });

    if (!dados) {
      throw new NotFoundException(`Policial ${matSgp} não encontrado`);
    }

    return dados;
  }

  // ─── Importação em lote (replace total) ────────────────────────────────────
  async importarLote(
    registros: Partial<DadosSgpEntity>[],
  ): Promise<{ total: number }> {
    if (!registros.length) {
      throw new Error('Nenhum registro válido encontrado no arquivo');
    }

    return this.dadosSgpRepository.manager.transaction(async (manager) => {
      // 1. Limpa a tabela inteira
      await manager.clear(DadosSgpEntity);

      // 2. Insere tudo de novo em lotes
      const BATCH_SIZE = 500;
      for (let i = 0; i < registros.length; i += BATCH_SIZE) {
        const lote = registros.slice(i, i + BATCH_SIZE);
        await manager
          .createQueryBuilder()
          .insert()
          .into(DadosSgpEntity)
          .values(lote)
          .execute();
      }

      return { total: registros.length };
    });
  }
}
