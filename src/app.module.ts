import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TetosModule } from './tetos/teto.module';
import { UserModule } from './user/user.module';
import { DiretoriaModule } from './diretoria/diretoria.module';
import { OmeModule } from './ome/ome.module';
import { AuthModule } from './auth/auth.module';
import { DistribuicaoModule } from './distribuicao/distribuicao.module';
import { EventoModule } from './evento/evento.module';
import { OperacaoModule } from './operacao/operacao.module';
import { ContaModule } from './conta/conta.module';
import { DadossgpModule } from './dadossgp/dadossgp.module';
import { ConfigModule } from '@nestjs/config';
import { EscalaModule } from './escala/escala.module';
import { PagamentoModule } from './pagamento/pagamento.module';
import { RepasseModule } from './repasse/repasse.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3001),
        CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
      }),
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [`${__dirname}/**/*.entity{.ts,.js}`],
      migrations: [`${__dirname}/migrations/*.{ts,js}`],
      migrationsRun: process.env.NODE_ENV !== 'production',
    }),

    ScheduleModule.forRoot(),

    TetosModule,
    UserModule,
    DiretoriaModule,
    OmeModule,
    AuthModule,
    DistribuicaoModule,
    EventoModule,
    OperacaoModule,
    ContaModule,
    DadossgpModule,
    EscalaModule,
    PagamentoModule,
    RepasseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
