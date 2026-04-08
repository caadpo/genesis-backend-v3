import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserType } from '../user/enum/user-type.enum';
import { Request } from 'express';
import { LoginPayload } from 'src/auth/dtos/loginPayload.dto';

@Injectable()
// RolesGuard limita o acesso a rotas com base no tipo de usuário
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // Executado ao acessar rotas com @Roles()
  canActivate(context: ExecutionContext): boolean {
    // Recupera os papéis exigidos da rota usando o decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<UserType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se não há roles exigidos, permite acesso
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as LoginPayload;

    // ✅ Verifica se o usuário está autenticado
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    // ✅ Verifica se o usuário tem permissão de acesso
    if (!requiredRoles.includes(user.typeUser)) {
      throw new ForbiddenException('Acesso não permitido para seu perfil');
    }

    return true;
  }
}
