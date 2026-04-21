import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { DadosSgpService } from './dadossgp.service';
import { DadosSgpEntity } from './entities/dadossgp.entity';

@Controller('dados-sgp')
export class DadosSgpController {
  constructor(private readonly dadosSgpService: DadosSgpService) {}

  @Get(':matSgp')
  async getDadosPorMatricula(
    @Param('matSgp', ParseIntPipe) matSgp: number,
  ): Promise<DadosSgpEntity> {
    return this.dadosSgpService.buscarPorMatricula(matSgp);
  }
}
