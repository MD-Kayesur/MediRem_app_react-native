import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Database');

  async onModuleInit() {
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1 as ping`;
      this.logger.log('✅ Database connected successfully! (Neon Cloud PostgreSQL)');
    } catch (err: any) {
      this.logger.error(`❌ Failed to connect to database: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed.');
  }
}
