import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  loginSei: string;

  @IsString()
  password: string;
}
