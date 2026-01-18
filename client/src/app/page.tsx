'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { api, Message } from '@/lib/api';
import { Send, Plus, MessageSquare, User, Menu, X, Image as ImageIcon, UploadCloud, AlertCircle, ChevronDown, Pencil, Check, Trash2 } from 'lucide-react';

// --- MARKDOWN IMPORTS ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

// --- TYPES ---
interface ModelInfo {
  id: string;
  name: string;
  type: 'vision' | 'text';
  label: string;
}

// --- RENDERER ---
const MessageContent = ({ content }: { content: string }) => {
  if (!content) return null;
  return (
    <div className="prose prose-sm sm:prose-base max-w-none prose-stone break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className="rounded-xl overflow-hidden my-3 shadow-sm border border-orange-100 bg-[#fffbf5]">
                <div className="bg-[#fdf6e9] text-xs text-orange-800 px-3 py-1.5 flex justify-between border-b border-orange-100 font-medium">
                  <span className="uppercase tracking-wider">{match[1]}</span>
                </div>
                <SyntaxHighlighter
                  style={vs}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-sm font-mono border border-orange-200" {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return <div className="overflow-x-auto my-4 border border-orange-100 rounded-xl bg-white shadow-sm"><table className="min-w-full divide-y divide-orange-100">{children}</table></div>;
          },
          thead({ children }) {
            return <thead className="bg-orange-50">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-4 py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-3 whitespace-nowrap text-sm text-stone-700 border-t border-orange-50">{children}</td>;
          },
          a({ children, href }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-800 hover:underline font-medium">{children}</a>
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0 leading-relaxed text-stone-800">{children}</p>
          },
          strong({ children }) {
            return <strong className="font-bold text-stone-900">{children}</strong>
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// --- MAIN CHAT ---
function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
 
  const [model, setModel] = useState('allenai/molmo-2-8b:free'); 
  

  const [models] = useState<ModelInfo[]>([
    { id: 'allenai/molmo-2-8b:free', name: 'Molmo 2 8B', type: 'vision', label: 'Görsel Analiz' },
    { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1', type: 'vision', label: 'Görsel & Metin' },
    { id: 'qwen/qwen3-coder:free', name: 'Qwen 3 Coder', type: 'text', label: 'Kod Uzmanı' },
  ]);
  
  const [realHistory, setRealHistory] = useState<{id: string, title: string}[]>([]); 
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); 

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = searchParams.get('chatId');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentModelObj = models.find(m => m.id === model);
  // Molmo ve Mistral Small için vision true
  const canUploadImage = currentModelObj?.type === 'vision'; 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, selectedImage]);

  useEffect(() => {
    loadSidebarChats();
    if (chatId) {
      setIsLoading(true);
      api.getHistory(chatId)
        .then((data) => { if (data && data.messages) setMessages(data.messages); })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [chatId]);

  const loadSidebarChats = () => {
    if (api.getChats) api.getChats().then(setRealHistory).catch(console.error);
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    setMessages([]);
    setSelectedImage(null);
    router.push('/'); 
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const currentInput = input;
    const currentImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    const userMsg: Message = { 
      content: currentImage ? `[Görsel] ${currentInput}` : currentInput, 
      role: 'user' 
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await api.sendMessage(currentInput, model, chatId || undefined, currentImage || undefined);
      
      if (!chatId && response.chatId) {
        router.push(`/?chatId=${response.chatId}`);
        setTimeout(loadSidebarChats, 1500); 
      }
      setMessages((prev) => [...prev, response.message]);
    } catch (error: any) {
      let displayError = error.message;
      if (!displayError || displayError.includes('Internal server error')) {
          displayError = "Şu an bu model yoğun veya cevap vermiyor, lütfen diğer modelleri deneyin.";
      }

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `⚠️ ${displayError}`,
        id: 'err-' + Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSelectedImage(null);
    router.push('/');
    if (window.innerWidth < 768) setMobileMenuOpen(false);
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  // --- ACTIONS ---
  const startEditing = (chat: {id: string, title: string}, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setEditingChatId(chat.id);
    setEditTitleInput(chat.title || '');
  };

  const saveTitle = async (id: string) => {
    if (!editTitleInput.trim()) return;
    try {
        await api.updateChatTitle(id, editTitleInput);
        setRealHistory(prev => prev.map(c => c.id === id ? { ...c, title: editTitleInput } : c));
        setEditingChatId(null);
    } catch (e) {
        console.error("Başlık güncellenemedi", e);
    }
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(!confirm("Bu sohbeti silmek istediğinize emin misiniz?")) return;
    
    try {
        await api.deleteChat(id);
        setRealHistory(prev => prev.filter(c => c.id !== id));
        if (chatId === id) {
            startNewChat();
        }
    } catch (e) {
        console.error("Silinemedi", e);
    }
  };

  // --- DRAG & DROP ---
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); setDragError(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canUploadImage) {
      setDragError(true);
      setTimeout(() => setDragError(false), 3000);
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen bg-[#fffcf7] text-stone-800 font-sans overflow-hidden selection:bg-orange-200 selection:text-orange-900" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      
      {/* Overlay */}
      {isDragging && (
        <div className={`fixed inset-0 z-[60] backdrop-blur-md border-4 border-dashed m-6 rounded-[2rem] flex items-center justify-center pointer-events-none transition-all duration-300 ${canUploadImage ? 'bg-orange-50/90 border-orange-400' : 'bg-stone-100/90 border-stone-300'}`}>
          <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce border border-orange-100">
            {canUploadImage ? (
              <>
                <UploadCloud className="w-20 h-20 text-orange-500 mb-6" />
                <h3 className="text-2xl font-bold text-orange-600">Görseli Bırak</h3>
              </>
            ) : (
              <>
                <AlertCircle className="w-20 h-20 text-stone-400 mb-6" />
                <h3 className="text-2xl font-bold text-stone-500">Görsel Desteklenmiyor</h3>
                <p className="text-stone-400 mt-2">Lütfen Molmo veya Mistral modeline geçin</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {dragError && (
        <div className="fixed top-24 right-6 z-[70] bg-white text-orange-700 px-6 py-4 rounded-xl shadow-xl border border-orange-200 animate-in slide-in-from-top-4 duration-300 flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-full"><AlertCircle className="w-5 h-5 text-orange-600" /></div>
          <span className="font-medium">Bu model görsel desteklemiyor.</span>
        </div>
      )}

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-stone-900/10 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* --- SIDEBAR --- */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-40 bg-[#FFF8F0] border-r border-[#FBEAD4] flex flex-col transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          ${sidebarOpen ? 'md:w-72' : 'md:w-0 md:overflow-hidden'}
        `}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#FBEAD4] shrink-0 w-72 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={toggleSidebar} className="text-stone-400 hover:text-orange-600 transition-colors p-1.5 hover:bg-orange-100 rounded-lg">
               <Menu className="w-6 h-6" />
             </button>
             <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-orange-200 bg-white">
                   <Image src="/ai.jpg" alt="Logo" fill className="object-cover" />
                </div>
                <h2 className="text-xl font-extrabold text-orange-900 tracking-tight">Madlen AI</h2>
             </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-stone-400 hover:text-orange-600"><X className="w-6 h-6" /></button>
        </div>

        {/* New Chat */}
        <div className="p-4 w-72">
          <button 
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-100 active:scale-95 group font-medium"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span>Yeni Sohbet</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 w-72 scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent">
          {realHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-stone-400 text-sm p-4">
              <MessageSquare className="w-8 h-8 mb-2 opacity-30 text-orange-300" />
              <p>Henüz sohbet yok.</p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold text-orange-900/40 uppercase tracking-widest mb-3 px-4 mt-4">Geçmiş</p>
              {realHistory.map((chat) => (
                <div key={chat.id} className="group relative">
                    {editingChatId === chat.id ? (
                        // EDIT MODE
                        <div className="flex items-center px-2 py-1.5 bg-white border border-orange-300 rounded-lg shadow-sm mx-2">
                            <input 
                                autoFocus
                                value={editTitleInput}
                                onChange={(e) => setEditTitleInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveTitle(chat.id)}
                                onBlur={() => saveTitle(chat.id)}
                                className="w-full text-sm text-stone-800 bg-transparent outline-none"
                            />
                            <button onMouseDown={(e) => { e.preventDefault(); saveTitle(chat.id); }} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check className="w-4 h-4"/></button>
                        </div>
                    ) : (
                        // CHAT ITEM
                        <button
                        onClick={() => { router.push(`/?chatId=${chat.id}`); if(window.innerWidth<768) setMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-sm rounded-xl transition-all flex items-center justify-between group-hover:bg-white ${
                            chatId === chat.id 
                            ? 'bg-white text-orange-700 font-semibold shadow-sm border border-orange-100' 
                            : 'text-stone-600 hover:text-stone-900 hover:shadow-sm'
                        }`}
                        >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <MessageSquare className={`w-4 h-4 shrink-0 ${chatId === chat.id ? 'text-orange-500' : 'text-stone-400 group-hover:text-orange-400'} transition-colors`} />
                            <span className="truncate max-w-[120px]">{chat.title || 'Sohbet'}</span>
                        </div>
                        
                        {/* Edit & Delete Buttons (Hover) */}
                        <div className="hidden group-hover:flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-lg p-0.5 shadow-sm border border-stone-100 absolute right-2">
                            <div onClick={(e) => startEditing(chat, e)} className="p-1.5 hover:bg-orange-50 rounded text-stone-400 hover:text-orange-600 transition-colors cursor-pointer" title="Düzenle">
                                <Pencil className="w-3.5 h-3.5" />
                            </div>
                            <div onClick={(e) => deleteChat(chat.id, e)} className="p-1.5 hover:bg-red-50 rounded text-stone-400 hover:text-red-600 transition-colors cursor-pointer" title="Sil">
                                <Trash2 className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        </button>
                    )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#FBEAD4] bg-[#FFFBF6] shrink-0 w-72">
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-orange-200">U</div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-stone-700">Madlen Kullanıcı</span>
              <span className="text-[10px] text-orange-600 font-medium">Case Study Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN AREA --- */}
      <main className="flex-1 flex flex-col h-full relative min-w-0 bg-[#fffcf7] transition-all duration-300">
        
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-orange-100/50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between sticky top-0 z-10 gap-4 shadow-[0_4px_20px_-12px_rgba(255,100,0,0.05)]">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {!sidebarOpen && (
              <button onClick={toggleSidebar} className="p-2 hover:bg-orange-50 rounded-xl text-stone-500 hover:text-orange-600 transition-all hidden md:block">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <button onClick={toggleSidebar} className="p-2 hover:bg-orange-50 rounded-xl text-stone-500 hover:text-orange-600 transition-all md:hidden">
                <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-stone-800 truncate max-w-[200px]">
              {realHistory.find(h => h.id === chatId)?.title || 'Yeni Sohbet'}
            </h1>
          </div>
          
          <div className="relative w-full sm:w-auto min-w-[260px]">
            <select 
              value={model} 
              onChange={(e) => handleModelChange(e.target.value)}
              className="appearance-none w-full pl-4 pr-10 py-2.5 bg-white border border-orange-100 rounded-xl text-xs font-bold text-stone-700 outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 hover:border-orange-300 transition-all cursor-pointer shadow-sm"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} • {m.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-8">
            {messages.length === 0 && (
               <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 opacity-0 animate-in fade-in zoom-in duration-700">
                 <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-orange-100 border border-orange-50 relative overflow-hidden ring-1 ring-orange-100">
                    <Image src="/ai.jpg" alt="Logo" fill className="object-cover p-3" />
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-3xl font-extrabold text-stone-800 tracking-tight">Merhaba!</h3>
                   <p className="text-stone-500 text-sm max-w-md mx-auto leading-relaxed">
                     Şu an <span className="font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">{currentModelObj?.name}</span> modelindesiniz.
                     {canUploadImage ? <br/> : null}
                     {canUploadImage ? "Resim yükleyebilir veya bir şeyler sorabilirsiniz." : "Kodlama veya metin işlerinde yardımcı olabilirim."}
                   </p>
                 </div>
               </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-5 ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                {m.role === 'assistant' && (
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm mt-1 shrink-0 overflow-hidden border ${m.content.includes('⚠️') ? 'bg-red-50 border-red-200' : 'bg-white border-orange-100'}`}>
                    {m.content.includes('⚠️') ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Image src="/ai.jpg" alt="AI" width={40} height={40} className="p-1" />}
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-6 py-4 shadow-sm text-[15px] leading-7 ${
                  m.role === 'user' 
                    ? 'bg-orange-500 text-white rounded-br-none shadow-orange-200' 
                    : m.content.includes('⚠️') 
                      ? 'bg-red-50 text-red-800 rounded-bl-none border border-red-100' 
                      : 'bg-white text-stone-700 rounded-bl-none border border-orange-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]'
                }`}>
                   <MessageContent content={m.content} />
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start gap-5">
                 <div className="w-10 h-10 rounded-2xl bg-white border border-orange-100 flex items-center justify-center shadow-sm mt-1 shrink-0 overflow-hidden p-1">
                    <Image src="/ai.jpg" alt="AI" width={32} height={32} className="animate-pulse opacity-60" />
                 </div>
                 <div className="bg-white border border-orange-100 px-6 py-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 h-14">
                    <span className="w-2.5 h-2.5 bg-orange-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce"></span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 shrink-0 bg-gradient-to-t from-white via-white/80 to-transparent">
          <div className="max-w-3xl mx-auto">
            {selectedImage && (
              <div className="mb-4 relative inline-block animate-in zoom-in duration-200 group">
                <img src={selectedImage} alt="Preview" className="h-24 w-auto rounded-2xl border-2 border-white shadow-xl ring-1 ring-orange-100" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 bg-stone-800 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-md hover:bg-red-500 transition-colors border-2 border-white">×</button>
              </div>
            )}

            <div className="relative flex items-end gap-3 bg-white border border-orange-200 rounded-[1.5rem] p-2.5 shadow-[0_8px_30px_rgba(251,146,60,0.08)] focus-within:ring-4 focus-within:ring-orange-100 focus-within:border-orange-400 transition-all">
              {canUploadImage && (
                <label className="p-3 text-orange-300 hover:text-orange-600 hover:bg-orange-50 rounded-2xl cursor-pointer transition-all shrink-0" title="Görsel Yükle">
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  <ImageIcon className="w-6 h-6" />
                </label>
              )} 
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()} 
                placeholder={canUploadImage ? "Bir resim yükleyin veya soru sorun..." : "Madlen AI'a bir şeyler sorun..."} 
                disabled={isLoading} 
                className="flex-1 py-3.5 bg-transparent border-none outline-none text-stone-800 placeholder:text-stone-400 resize-none min-w-0 font-medium px-2" 
              />
              <button 
                onClick={handleSend} 
                disabled={(!input.trim() && !selectedImage) || isLoading} 
                className="p-3.5 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 disabled:opacity-50 disabled:bg-stone-100 disabled:text-stone-300 transition-all shrink-0 shadow-lg shadow-orange-200 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-[10px] text-orange-900/30 mt-4 font-bold tracking-widest uppercase">
              Madlen AI hata yapabilir. Lütfen kritik görevlerde dikkatli olun.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-orange-500 bg-[#fffcf7] font-bold tracking-tight">Madlen AI Yükleniyor...</div>}>
      <ChatInterface />
    </Suspense>
  );
}