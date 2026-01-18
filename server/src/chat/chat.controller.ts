import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Get available models
  @Get('models')
  getModels() {
    return this.chatService.getAvailableModels();
  }

  // Get all chats for sidebar
  @Get('list')
  async getChats() {
    return this.chatService.getAllChats();
  }

  // Send message
  @Post('send')
  async sendMessage(
    @Body() body: { chatId?: string; content: string; model: string; image?: string },
  ) {
    const chatId = body.chatId ?? null;
    return this.chatService.sendMessage(
      chatId, 
      body.content, 
      body.model,
      body.image
    );
  }

  // Get history
  @Get('history/:id')
  async getHistory(@Param('id') id: string) {
    return this.chatService.getChatHistory(id);
  }

  // Update title
  @Patch(':id')
  async updateChatTitle(
    @Param('id') id: string,
    @Body() body: { title: string },
  ) {
    return this.chatService.updateTitle(id, body.title);
  }

  // Delete chat
  @Delete(':id')
  async deleteChat(@Param('id') id: string) {
    return this.chatService.deleteChat(id);
  }
}