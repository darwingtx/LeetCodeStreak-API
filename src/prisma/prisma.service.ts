import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL environment variable is not set. Please configure it in your .env file.',
      );
    }

    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
