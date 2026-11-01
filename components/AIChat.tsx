
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Chat, GenerateContentResponse } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import Webcam from 'react-webcam';
import { LogEntry, UserProfile, ChatMessage, AIIdentity, ChatSession } from '../types';
import { createHealthChat, transcribeAudio, searchGrounding, generateChatTitle, hasApiKey } from '../services/geminiService';

interface AIChatProps {
  logs: LogEntry[];
  userProfile: UserProfile;
  identity: AIIdentity | null;
  onBack: () => void;
  onOpenApiKeyModal?: () => void;
}

interface Attachment {
  file: File;
  preview: string;
  type: 'image' | 'document' | 'video';
}

const SUGGESTED_PROMPTS = [
  "Analyze my sleep patterns",
  "Why do I feel tired today?",
  "Search for latest migraine treatments",
];

const dataURLtoFile = (dataurl: string, filename: string) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

const AIChat: React.FC<AIChatProps> = ({ logs, userProfile, identity, onBack }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isPrepMode, setIsPrepMode] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const savedSessions = localStorage.getItem('hyprova_chat_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) {
        loadSession(parsed[0].id, parsed);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      if (!input) {
        textareaRef.current.style.height = '40px';
      } else {
        textareaRef.current.style.height = '40px';
        const scrollH = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 40), 120)}px`;
      }
    }
  }, [input]);

  const saveSessionsToStorage = (updatedSessions: ChatSession[]) => {
    localStorage.setItem('hyprova_chat_sessions', JSON.stringify(updatedSessions));
    setSessions(updatedSessions);
  };

  const createNewSession = () => {
    const newId = Date.now().toString();
    const greeting = `Hi ${userProfile.name}! ||| How can I help you today?`;
    const parts = greeting.split('|||').map(t => t.trim());
    
    const initialMsgs: ChatMessage[] = parts.map((text, i) => ({
       id: `init_${i}`,
       role: 'model',
       text,
       timestamp: Date.now() + i
    }));

    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
      messages: initialMsgs,
      lastModified: Date.now()
    };

    const updatedSessions = [newSession, ...sessions];
    saveSessionsToStorage(updatedSessions);
    loadSession(newId, updatedSessions);
    setSidebarOpen(false);
  };

  const loadSession = (id: string, sessionList = sessions) => {
    const session = sessionList.find(s => s.id === id);
    if (!session) return;

    setActiveSessionId(id);
    setMessages(session.messages);
    setIsPrepMode(false); 

    const history = session.messages
        .filter(m => !m.id.startsWith('init'))
        .map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

    if (hasApiKey()) {
      try {
        const chat = createHealthChat(logs, userProfile, history);
        setChatSession(chat);
      } catch (err) {
        console.error("Chat init error:", err);
      }
    } else {
      setChatSession(null);
    }
    setSidebarOpen(false);
  };

  const updateActiveSession = (newMessages: ChatMessage[], titleUpdate?: string) => {
    if (!activeSessionId) return;

    const updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: newMessages,
          title: titleUpdate || s.title,
          lastModified: Date.now()
        };
      }
      return s;
    });

    updatedSessions.sort((a, b) => b.lastModified - a.lastModified);
    setSessions(updatedSessions);
    saveSessionsToStorage(updatedSessions);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    saveSessionsToStorage(filtered);
    if (id === activeSessionId) {
      if (filtered.length > 0) loadSession(filtered[0].id, filtered);
      else createNewSession();
    }
  };

  const handleSend = async (text: string = input, file: File | null = attachment?.file || null, isHidden: boolean = false) => {
    if (!text.trim() && !file) return;

    if (!hasApiKey()) {
      if (onOpenApiKeyModal) {
        onOpenApiKeyModal();
      }
      return;
    }

    let activeChat = chatSession;
    if (!activeChat) {
      try {
        const history = messages
          .filter(m => !m.id.startsWith('init'))
          .map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          }));
        activeChat = createHealthChat(logs, userProfile, history);
        setChatSession(activeChat);
      } catch (e) {
        console.error("Failed to initialize chat:", e);
        return;
      }
    }
    if (!activeChat) return;
    
    let attachmentData: any;
    let base64Data: string | undefined;
    let mimeType: string | undefined;

    if (file) {
      mimeType = file.type;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      attachmentData = { type: file.type.startsWith('image') ? 'image' : 'document', url: dataUrl };
      base64Data = dataUrl.split(',')[1];
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now(),
      attachment: attachmentData,
      isHidden: isHidden
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    
    // Only clear input if not a hidden system prompt
    if (!isHidden) {
        setInput('');
        setAttachment(null);
    }
    
    setIsTyping(true);

    try {
      let content: any = text;
      if (base64Data && mimeType) {
        content = [
          { inlineData: { mimeType, data: base64Data } },
          { text: text || "Analyze this." }
        ];
      }

      const result = await activeChat.sendMessageStream({ message: content });
      let fullText = "";
      let aiMsgs: ChatMessage[] = [];
      let groundingChunks: any[] = [];

      for await (const chunk of result) {
        const responseChunk = chunk as GenerateContentResponse;
        fullText += responseChunk.text;
        
        const metadata = responseChunk.candidates?.[0]?.groundingMetadata;
        if (metadata?.groundingChunks) {
            groundingChunks.push(...metadata.groundingChunks);
        }

        const parts = fullText.split('|||').map(p => p.trim()).filter(p => p);
        aiMsgs = parts.map((p, i) => ({
            id: `streaming_${i}`,
            role: 'model',
            text: p,
            timestamp: Date.now()
        }));
        setMessages([...updatedMessages, ...aiMsgs]);
      }

      const uniqueChunks = groundingChunks.length > 0 
        ? Array.from(new Map(groundingChunks.map(c => [c.web?.uri, c])).values())
        : undefined;

      const finalAiMsgs = aiMsgs.map((m, i) => ({ 
          ...m, 
          id: `${Date.now()}_${i}`,
          groundingChunks: i === aiMsgs.length - 1 ? uniqueChunks : undefined
      }));

      const finalHistory = [...updatedMessages, ...finalAiMsgs];
      setMessages(finalHistory);
      updateActiveSession(finalHistory);
      
      if (sessions.find(s => s.id === activeSessionId)?.title === 'New Chat') {
        const newTitle = await generateChatTitle(finalHistory);
        updateActiveSession(finalHistory, newTitle);
      }
    } catch (error) {
      console.error("Chat Error", error);
    } finally {
      setIsTyping(false);
    }
  };

  const togglePrepMode = () => {
    const nextMode = !isPrepMode;
    setIsPrepMode(nextMode);
    
    if (nextMode) {
        handleSend(
            "Instructions: I have activated 'Dr. Prep Mode'. You must act as a medical preparation assistant. Please immediately respond with exactly this text: 'I see you have a doctor's appointment coming up. Should I create questions you could ask him based on your logs?'. Do not add anything else.", 
            null, 
            true
        );
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const text = await transcribeAudio(base64, mimeType);
          if (text) handleSend(text);
        };
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) { console.error(e); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-500 overflow-hidden font-sans">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#111827] border-r border-slate-100 dark:border-white/5 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col shadow-2xl md:shadow-none`}>
         <div className="p-6 border-b border-slate-50 dark:border-white/5 flex justify-between items-center shrink-0">
            <h2 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-widest">History</h2>
            <button onClick={createNewSession} className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-100 transition-colors text-lg">＋</button>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {sessions.map(session => (
               <div key={session.id} onClick={() => loadSession(session.id)} className={`group p-4 rounded-2xl cursor-pointer transition-all border relative flex justify-between items-center ${activeSessionId === session.id ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className={`font-bold text-xs truncate ${activeSessionId === session.id ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{session.title}</h3>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">{session.messages[session.messages.length - 1]?.text}</p>
                  </div>
                  <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 transition-all rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
               </div>
            ))}
         </div>
         <div className="p-4 border-t border-slate-100 dark:border-white/5">
            <button onClick={onBack} className="w-full py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center gap-2 group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Dashboard
            </button>
         </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-[#F8FAFC] dark:bg-[#0B0F19]">
         <header className="h-18 border-b border-slate-100 dark:border-white/5 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl z-30 shrink-0 sticky top-0">
             <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-500 hover:text-indigo-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg></button>
                <div>
                    <h1 className="font-bold text-slate-900 dark:text-white text-lg leading-none">Hyprova Assistant</h1>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">AI Health Companion</span>
                </div>
             </div>
             <button id="tour-dr-prep" onClick={togglePrepMode} className={`px-4 py-2 rounded-full text-[10px] font-bold border transition-all flex items-center gap-2 ${isPrepMode ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-indigo-200'}`}>
                {isPrepMode && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                {isPrepMode ? 'Dr. Prep Active' : 'Dr. Prep Mode'}
             </button>
         </header>

         {!hasApiKey() && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shrink-0">
              <div className="flex items-center gap-2">
                <span>🔑</span>
                <span>Enter your Gemini API key to activate real-time chat with the AI Health Companion.</span>
              </div>
              {onOpenApiKeyModal && (
                <button
                  id="chat-open-api-key-btn"
                  onClick={onOpenApiKeyModal}
                  className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm shrink-0 transition-colors"
                >
                  Enter Key
                </button>
              )}
            </div>
         )}

         <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar scroll-smooth">
            {messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-white to-slate-50 dark:from-white/10 dark:to-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-4xl mb-6 shadow-xl shadow-indigo-500/5">✨</div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Hello, {userProfile.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs">I'm ready to analyze your health data. Ask me anything.</p>
                  <div className="flex flex-wrap justify-center gap-3 max-w-md">
                     {SUGGESTED_PROMPTS.map(p => (
                       <button key={p} onClick={() => handleSend(p)} className="px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10 transition-all">{p}</button>
                     ))}
                  </div>
               </div>
            ) : (
               <div className="max-w-3xl mx-auto w-full space-y-2 pb-2">
                 {messages.map((msg, idx) => {
                    if (msg.isHidden) return null;
                    const isModel = msg.role === 'model';
                    const prevMsg = messages[idx - 1];
                    const isSameSender = prevMsg && prevMsg.role === msg.role && !prevMsg.isHidden;
                    
                    return (
                        <div key={msg.id} className={`flex w-full ${isModel ? 'justify-start' : 'justify-end'} animate-slide-up ${isSameSender ? 'mt-1' : 'mt-2.5'}`}>
                           <div className={`flex flex-col ${isModel ? 'items-start' : 'items-end'} max-w-[85%] md:max-w-[75%]`}>
                              <div className={`px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                                  isModel 
                                  ? 'bg-white dark:bg-[#161E2E] text-slate-700 dark:text-slate-200 rounded-[24px] rounded-tl-none border border-slate-100 dark:border-white/5' 
                                  : 'bg-indigo-600 text-white rounded-[24px] rounded-tr-none shadow-indigo-500/20'
                              }`}>
                                 {msg.attachment?.url && <img src={msg.attachment.url} alt="Attach" className="mb-3 rounded-2xl max-w-full h-auto max-h-48 object-cover border border-black/5" />}
                                 <div className="prose prose-sm dark:prose-invert max-w-none prose-p:mb-0 prose-headings:text-sm prose-headings:font-bold">
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                 </div>
                                 {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                                     <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 flex flex-wrap gap-2">
                                         {msg.groundingChunks.map((chunk, i) => (
                                             chunk.web?.uri && (
                                                 <a 
                                                     key={i} 
                                                     href={chunk.web.uri} 
                                                     target="_blank" 
                                                     rel="noopener noreferrer"
                                                     className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-black/20 rounded-lg text-[10px] font-bold opacity-80 hover:opacity-100 transition-opacity text-slate-600 dark:text-slate-400"
                                                 >
                                                     <span>🔗</span>
                                                     <span className="truncate max-w-[150px]">{chunk.web.title || "Source"}</span>
                                                 </a>
                                             )
                                         ))}
                                     </div>
                                 )}
                              </div>
                              <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 mt-1.5 px-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           </div>
                        </div>
                    );
                 })}
                 {isTyping && (
                    <div className="flex justify-start animate-fade-in">
                       <div className="bg-white dark:bg-[#161E2E] px-4 py-3 rounded-[24px] rounded-tl-none border border-slate-100 dark:border-white/5 flex gap-1 items-center shadow-sm">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                       </div>
                    </div>
                 )}
                 <div ref={messagesEndRef} />
               </div>
            )}
         </div>

         <div className="p-2.5 md:p-3 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-xl border-t border-slate-100 dark:border-white/5 z-20 shrink-0 sticky bottom-0">
            <div className="max-w-3xl mx-auto w-full relative">
              {attachment && (
                <div className="mb-2 relative inline-block animate-slide-up">
                  <div className="relative group">
                    <img src={attachment.preview} className="h-16 w-16 object-cover rounded-xl border-2 border-white shadow-md" />
                    <button onClick={() => setAttachment(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-md hover:scale-110 transition-transform">✕</button>
                  </div>
                </div>
              )}
              <div id="tour-chat-input" className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 rounded-[22px] px-2 py-1 border border-transparent focus-within:border-indigo-500/30 focus-within:bg-white dark:focus-within:bg-[#111827] focus-within:shadow-md transition-all">
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => setShowCamera(true)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors rounded-full hover:bg-slate-200/50 dark:hover:bg-white/5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg></button>
                  <label className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer rounded-full hover:bg-slate-200/50 dark:hover:bg-white/5"><input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => setAttachment({ file, preview: ev.target?.result as string, type: 'image' }); reader.readAsDataURL(file); } }} /><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg></label>
                </div>
                <textarea 
                  ref={textareaRef} 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
                  placeholder="Message Assistant..." 
                  className="flex-1 min-w-0 bg-transparent border-none outline-none px-2 py-2 resize-none text-slate-800 dark:text-white placeholder-slate-400 text-sm font-medium leading-normal max-h-32 h-[40px] custom-scrollbar" 
                  rows={1} 
                />
                <div className="shrink-0 p-0.5">
                  {input.trim() || attachment ? (
                     <button onClick={() => handleSend()} className="w-8 h-8 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all flex items-center justify-center shadow-md shadow-indigo-500/30 active:scale-95">
                        <svg className="w-3.5 h-3.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                     </button>
                  ) : (
                     <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-md scale-110' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
                  )}
                </div>
              </div>
            </div>
         </div>

         {showCamera && (
            <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
               <div className="flex-1 relative">
                  <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="absolute inset-0 w-full h-full object-cover" videoConstraints={{ facingMode: "environment" }} />
                  <button onClick={() => setShowCamera(false)} className="absolute top-6 right-6 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md hover:bg-black/70 transition-colors">✕</button>
               </div>
               <div className="p-8 bg-black flex justify-center pb-12">
                  <button onClick={() => { const image = webcamRef.current?.getScreenshot(); if (image) { const file = dataURLtoFile(image, 'camera.jpg'); setAttachment({ file, preview: image, type: 'image' }); setShowCamera(false); } }} className="w-20 h-20 rounded-full border-[6px] border-white/30 flex items-center justify-center active:scale-90 transition-transform"><div className="w-16 h-16 bg-white rounded-full shadow-inner"></div></button>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default AIChat;
