import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from './enum/user-type.enum';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users') // ou 'tetos'
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(UserType.AUXILIAR, UserType.TECNICO, UserType.MASTER)
  async createUser(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.userService.createUser(dto);
  }

  @Get(':id')
  async getUser(@Param('id') id: number): Promise<UserEntity> {
    return this.userService.findById(id);
  }

  @Put(':id')
  @Roles(UserType.AUXILIAR, UserType.TECNICO, UserType.MASTER)
  async updateUser(
    @Param('id') id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.userService.updateUser(id, dto);
  }

  @Delete(':id')
  @Roles(UserType.AUXILIAR, UserType.TECNICO, UserType.MASTER)
  async deleteUser(@Param('id') id: number) {
    await this.userService.deleteUser(id);
    return { message: 'Usuário removido com sucesso' };
  }
}
