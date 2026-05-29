import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Loader2, ArrowRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: { web?: { uri: string; title: string } }[];
}

interface ChatAssistantProps {
  watchlistSymbols: string[];
}

export default function ChatAssistant({ watchlistSymbols }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your AI Market Analyst. I am fully synced with your dashboard. Ask me anything about market shifts, macro technical levels, or how the companies in your watchlist might behave!"
    }
  ]);
  const [inputVal, setInputVal] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    // Retrieve local sandbox authorization headers
    const clientKey = localStorage.getItem('g_tracker_client_key') || '';
    const adminPass = localStorage.getItem('g_tracker_passcode') || '';

    try {
      const response = await fetch('/api/stock/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': clientKey,
          'X-Admin-Passcode': adminPass
        },
        body: JSON.stringify({
          message: textToSend,
          watchlist: watchlistSymbols
        })
      });

      const resData = await response.json();
      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'assistant',
        text: resData.text || "I apologize, I met an issue retrieving advice.",
        sources: resData.sources || []
      };

      setMessages((prev) => [...prev, botMsg]);

    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          sender: 'assistant',
          text: "I was unable to establish connection with the AI Analyst server. Please ensure the dev server is fully active."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    handleSendMessage(q);
  };

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 shrink-0 text-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-900 rounded-sm flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-white fill-white/10" />
          </div>
          <div>
            <h4 className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Terminal Advisor</h4>
            <h3 className="font-semibold text-sm text-slate-905 flex items-center gap-1">
              AI Market Analyst
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-150 px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Search
        </div>
      </div>

      {/* Main Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-sm bg-slate-900 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Bot size={13} />
                </div>
              )}

              <div className="flex flex-col max-w-[85%]">
                <div
                  className={`text-xs p-3.5 rounded-lg leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-slate-800 shadow-xs'
                  }`}
                >
                  {m.text}

                  {/* Grounding URL display */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-150 text-[10px] space-y-1.5">
                      <span className="font-bold block text-gray-400 uppercase tracking-wider">
                        Grounding Citations:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {m.sources.map((chunk, index) => {
                          if (chunk.web?.uri) {
                            return (
                              <a
                                key={index}
                                href={chunk.web.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block bg-gray-100 text-slate-705 font-semibold px-2 py-0.5 rounded-sm border border-gray-200 truncate max-w-[140px] hover:bg-gray-200 transition-colors"
                                title={chunk.web.title || chunk.web.uri}
                              >
                                {chunk.web.title || `Source [${index + 1}]`}
                              </a>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-sm bg-gray-200 flex items-center justify-center text-slate-800 font-bold text-[10px] shrink-0 mt-0.5">
                  <User size={13} />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-sm bg-slate-900 flex items-center justify-center text-white shrink-0 mt-0.5 animate-pulse">
              <Bot size={13} />
            </div>
            <div className="bg-white border border-gray-200 px-3.5 py-3 rounded-lg text-xs flex items-center gap-2 text-gray-500">
              <Loader2 size={13} className="animate-spin text-slate-900" />
              Checking live market indexes & indices...
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Recommended prompts */}
      {messages.length === 1 && (
        <div className="p-3 bg-gray-50 border-t border-gray-150 shrink-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Suggested Queries</span>
          <div className="space-y-1.5">
            <button
              onClick={() => handleQuickQuestion('How does NASDAQ tech index look today?')}
              className="w-full text-left bg-white border border-gray-200 text-slate-700 hover:border-slate-400 p-2.5 rounded-lg text-[11px] flex justify-between items-center cursor-pointer transition-colors hover:shadow-2xs"
            >
              <span>How does NASDAQ tech index look today?</span>
              <ArrowRight size={10} className="text-gray-400" />
            </button>
            <button
              onClick={() => handleQuickQuestion('What supports the HK Heng Seng Index structure?')}
              className="w-full text-left bg-white border border-gray-200 text-slate-700 hover:border-slate-400 p-2.5 rounded-lg text-[11px] flex justify-between items-center cursor-pointer transition-colors hover:shadow-2xs"
            >
              <span>What supports the HK Heng Seng Index structure?</span>
              <ArrowRight size={10} className="text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Input container */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputVal);
        }}
        className="p-3 bg-white border-t border-gray-150 flex gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={`Query portfolio (${watchlistSymbols.length} stocks)`}
          className="flex-1 bg-white border border-gray-200 rounded-lg text-xs px-3.5 py-2.5 focus:outline-none focus:border-slate-550 text-slate-800"
        />
        <button
          type="submit"
          className="bg-slate-900 border border-slate-900 hover:bg-slate-805 text-white rounded-lg p-2.5 shrink-0 cursor-pointer transition-all active:scale-95 text-xs font-semibold"
          disabled={!inputVal.trim() || loading}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
