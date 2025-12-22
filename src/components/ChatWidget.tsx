import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize Session ID
    useEffect(() => {
        let storedSession = localStorage.getItem('ia_chat_session_id');
        if (!storedSession) {
            storedSession = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('ia_chat_session_id', storedSession);
        }
        setSessionId(storedSession);
    }, []);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isSending) return;

        const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2);

        const userMsg: Message = {
            id: generateId(),
            role: 'user',
            text: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsSending(true);

        try {
            const response = await fetch('https://n8n.manusp.site/webhook/849d797e-7a0a-41df-9751-14166ad02a75', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    userMessage: userMsg.text
                })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            // Handle n8n array response or object response
            let replyText = "No he podido procesar tu respuesta.";

            if (Array.isArray(data) && data.length > 0) {
                replyText = data[0].output || data[0].reply || JSON.stringify(data[0]);
            } else if (typeof data === 'object') {
                replyText = data.output || data.reply || data.text || "Respuesta vacía";
            }

            const botMsg: Message = {
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2),
                role: 'assistant',
                text: replyText,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            console.error('Chat Error:', error);
            const errorMsg: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                text: "Lo siento, ha ocurrido un error de conexión. Inténtalo de nuevo.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            <div className={cn(
                "pointer-events-auto bg-[#1a1f3a] border border-[#2d3250] rounded-2xl shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right overflow-hidden",
                isOpen ? "opacity-100 scale-100 mb-4" : "opacity-0 scale-95 h-0 mb-0 overflow-hidden"
            )}
                style={{
                    width: 'min(90vw, 380px)',
                    height: 'min(70vh, 600px)',
                }}>
                {/* Header */}
                <div className="p-4 bg-[#2d3250]/50 backdrop-blur-sm border-b border-[#2d3250] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-[#00d4ff] to-[#00ff88] p-2 rounded-lg">
                            <Bot size={20} className="text-[#0a0e27]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[#e5e7eb] text-sm">Asistente IA</h3>
                            <p className="text-[10px] text-gray-400">Tus métricas en tiempo real</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#2d3250] scrollbar-track-transparent">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 text-sm mt-10 px-6">
                            <Bot size={48} className="mx-auto mb-4 opacity-20" />
                            <p>¡Hola! Soy tu asistente virtual. Pregúntame sobre tus leads, ventas o cualquier KPI.</p>
                        </div>
                    )}
                    {messages.map(msg => (
                        <div key={msg.id} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                            {msg.role === 'assistant' && (
                                <div className="bg-[#2d3250] p-2 rounded-full h-8 w-8 flex items-center justify-center mr-2 self-end mb-1">
                                    <Bot size={14} className="text-gray-400" />
                                </div>
                            )}
                            <div className={cn(
                                "max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed",
                                msg.role === 'user'
                                    ? "bg-[#00d4ff]/10 text-[#00d4ff] rounded-br-none border border-[#00d4ff]/20"
                                    : "bg-[#2d3250] text-[#e5e7eb] rounded-bl-none border border-[#3e4466]"
                            )}>
                                {msg.text}
                                <div className="text-[10px] opacity-50 mt-1 text-right">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            {msg.role === 'user' && (
                                <div className="bg-[#00d4ff]/20 p-2 rounded-full h-8 w-8 flex items-center justify-center ml-2 self-end mb-1">
                                    <User size={14} className="text-[#00d4ff]" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isSending && (
                        <div className="flex justify-start w-full">
                            <div className="bg-[#2d3250] p-2 rounded-full h-8 w-8 flex items-center justify-center mr-2 self-end mb-1">
                                <Bot size={14} className="text-gray-400" />
                            </div>
                            <div className="bg-[#2d3250] p-3 rounded-2xl rounded-bl-none border border-[#3e4466] flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin text-[#00d4ff]" />
                                <span className="text-xs text-gray-400">Escribiendo...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-[#2d3250] bg-[#1a1f3a]">
                    <div className="relative flex items-center gap-2">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Escribe tu consulta..."
                            className="w-full bg-[#0a0e27] text-sm text-[#e5e7eb] rounded-xl border border-[#2d3250] p-3 pr-12 focus:outline-none focus:border-[#00d4ff] resize-none scrollbar-hide"
                            rows={1}
                            style={{ minHeight: '44px', maxHeight: '120px' }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isSending}
                            className="absolute right-2 top-1.5 p-2 bg-[#00d4ff] hover:bg-[#00c2ea] text-[#0a0e27] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "pointer-events-auto p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group relative border border-[#00ff88]/50",
                    isOpen ? "bg-[#2d3250] text-gray-400 rotate-90" : "bg-gradient-to-br from-[#00d4ff] to-[#00ff88] text-[#0a0e27]"
                )}
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} fill="currentColor" />}
            </button>
        </div>
    );
}
