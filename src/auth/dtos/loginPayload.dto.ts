// src/auth/dtos/loginPayload.dto.ts
import { UserEntity } from '../../user/entities/user.entity';

export class LoginPayload {
  sub: number; // padrão JWT (subject)
  typeUser: number; // usado no RolesGuard

  constructor(user: UserEntity) {
    this.sub = user.id;
    this.typeUser = user.typeUser;
  }
}
