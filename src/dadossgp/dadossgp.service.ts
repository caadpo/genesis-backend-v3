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

  async buscarPorMatricula(matSgp: number): Promise<DadosSgpEntity> {
    const dados = await this.dadosSgpRepository.findOne({
      where: { matSgp },
    });

    if (!dados) {
      throw new NotFoundException(`Policial ${matSgp} não encontrado`);
    }

    return dados;
  }
}
