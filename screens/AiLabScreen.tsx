
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserProfile } from '../types';
import * as gemini from '../services/geminiService';
import { api } from '../services/mockApi';

interface AiLabScreenProps {
  user: UserProfile;
}

const AiLabScreen: React.FC<AiLabScreenProps> = ({ user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const data = api.getData();
    setMessages(data.chatHistory || []);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      api.updateChatHistory(messages);
    }
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const contextHistory = messages.slice(-8).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const { text, modelName, groundingChunks } = await gemini.chatWithRudhh(
        input, 
        contextHistory, 
        user.settings.modelPreference,
        user.settings.rudhhPersonality
      );
      
      const botMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text,
        modelUsed: modelName,
        groundingChunks
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const response = await gemini.analyzeImage(base64, file.type, input || "Analyze this image.");
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'model', 
          text: response,
          media: { type: 'image', url: reader.result as string, mimeType: file.type }
        }]);
      } finally {
        setIsLoading(false);
        setInput('');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] animate-fadeIn">
      <div className="flex items-center justify-between mb-4 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center text-sm">🤖</div>
          <div>
            <span className="font-bold text-sm block">Dr. Rudhh</span>
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">
              Researching Web Data...
            </span>
          </div>
        </div>
        <button 
          onClick={() => {
            const reset = [{ id: '1', role: 'model', text: 'Data core purged. New session ready.' } as ChatMessage];
            setMessages(reset);
            api.updateChatHistory(reset);
          }}
          className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-500 hover:text-white transition-all"
        >
          Reset
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar pb-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl ${
              m.role === 'user' 
                ? 'bg-violet-600 text-white rounded-br-none shadow-lg shadow-violet-900/20' 
                : 'glass-card border-slate-700/50 rounded-bl-none'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              
              {/* Citations */}
              {m.groundingChunks && m.groundingChunks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Sources</p>
                  <div className="flex flex-col gap-1.5">
                    {m.groundingChunks.map((chunk, i) => chunk.web && (
                      <a 
                        key={i} 
                        href={chunk.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:underline truncate bg-blue-400/10 p-1 px-2 rounded border border-blue-400/20"
                      >
                        🔗 {chunk.web.title || chunk.web.uri}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {m.media && (
                <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
                  {m.media.type === 'image' && <img src={m.media.url} className="w-full" />}
                </div>
              )}
              {m.role === 'model' && (
                <div className="flex justify-between items-center mt-3">
                  <button 
                    onClick={() => gemini.speakResponse(m.text)}
                    className="text-[9px] font-bold text-violet-400 uppercase tracking-widest hover:text-violet-300"
                  >
                    🔊 Listen
                  </button>
                  {m.modelUsed && (
                    <span className="text-[8px] opacity-30 uppercase font-bold tracking-tighter">
                      Grounding: {m.modelUsed.split('-')[1]}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="glass-card p-4 rounded-3xl rounded-bl-none flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-colors"
        >
          🖼️
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Dr. Rudhh..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-3 text-sm focus:outline-none focus:border-violet-500"
        />
        <button 
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="p-3 gradient-bg rounded-2xl text-white disabled:opacity-50 shadow-lg shadow-violet-500/20"
        >
          🚀
        </button>
      </div>
    </div>
  );
};

export default AiLabScreen;
