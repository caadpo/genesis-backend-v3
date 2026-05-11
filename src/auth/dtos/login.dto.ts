import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  mat!: string;

  @IsString()
  password!: string;
}
