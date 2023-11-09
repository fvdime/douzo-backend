import { PrismaClient } from '.prisma/client';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // constructor(config: ConfigService) {
  //   const url = config.get<string>('DATABASE_URL');
  constructor() {
    super({
      datasources: {
        db: {
          url: 'postgresql://postgres:password@localhost:5432/nestjs?schema=public',
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    return Promise.all([this.user.deleteMany()]);
  }
}
