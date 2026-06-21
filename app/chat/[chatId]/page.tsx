"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import Link from "next/link";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
}

interface Chat {
  bookId: string;
  bookTitle: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData.uid) {
      alert("Please login first");
      router.push("/");
      return;
    }
    setUser(userData);
    fetchChat();
    subscribeToMessages();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChat = async () => {
    try {
      const chatSnap = await getDoc(doc(db, "chats", params.chatId as string));
      if (chatSnap.exists()) {
        setChat(chatSnap.data() as Chat);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const q = query(
      collection(db, "chats", params.chatId as string, "messages"),
      orderBy("createdAt", "asc")
    );
    onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(data);
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    try {
      await addDoc(
        collection(db, "chats", params.chatId as string, "messages"),
        {
          text: newMessage.trim(),
          senderId: user.uid,
          senderName: user.name,
          createdAt: serverTimestamp(),
        }
      );
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
          <p className="text-[14px] font-medium">Loading chat…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-[0_2px_8px_-2px_rgba(0,32,69,0.06)]">
        <Link
          href="/chats"
          className="flex items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">
            arrow_back
          </span>
        </Link>
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-semibold shrink-0">
          {(user?.uid === chat?.buyerId
            ? chat?.sellerName
            : chat?.buyerName
          )?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <h1 className="font-headline text-[16px] font-semibold text-primary truncate">
            {chat?.bookTitle}
          </h1>
          <p className="text-[13px] text-on-surface-variant truncate">
            {user?.uid === chat?.buyerId ? chat?.sellerName : chat?.buyerName}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-surface">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-2">
              chat_bubble
            </span>
            <p className="text-[14px]">No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs rounded-2xl px-4 py-2 shadow-sm ${
                  isMe
                    ? "bg-primary text-white rounded-br-md"
                    : "bg-surface-container-lowest border border-outline-variant/40 text-on-surface rounded-bl-md"
                }`}
              >
                {!isMe && (
                  <p className="mb-1 text-[11px] font-semibold text-secondary uppercase tracking-wide">
                    {msg.senderName}
                  </p>
                )}
                <p className="text-[14px] leading-snug">{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="flex items-center gap-2 border-t border-outline-variant bg-surface-container-lowest px-4 py-3">
        <input
          type="text"
          placeholder="Type a message…"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-secondary text-white shadow-md hover:brightness-110 active:scale-[0.96] transition-all disabled:opacity-50 disabled:active:scale-100"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </div>
    </main>
  );
}