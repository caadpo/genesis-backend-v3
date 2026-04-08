import { ReturnUserDto } from 'src/user/dtos/return-user.dto';

export interface ReturnLogin {
  user: ReturnUserDto;
  accessToken: string;
}
