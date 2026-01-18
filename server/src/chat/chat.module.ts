import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
})
export class AppModule {}