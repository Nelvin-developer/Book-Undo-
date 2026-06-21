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
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 relative">
      <h1 className="mb-6 text-3xl font-bold">My Chats</h1>
      {chats.length === 0 ? (
        <p className="text-gray-400">No chats yet.</p>
      ) : (
        <div className="flex flex-col gap-3 max-w-lg">
          {chats.map((chat) => {
            const otherPerson =
              user?.uid === chat.buyerId ? chat.sellerName : chat.buyerName;
            return (
              <div
                key={chat.id}
                onClick={() => openChat(chat.id)}
                className="rounded-lg border p-4 hover:shadow-md transition cursor-pointer"
              >
                <p className="font-bold">{otherPerson}</p>
                <p className="text-sm text-gray-500">{chat.bookTitle}</p>
                {chat.lastMessage && (
                  <p className="mt-1 text-sm text-gray-400 truncate">
                    {chat.lastMessage}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Chat Modal Overlay ── */}
      {activeChatId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg h-[80vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="min-w-0">
                <h2 className="font-semibold text-[16px] truncate">
                  {activeChat?.bookTitle}
                </h2>
                <p className="text-[13px] text-gray-500 truncate">
                  {user?.uid === activeChat?.buyerId
                    ? activeChat?.sellerName
                    : activeChat?.buyerName}
                </p>
              </div>
              <button
                onClick={closeChat}
                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors text-xl"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {chatLoading ? (
                <p className="text-center text-gray-400">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-gray-400 mt-10">
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
                        className={`max-w-xs rounded-2xl px-4 py-2 ${
                          isMe
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-gray-100 text-gray-900 rounded-bl-md"
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
            <div className="flex items-center gap-2 border-t px-4 py-3">
              <input
                type="text"
                placeholder="Type a message…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 rounded-full border px-4 py-2 outline-none focus:border-blue-500 transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white disabled:opacity-50 transition-all"
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