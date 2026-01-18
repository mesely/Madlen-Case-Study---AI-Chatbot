const API_URL = 'http://localhost:3001';

export interface Message {
  id?: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt?: string;
}

export const api = {
  // Get Models
  async getModels() {
    try {
      const res = await fetch(`${API_URL}/chat/models`);
      if (!res.ok) throw new Error('Modeller yüklenemedi');
      return await res.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  // Get Chat List
  async getChats() {
    try {
      const res = await fetch(`${API_URL}/chat/list`);
      if (!res.ok) throw new Error('Sohbetler yüklenemedi');
      return await res.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  // Get History
  async getHistory(chatId: string) {
    try {
      const res = await fetch(`${API_URL}/chat/history/${chatId}`);
      if (!res.ok) throw new Error('Geçmiş yüklenemedi');
      return await res.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  // Send Message
  async sendMessage(content: string, model: string, chatId?: string, image?: string) {
    const res = await fetch(`${API_URL}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, model, chatId, image }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Mesaj gönderilemedi');
    }
    
    return res.json();
  },

  // Update Title
  async updateChatTitle(chatId: string, title: string) {
    const res = await fetch(`${API_URL}/chat/${chatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Başlık güncellenemedi');
    return res.json();
  },

  // DELETE CHAT (Burası önemli)
  async deleteChat(chatId: string) {
    const res = await fetch(`${API_URL}/chat/${chatId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Sohbet silinemedi');
    return res.json();
  }
};