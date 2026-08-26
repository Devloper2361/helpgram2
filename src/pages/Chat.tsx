import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Image as ImageIcon, Check, CheckCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";

type ChatThread = {
  id: string;
  taskId: string;
  requesterId: string;
  taskerId: string;
  updatedAt: string;
  unreadCount: number;
  task: { title: string; status: string };
  requester: { id: string, profile: { fullName: string; avatarUrl: string | null } };
  tasker: { id: string, profile: { fullName: string; avatarUrl: string | null } };
  messages: ChatMessage[];
};

type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  type: "TEXT" | "IMAGE" | "SYSTEM";
  isRead: boolean;
  createdAt: string;
  sender: { id: string, profile: { fullName: string; avatarUrl: string | null } };
};

export default function ChatPage() {
    const { t } = useTranslation();
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);

  if (!user) return null;

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 10000); // Polling for unread counts
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTaskId) {
      fetchMessages(activeTaskId);
      const interval = setInterval(() => fetchMessages(activeTaskId), 5000); // Polling for new messages
      return () => clearInterval(interval);
    }
  }, [activeTaskId]);

  const fetchThreads = async () => {
    try {
      const res = await fetch("/api/chat/threads");
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads);
      }
    } catch (e) {
      console.error(e?.message || e);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (taskId: string) => {
    try {
      const res = await fetch(`/api/chat/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        
        // Mark unread messages as read
        const unreadToMe = data.messages.filter((m: ChatMessage) => m.senderId !== user.id && !m.isRead);
        for (const msg of unreadToMe) {
          await fetch(`/api/chat/messages/${msg.id}/read`, {
             method: "PUT"
          });
        }
        if (unreadToMe.length > 0) fetchThreads(); // refresh badghes
      }
    } catch (e) {
      console.error(e?.message || e);
    }
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTaskId) return;

    try {
       const res = await fetch(`/api/chat/${activeTaskId}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ content: newMessage.trim(), type: "TEXT" })
       });
       if (res.ok) {
          setNewMessage("");
          fetchMessages(activeTaskId);
          fetchThreads();
       }
    } catch (e) {
      console.error(e?.message || e);
    }
  };

  const activeThread = threads.find(t => t.taskId === activeTaskId);

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("ui.messages")}</h1>
        <p className="text-muted-foreground">{t("ui.communicate_about_your")}</p>
      </div>

      <Card className="flex-1 overflow-hidden flex border shadow-sm">
        {/* Sidebar */}
        <div className={`w-full md:w-1/3 border-r flex flex-col bg-slate-50/50 ${activeTaskId ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <div className="p-4 text-center text-sm text-slate-500">{t("ui.loading_threads")}</div>
            ) : threads.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">{t("ui.no_active_conversations")}</div>
            ) : (
              threads.map((thread) => {
                const partner = thread.requesterId === user.id ? thread.tasker : thread.requester;
                const active = activeTaskId === thread.taskId;
                return (
                  <div 
                    key={thread.id} 
                    onClick={() => setActiveTaskId(thread.taskId)}
                    className={`p-4 border-b hover:bg-slate-100 cursor-pointer flex items-center gap-3 transition-colors ${active ? 'bg-slate-100 border-l-4 border-l-blue-600' : 'bg-white'}`}
                  >
                    <Avatar>
                      <AvatarImage src={partner?.profile?.avatarUrl || ""} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">{partner?.profile?.fullName?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-sm truncate">{partner?.profile?.fullName || 'Unknown User'}</span>
                        {thread.unreadCount > 0 && (
                           <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{thread.unreadCount}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{thread.task.title}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex col-span-1 md:col-span-2 flex-col bg-white ${!activeTaskId ? 'hidden md:flex' : 'flex'}`}>
          {activeThread ? (
            <>
              <div className="h-16 border-b flex justify-between items-center px-4 gap-3 bg-white">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden -ml-2 mr-1" onClick={() => setActiveTaskId(null)}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </Button>
                  <Avatar>
                    <AvatarImage src={(activeThread.requesterId === user.id ? activeThread.tasker : activeThread.requester)?.profile?.avatarUrl || ""} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">{(activeThread.requesterId === user.id ? activeThread.tasker : activeThread.requester)?.profile?.fullName?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{(activeThread.requesterId === user.id ? activeThread.tasker : activeThread.requester)?.profile?.fullName}</p>
                    <p className="text-xs text-muted-foreground tracking-wide">{activeThread.task.title} • {activeThread.task.status}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 relative">
                {messages.map((msg) => {
                  const isMe = msg.senderId === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`border rounded-2xl p-3 max-w-[70%] text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm border-blue-600' : 'bg-white rounded-tl-sm'}`}>
                        {msg.type === "IMAGE" ? (
                           <img src={msg.content} alt="Attachment" className="max-w-full rounded-md mt-1 mb-2" referrerPolicy="no-referrer" />
                        ) : (
                           msg.content
                        )}
                        <div className={`text-[10px] mt-1 text-right flex justify-end items-center gap-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {isMe && (
                             msg.isRead ? <CheckCheck className="h-3 w-3 text-blue-300" /> : <Check className="h-3 w-3 text-blue-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endOfMessagesRef} />
              </div>

              <div className="p-4 bg-white border-t">
                <form onSubmit={handleSend} className="flex gap-2">
                  <label className="shrink-0 cursor-pointer">
                    <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !activeTaskId) return;
                      const formData = new FormData();
                      formData.append("image", file);
                      try {
                        await fetch(`/api/chat/${activeTaskId}/image`, {
                          method: "POST",
                          body: formData
                        });
                        fetchMessages(activeTaskId);
                        fetchThreads();
                      } catch (err) {
                         console.error(err?.message || err);
                      }
                      e.target.value = '';
                    }} />
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                       <ImageIcon className="h-4 w-4 text-slate-500" />
                    </div>
                  </label>
                  <Input 
                    placeholder="Type your message..." 
                    className="flex-1 bg-slate-50" 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                  />
                  <Button type="submit" size="icon" className="shrink-0" disabled={!newMessage.trim()}><Send className="h-4 w-4" /></Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-2 bg-slate-50">
              <p>{t("ui.select_a_conversation")}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
