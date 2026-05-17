import { PartialType } from '@nestjs/mapped-types';
import { CreateViaturaDto } from './create-viatura.dto';

export class UpdateViaturaDto extends PartialType(CreateViaturaDto) {}
