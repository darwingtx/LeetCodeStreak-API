import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Service to manage the Prisma database connection lifecycle.
 * Extends PrismaClient to provide database access throughout the application.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Establishes the database connection when the module initializes.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Closes the database connection when the module is destroyed.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
