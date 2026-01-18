import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import axios from 'axios';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // YOUR REQUESTED UPDATED MODEL LIST
  async getAvailableModels() {
    return [
      { 
        id: 'allenai/molmo-2-8b:free', 
        name: 'Molmo 2 8B',
        type: 'vision',
        label: '(Görsel Analiz)'
      },
      { 
        // ID from your code
        id: 'mistralai/mistral-small-3.1-24b-instruct:free', 
        name: 'Mistral Small 3.1',
        type: 'vision', // Marked as vision since you send images in your code
        label: '(Görsel & Metin)'
      },
      { 
        // ID from your code
        id: 'qwen/qwen3-coder:free', 
        name: 'Qwen 3 Coder',
        type: 'text',
        label: '(Kod Uzmanı)'
      },
    ];
  }

  async getAllChats() {
    return this.prisma.chat.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { messages: { take: 1, orderBy: { createdAt: 'asc' } } }
    });
  }

  // --- SEND MESSAGE ---
  async sendMessage(chatId: string | null, content: string, model: string, image?: string) {
    let chat;
    let isNewChat = false;

    if (chatId) {
      chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    }

    if (!chat) {
      isNewChat = true;
      chat = await this.prisma.chat.create({
        data: { title: content.substring(0, 30) + '...' },
      });
    }

    // Save User Message
    const savedContent = image ? `[Görsel] ${content}` : content;
    await this.prisma.message.create({
      data: { content: savedContent, role: 'user', chatId: chat.id },
    });

    if (isNewChat) {
      this.generateAutoTitle(chat.id, content).catch(err => console.error("Title gen error:", err));
    }

    try {
      let requestBody: any = {
        model: model,
        messages: [],
      };

      // --- PAYLOAD SEPARATION ---
      // Molmo and Mistral Small 3.1 (according to your code) accept image format.
      // So if there's an image, we send it in array format.
      const isVisionCapable = model === 'allenai/molmo-2-8b:free' || model === 'mistralai/mistral-small-3.1-24b-instruct:free';

      if (isVisionCapable && image) {
        requestBody.messages = [{
          role: 'user',
          content: [
            { type: 'text', text: content },
            { type: 'image_url', image_url: { url: image } }
          ]
        }];
      } else {
        // For Qwen 3 Coder or requests without images, use plain text
        requestBody.messages = [{ role: 'user', content: content }];
      }

      console.log(`Sending request to ${model}...`);

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        requestBody,
        {
          timeout: 60000, 
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Madlen AI',
          },
        },
      );

      const aiResponse = response.data.choices?.[0]?.message?.content || "Cevap yok.";

      // Save AI Response
      const savedAiMessage = await this.prisma.message.create({
        data: { content: aiResponse, role: 'assistant', chatId: chat.id },
      });

      return { chatId: chat.id, message: savedAiMessage };

    } catch (error: any) {
      console.error('API Error:', error.response?.data || error.message);
      
      // ERROR HANDLING: Show meaningful message to user
      throw new HttpException(
        "Şu an bu model yoğun veya cevap vermiyor, lütfen diğer modelleri deneyin.",
        HttpStatus.SERVICE_UNAVAILABLE 
      );
    }
  }

  async generateAutoTitle(chatId: string, firstMessage: string) {
    try {
      // Using a fast model for title generation
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'mistralai/mistral-7b-instruct:free', 
          messages: [
            { role: 'system', content: 'Summarize user text to 3-4 words Turkish title. No quotes.' },
            { role: 'user', content: firstMessage }
          ]
        },
        { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } }
      );

      const newTitle = response.data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '');
      if (newTitle) {
        await this.prisma.chat.update({ where: { id: chatId }, data: { title: newTitle } });
      }
    } catch (error) {
      console.error("Auto-title failed");
    }
  }

  async getChatHistory(chatId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!chat) throw new NotFoundException('Chat not found.');
    return chat;
  }

  async updateTitle(chatId: string, newTitle: string) {
    return this.prisma.chat.update({
      where: { id: chatId },
      data: { title: newTitle },
    });
  }

  async deleteChat(chatId: string) {
    await this.prisma.message.deleteMany({
    where: { chatId: chatId },
  });


  return this.prisma.chat.delete({
    where: { id: chatId },
  });
  }
}