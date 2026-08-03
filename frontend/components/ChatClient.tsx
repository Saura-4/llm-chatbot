"use client";
import { FormEvent, useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ApiError, ApiStatus, Conversation, ConversationDetail, Message, api, clearToken, getToken, streamChat } from "../lib/api";
import { Plus, MessageSquare, Pencil, Trash2, LogOut, Send, Bot, User, Loader2, PanelLeft, Copy, Check } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type ViewMessage = Message & { pending?: boolean; failed?: boolean };
const displayTitle = (item: Conversation) => item.title || "New Conversation";

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const isBlock = match || String(children).includes('\n');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isBlock) {
    return <code className="bg-black/30 rounded px-1.5 py-0.5 text-primary-300 font-mono text-xs" {...props}>{children}</code>;
  }

  const language = match ? match[1] : 'text';

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10">
      <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-white/5">
        <span className="text-xs font-medium text-white/50 lowercase">{language}</span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors flex items-center gap-1.5"
          title="Copy code"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span className="text-xs">{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, padding: '1rem', background: 'rgba(0,0,0,0.4)', fontSize: '0.875rem' }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
};

export default function ChatClient() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [active, setActive] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ViewMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [status, setStatus] = useState<ApiStatus>("idle");
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState<number | null>(null);
  const [renameModal, setRenameModal] = useState<Conversation | null>(null);
  const [renameText, setRenameText] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const logout = () => { clearToken(); window.location.assign("/login"); };
  const handleError = (e: unknown) => { 
    const message = e instanceof ApiError ? e.message : "Something went wrong."; 
    if (e instanceof ApiError && e.status === 401) return logout(); 
    setError(message); 
  };
  
  const select = async (id: number) => { 
    setError(""); 
    try { 
      const detail = await api.conversation(id); 
      setActive(detail); 
      setMessages(detail.messages); 
    } catch (e) { handleError(e); } 
  };
  
  const refreshItems = async () => { 
    const list = await api.conversations(setStatus); 
    setItems(list); 
    return list; 
  };
  
  useEffect(() => { 
    if (!getToken()) return logout(); 
    (async () => { 
      try { 
        await api.me(setStatus); 
        const list = await refreshItems(); 
        if (list[0]) await select(list[0].id); 
      } catch (e) { handleError(e); } 
      finally { setLoading(false); setStatus("idle"); } 
    })(); 
  }, []);
  
  const create = async () => { 
    try { 
      const item = await api.createConversation(); 
      setItems(current => [item, ...current]); 
      setActive({ ...item, messages: [] }); 
      setMessages([]); 
      return item; 
    } catch (e) { handleError(e); return null; } 
  };
  
  const openDeleteModal = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal(id);
  };

  const confirmDelete = async (id: number) => {
    setDeleteModal(null);
    try { 
      await api.deleteConversation(id); 
      const remaining = items.filter(x => x.id !== id); 
      setItems(remaining); 
      if (active?.id === id) { 
        setActive(null); 
        setMessages([]); 
        if (remaining[0]) await select(remaining[0].id); 
      } 
    } catch (err) { handleError(err); } 
  };
  
  const openRenameModal = (item: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameText(displayTitle(item));
    setRenameModal(item);
  };

  const confirmRename = async (item: Conversation, newTitle: string) => {
    setRenameModal(null);
    const title = newTitle.trim();
    if (!title || title === displayTitle(item)) return; 
    try { 
      const updated = await api.renameConversation(item.id, title); 
      setItems(current => current.map(x => x.id === updated.id ? updated : x)); 
      if (active?.id === updated.id) setActive(current => current ? { ...current, ...updated } : current); 
    } catch (err) { handleError(err); } 
  };
  
  const handleSend = async () => {
    const content = text.trim(); 
    if (!content || sending) return; 
    setError(""); 
    let target = active; 
    if (!target) { 
      const created = await create(); 
      if (!created) return; 
      target = { ...created, messages: [] }; 
    } 
    const now = new Date().toISOString(), id = Date.now(); 
    const user: ViewMessage = { id: -id, role: "user", content, created_at: now, pending: true }; 
    const assistant: ViewMessage = { id: -id - 1, role: "assistant", content: "", created_at: now, pending: true }; 
    setText(""); 
    setMessages(current => [...current, user, assistant]); 
    setSending(true);
    
    try { 
      await streamChat(target.id, content, { 
        onContent: part => setMessages(current => current.map(x => x.id === assistant.id ? { ...x, content: x.content + part } : x)), 
        onError: message => { 
          setMessages(current => current.map(x => x.id === assistant.id ? { ...x, content: message, failed: true, pending: false } : x)); 
          setError("Generation failed. Your message was saved, but the assistant could not respond."); 
        }, 
        onDone: async () => { 
          const detail = await api.conversation(target!.id); 
          setActive(detail); 
          setMessages(detail.messages); 
          await refreshItems(); 
        } 
      }); 
    } catch (e) { 
      setMessages(current => current.filter(x => x.id !== assistant.id).map(x => x.id === user.id ? { ...x, pending: false } : x)); 
      handleError(e); 
    } finally { 
      setSending(false); 
    }
  };

  const sendForm = async (event: FormEvent) => { 
    event.preventDefault(); 
    await handleSend();
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse-glow">
          <Bot size={48} className="text-primary" />
          <p className="text-sm">{status === "waking" ? "Waking up the server..." : "Loading your conversations..."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-background overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none"></div>
      
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`absolute lg:relative z-30 flex shrink-0 flex-col glass-dark h-full border-r border-white/5 transition-all duration-300 ${
        sidebarOpen 
          ? "w-72 translate-x-0" 
          : "w-72 -translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0 lg:opacity-0 lg:overflow-hidden"
      }`}>
        <div className="w-72 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <button 
            onClick={() => void create()} 
            className="flex w-full items-center gap-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 p-3 text-sm font-medium transition-colors ring-1 ring-primary/20"
          >
            <Plus size={18} />
            <span>New conversation</span>
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {items.map(item => (
            <div 
              key={item.id} 
              onClick={() => void select(item.id)}
              className={`group flex items-center justify-between rounded-lg p-2 cursor-pointer transition-all duration-200 ${
                active?.id === item.id 
                  ? "bg-white/10 text-white shadow-inner" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <MessageSquare size={16} className={`shrink-0 ${active?.id === item.id ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"}`} />
                <span className="truncate text-sm font-medium">{displayTitle(item)}</span>
              </div>
              <div className={`flex items-center gap-1 shrink-0 ml-2 transition-opacity ${active?.id === item.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                <button 
                  aria-label="Rename" 
                  onClick={(e) => openRenameModal(item, e)} 
                  className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                  title="Rename"
                >
                  <Pencil size={14} />
                </button>
                <button 
                  aria-label="Delete" 
                  onClick={(e) => openDeleteModal(item.id, e)} 
                  className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <button 
            onClick={logout} 
            className="flex w-full items-center gap-3 rounded-lg p-3 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className="relative z-10 flex min-w-0 flex-1 flex-col h-full">
        <header className="flex shrink-0 h-16 items-center border-b border-white/5 bg-background/50 backdrop-blur-md px-6 gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-1.5 -ml-2 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white transition-colors" 
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <PanelLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-foreground truncate">
            {active ? displayTitle(active) : "New conversation"}
          </h1>
        </header>
        
        {status === "waking" && (
          <div className="bg-primary/10 px-5 py-2 text-center text-sm text-primary flex items-center justify-center gap-2 border-b border-primary/20">
            <Loader2 size={14} className="animate-spin" />
            Waking up the server...
          </div>
        )}
        
        {error && (
          <div role="alert" className="mx-auto mt-4 w-[min(48rem,calc(100%-2rem))] rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2 animate-fade-in-up">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar w-full">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
          {messages.length === 0 && (
            <div className="m-auto flex flex-col items-center gap-4 text-center opacity-50 animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Bot size={32} />
              </div>
              <p className="text-lg font-medium text-foreground">How can I help you today?</p>
              <p className="text-sm text-muted-foreground">Send a message to start the conversation.</p>
            </div>
          )}
          
          {messages.map((message, idx) => (
            <div 
              key={message.id} 
              className={`flex w-full gap-4 animate-fade-in-up ${message.role === "user" ? "flex-row-reverse" : ""}`}
              style={{ animationDelay: `${Math.min(idx * 50, 500)}ms` }}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${message.role === "user" ? "bg-primary/20 ring-primary/30 text-primary" : "bg-secondary ring-white/10 text-foreground"}`}>
                {message.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`flex flex-col flex-1 min-w-0 ${message.role === "user" ? "items-end" : "items-start"}`}>
                <span className={`text-xs font-medium text-muted-foreground mb-1 ${message.role === "user" ? "mr-1" : "ml-1"}`}>
                  {message.role === "user" ? "You" : "Assistant"}
                </span>
                
                <article 
                  className={`inline-block max-w-[85%] px-5 py-3.5 text-sm leading-relaxed ${
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground shadow-[0_4px_14px_0_rgba(139,92,246,0.25)] rounded-2xl rounded-tr-sm" 
                      : message.failed 
                        ? "bg-destructive/20 text-destructive border border-destructive/30 rounded-2xl rounded-tl-sm" 
                        : "glass-panel text-foreground rounded-2xl rounded-tl-sm prose prose-invert max-w-none"
                  }`}
                >
                  {message.content ? (
                    message.role === "assistant" ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({node, ...props}) => <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />,
                          pre: ({ children }) => <>{children}</>,
                          code: CodeBlock,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-lg font-semibold mt-4 mb-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-md font-semibold mt-3 mb-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-medium mt-2 mb-1" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground my-2" {...props} />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      message.content
                    )
                  ) : (
                    message.pending ? (
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    ) : ""
                  )}
                </article>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
        
        <div className="p-4 bg-gradient-to-t from-background via-background/90 to-transparent pt-10">
          <form 
            onSubmit={sendForm} 
            className="mx-auto flex max-w-4xl gap-3 relative animate-fade-in-up"
          >
            <div className="relative flex-1 group">
              <textarea 
                value={text} 
                onChange={e => setText(e.target.value)} 
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={sending} 
                rows={1} 
                placeholder="Ask me anything..." 
                className="block w-full resize-none rounded-full border border-white/10 bg-white/5 backdrop-blur-md py-4 pl-6 pr-14 text-sm text-foreground placeholder:text-muted-foreground shadow-lg transition-all focus:border-primary/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50" 
              />
            </div>
            
            <button 
              disabled={sending || !text.trim()} 
              className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(139,92,246,0.4)]"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="-ml-0.5" />}
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-muted-foreground">AI can make mistakes. Consider verifying important information.</span>
          </div>
        </div>
      </section>

      {/* Delete Modal */}
      {deleteModal !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteModal(null)}>
          <div className="glass-dark w-full max-w-sm rounded-xl p-6 shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Delete Conversation</h3>
            <p className="mt-2 text-sm text-muted-foreground">Are you sure you want to delete this conversation? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDeleteModal(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={() => confirmDelete(deleteModal)} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setRenameModal(null)}>
          <div className="glass-dark w-full max-w-sm rounded-xl p-6 shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Rename Conversation</h3>
            <input 
              autoFocus
              value={renameText}
              onChange={e => setRenameText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmRename(renameModal, renameText);
                if (e.key === 'Escape') setRenameModal(null);
              }}
              className="mt-4 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setRenameModal(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={() => confirmRename(renameModal, renameText)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
