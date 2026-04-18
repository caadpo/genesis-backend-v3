import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TetosModule } from './tetos/teto.module';
import { UserModule } from './user/user.module';
import { DiretoriaModule } from './diretoria/diretoria.module';
import { OmeModule } from './ome/ome.module';
import { AuthModule } from './auth/auth.module';
import { DistribuicaoModule } from './distribuicao/distribuicao.module';
import { EventoModule } from './evento/evento.module';
import { OperacaoModule } from './operacao/operacao.module';
import { ContaModule } from './conta/conta.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [`${__dirname}/**/*.entity{.ts,.js}`],
      migrations: [`${__dirname}/migrations/{.ts,*.js}`],
      migrationsRun: true,
    }),

    TetosModule,
    UserModule,
    DiretoriaModule,
    OmeModule,
    AuthModule,
    DistribuicaoModule,
    EventoModule,
    OperacaoModule,
    ContaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
