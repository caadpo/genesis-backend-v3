import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Put,
  Delete,
  UseGuards,
  Query,
  Request,
  Patch,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from './enum/user-type.enum';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { UserSearchDto } from './dtos/user-search.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { UpdatePhoneDto } from './dtos/update-phone.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(UserType.MASTER)
  async createUser(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.userService.createUser(dto);
  }

  @Patch(':id/ativo')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.AUXILIAR)
  async toggleAtivo(@Param('id') id: number, @Request() req: any) {
    return this.userService.toggleAtivo(id, req.user);
  }

  @Get('search')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.DIRETOR, UserType.AUXILIAR)
  async searchUser(@Query('q') q: string): Promise<UserSearchDto | null> {
    return this.userService.findByMatOrNomeGuerra(q);
  }

  @Get(':id')
  async getUser(@Param('id') id: number): Promise<UserEntity> {
    return this.userService.findById(id);
  }

  @Put(':id')
  @Roles(UserType.TECNICO, UserType.MASTER)
  async updateUser(
    @Param('id') id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.userService.updateUser(id, dto);
  }

  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.DIRETOR,
    UserType.AUXILIAR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.GESTOR_VERBA,
    UserType.COMUN,
  )
  @Put('me/password')
  async changeOwnPassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    await this.userService.changeOwnPassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );

    return { message: 'Senha alterada com sucesso' };
  }

  @Put(':id/reset-password')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.AUXILIAR)
  async resetPassword(@Param('id') id: number, @Request() req: any) {
    await this.userService.resetPasswordToGenesis(req.user.id, id);
    return { message: 'Senha resetada para o padrão genesis' };
  }

  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.DIRETOR,
    UserType.AUXILIAR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.GESTOR_VERBA,
    UserType.COMUN,
  )
  @Put('me/imagem')
  async updateOwnImagem(
    @Request() req: any,
    @Body() body: { imagemUrl: string },
  ) {
    return this.userService.updateOwnImagem(req.user.id, body.imagemUrl);
  }

  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.DIRETOR,
    UserType.AUXILIAR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.GESTOR_VERBA,
    UserType.COMUN,
  )
  @Put('me/phone')
  async updateOwnPhone(@Request() req: any, @Body() dto: UpdatePhoneDto) {
    return this.userService.updateOwnPhone(req.user.id, dto.phone);
  }

  @Delete(':id')
  @Roles(UserType.MASTER)
  async deleteUser(@Param('id') id: number) {
    await this.userService.deleteUser(id);
    return { message: 'Usuário removido com sucesso' };
  }
}
