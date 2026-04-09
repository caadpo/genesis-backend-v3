import { PartialType } from '@nestjs/mapped-types';
import { CreateDistribuicaoDto } from './create-distribuicao.dto';

export class UpdateDistribuicaoDto extends PartialType(CreateDistribuicaoDto) {}
