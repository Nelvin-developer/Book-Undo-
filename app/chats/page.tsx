"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

interface Chat {
  id: string;
  bookTitle: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  lastMessage?: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // ── Active open chat (modal) ──
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData.uid) {
      alert("Please login first");
      router.push("/");
      return;
    }
    setUser(userData);
    subscribeToChats(userData.uid);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const subscribeToChats = (uid: string) => {
    const allChats: { [key: string]: Chat } = {};

    onSnapshot(
      query(collection(db, "chats"), where("buyerId", "==", uid)),
      (snap) => {
        snap.docs.forEach((d) => {
          allChats[d.id] = { id: d.id, ...d.data() } as Chat;
        });
        setChats(Object.values(allChats));
        setLoading(false);
      }
    );

    onSnapshot(
      query(collection(db, "chats"), where("sellerId", "==", uid)),
      (snap) => {
        snap.docs.forEach((d) => {
          allChats[d.id] = { id: d.id, ...d.data() } as Chat;
        });
        setChats(Object.values(allChats));
        setLoading(false);
      }
    );
  };

  const openChat = async (chatId: string) => {
    setActiveChatId(chatId);
    setChatLoading(true);
    setMessages([]);

    try {
      const chatSnap = await getDoc(doc(db, "chats", chatId));
      if (chatSnap.exists()) {
        setActiveChat({ id: chatSnap.id, ...chatSnap.data() } as Chat);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setChatLoading(false);
    }

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Message[];
      setMessages(data);
    });
  };

  const closeChat = () => {
    setActiveChatId(null);
    setActiveChat(null);
    setMessages([]);
    setNewMessage("");
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !activeChatId) return;
    try {
      await addDoc(collection(db, "chats", activeChatId, "messages"), {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.name,
        createdAt: serverTimestamp(),
      });
      setNewMessage("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-pulse text-5xl">
            forum
          </span>
          <p className="text-[14px] font-medium">Loading chats…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface relative">
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-6">
        <div className="mb-6">
          <h1 className="font-headline text-[28px] sm:text-[32px] md:text-[48px] leading-tight font-bold text-primary mb-1">
            My Chats
          </h1>
          <p className="text-[15px] md:text-[18px] text-on-surface-variant">
            Conversations with buyers and sellers.
          </p>
        </div>

        {chats.length === 0 ? (
          <div className="text-center py-16 px-6 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
              forum
            </span>
            <p className="text-on-surface-variant">No chats yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-lg">
            {chats.map((chat) => {
              const otherPerson =
                user?.uid === chat.buyerId ? chat.sellerName : chat.buyerName;
              return (
                <div
                  key={chat.id}
                  onClick={() => openChat(chat.id)}
                  className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 hover:shadow-[0_4px_20px_-2px_rgba(0,32,69,0.08)] transition-shadow cursor-pointer"
                >
                  <p className="font-semibold text-primary truncate">{otherPerson}</p>
                  <p className="text-[13px] text-on-surface-variant truncate">{chat.bookTitle}</p>
                  {chat.lastMessage && (
                    <p className="mt-1 text-[13px] text-on-surface-variant/70 truncate">
                      {chat.lastMessage}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Chat Modal Overlay ── */}
      {activeChatId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center sm:p-4">
          <div className="w-full h-full sm:h-[80vh] sm:max-w-lg bg-surface-container-lowest sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3 shrink-0">
              <div className="min-w-0">
                <h2 className="font-semibold text-[16px] text-primary truncate">
                  {activeChat?.bookTitle}
                </h2>
                <p className="text-[13px] text-on-surface-variant truncate">
                  {user?.uid === activeChat?.buyerId
                    ? activeChat?.sellerName
                    : activeChat?.buyerName}
                </p>
              </div>
              <button
                onClick={closeChat}
                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface-container-low transition-colors text-xl shrink-0"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3">
              {chatLoading ? (
                <p className="text-center text-on-surface-variant">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-on-surface-variant mt-10">
                  No messages yet. Say hello!
                </p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-xs rounded-2xl px-4 py-2 break-words ${
                          isMe
                            ? "bg-primary text-white rounded-br-md"
                            : "bg-surface-container-low text-on-surface rounded-bl-md"
                        }`}
                      >
                        {!isMe && (
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-[14px] leading-snug">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t border-outline-variant px-3 sm:px-4 py-3 shrink-0">
              <input
                type="text"
                placeholder="Type a message…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-w-0 rounded-full border border-outline-variant bg-surface px-4 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-white disabled:opacity-50 transition-all shrink-0"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}