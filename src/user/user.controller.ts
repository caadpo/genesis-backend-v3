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
  ParseIntPipe,
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
import { sanitizeUser } from 'src/utils/sanitize-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(UserType.MASTER)
  async createUser(@Body() dto: CreateUserDto) {
    return sanitizeUser(await this.userService.createUser(dto));
  }

  @Patch(':id/ativo')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.AUXILIAR)
  async toggleAtivo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.userService.toggleAtivo(id, req.user);
  }

  @Get('search')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.DIRETOR, UserType.AUXILIAR)
  async searchUser(@Query('q') q: string): Promise<UserSearchDto | null> {
    return this.userService.findByMatOrNomeGuerra(q);
  }

  @Get('especiais')
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
  async listUsuariosEspeciais(
    @Query('limit') limit?: string,
  ): Promise<UserSearchDto[]> {
    return this.userService.listUsuariosEspeciais(
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':id')
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
  async getUser(@Param('id', ParseIntPipe) id: number) {
    return sanitizeUser(await this.userService.findById(id));
  }

  @Put(':id')
  @Roles(UserType.MASTER, UserType.AUXILIAR)
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Request() req: any,
  ) {
    return sanitizeUser(await this.userService.updateUser(id, dto, req.user));
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
  @Roles(UserType.MASTER, UserType.AUXILIAR)
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
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
    return sanitizeUser(
      await this.userService.updateOwnImagem(req.user.id, body.imagemUrl),
    );
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
    return sanitizeUser(
      await this.userService.updateOwnPhone(req.user.id, dto.phone),
    );
  }

  @Delete(':id')
  @Roles(UserType.MASTER)
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.userService.deleteUser(id);
    return { message: 'Usuário removido com sucesso' };
  }
}
