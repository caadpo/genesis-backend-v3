// update-teto.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateTetoDto } from './create-teto.dto';

export class UpdateTetoDto extends PartialType(CreateTetoDto) {}
