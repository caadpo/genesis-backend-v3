import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { UserEntity } from 'src/user/entities/user.entity';

export const UserId = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as UserEntity;

  return user?.id;
});
