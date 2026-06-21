"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  onSnapshot,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { CATEGORIES } from "../lib/constants";
import Link from "next/link";

interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  district?: string;
  category?: string;
  condition?: string;
  status?: "AVAILABLE" | "SOLD";
  imageUrl?: string;
  createdAt: any;
}

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

// Icon for each category. Falls back to "menu_book" for anything not listed
// here, so adding a new category to lib/constants.ts never breaks this page.
const CATEGORY_ICONS: Record<string, string> = {
  Novel: "menu_book",
  Engineering: "architecture",
  School: "school",
  College: "school",
  "Competitive Exam": "quiz",
  Biography: "person",
  Comics: "auto_stories",
  Science: "science",
  History: "history_edu",
  "Self Help": "psychology",
  Other: "category",
};

const DEFAULT_CATEGORY_ICON = "menu_book";

function HomeContent() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Chat dropdown state ──
  const [chatDropdownOpen, setChatDropdownOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const chatDropdownRef = useRef<HTMLDivElement>(null);

  // ── Active open chat (modal) ──
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "books"), orderBy("createdAt", "desc"), limit(8));
        const snap = await getDocs(q);
        setRecentBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Book)));
      } catch (e) {
        console.error(e);
      } finally {
        setBooksLoading(false);
      }
    })();
  }, []);

  // Subscribe to chats once user is known
  useEffect(() => {
    if (!user) return;
    const allChats: { [key: string]: Chat } = {};

    const unsub1 = onSnapshot(
      query(collection(db, "chats"), where("buyerId", "==", user.uid)),
      (snap) => {
        snap.docs.forEach((d) => {
          allChats[d.id] = { id: d.id, ...d.data() } as Chat;
        });
        setChats(Object.values(allChats));
        setChatsLoading(false);
      }
    );

    const unsub2 = onSnapshot(
      query(collection(db, "chats"), where("sellerId", "==", user.uid)),
      (snap) => {
        snap.docs.forEach((d) => {
          allChats[d.id] = { id: d.id, ...d.data() } as Chat;
        });
        setChats(Object.values(allChats));
        setChatsLoading(false);
      }
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  // ── Auto-open chat if ?openChat=<chatId> is present in URL ──
  useEffect(() => {
    if (!user) return;
    const chatIdFromUrl = searchParams.get("openChat");
    if (chatIdFromUrl) {
      openChat(chatIdFromUrl);
      // Clean the URL so refresh doesn't reopen it
      router.replace("/");
    }
  }, [user, searchParams]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (chatDropdownRef.current && !chatDropdownRef.current.contains(e.target as Node)) {
        setChatDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogin = async () => {
    if (loginLoading) return;
    try {
      setLoginLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid, name: result.user.displayName,
        email: result.user.email, photoURL: result.user.photoURL, createdAt: new Date(),
      }, { merge: true });
      localStorage.setItem("user", JSON.stringify({ uid: result.user.uid, name: result.user.displayName, email: result.user.email }));
    } catch (e) {
      console.error(e);
      alert("Login Failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => { await signOut(auth); localStorage.removeItem("user"); };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) window.location.href = `/books?search=${encodeURIComponent(search.trim())}`;
  };

  const openChat = async (chatId: string) => {
    setActiveChatId(chatId);
    setChatDropdownOpen(false);
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
        senderName: user.displayName,
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#faf9f8", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1a1c1c", overflowX: "hidden", width: "100%" }}>

      {/* ── Nav ── */}
      <header style={{ backgroundColor: "#faf9f8", borderBottom: "1px solid #c4c6cf", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="nav-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 24, color: "#002045", letterSpacing: "-0.01em" }}>Book Undo</span>
            </Link>
          </div>
          <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!authLoading && (user ? (
              <>
                <Link href="/add-book" className="list-book-btn" style={{ backgroundColor: "#904d00", color: "#fff", padding: "8px 20px", borderRadius: 9999, fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", textDecoration: "none", whiteSpace: "nowrap" }}>List a Book</Link>

                {/* ── Chat icon + dropdown ── */}
                <div ref={chatDropdownRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => setChatDropdownOpen((v) => !v)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", color: "#43474e", position: "relative" }}
                  >
                    <span className="material-symbols-outlined">chat</span>
                    {chats.length > 0 && (
                      <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#904d00" }} />
                    )}
                  </button>

                  {chatDropdownOpen && (
                    <div className="chat-dropdown" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320, maxHeight: 420, overflowY: "auto", backgroundColor: "#fff", border: "1px solid #c4c6cf", borderRadius: 16, boxShadow: "0 8px 24px rgba(0,32,69,0.12)", zIndex: 100 }}>
                      <div style={{ padding: "14px 18px", borderBottom: "1px solid #eeeeed", fontWeight: 700, fontFamily: "'Source Serif 4', serif", fontSize: 16, color: "#002045" }}>
                        My Chats
                      </div>
                      {chatsLoading ? (
                        <div style={{ padding: 20, textAlign: "center", color: "#74777f", fontSize: 14 }}>Loading…</div>
                      ) : chats.length === 0 ? (
                        <div style={{ padding: 20, textAlign: "center", color: "#74777f", fontSize: 14 }}>No chats yet.</div>
                      ) : (
                        chats.map((chat) => {
                          const otherPerson = user.uid === chat.buyerId ? chat.sellerName : chat.buyerName;
                          return (
                            <div
                              key={chat.id}
                              onClick={() => openChat(chat.id)}
                              style={{ padding: "12px 18px", cursor: "pointer", borderBottom: "1px solid #f4f3f2", transition: "background 0.15s" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f4f3f2"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                            >
                              <p style={{ fontWeight: 700, fontSize: 14, color: "#1a1c1c", margin: 0 }}>{otherPerson}</p>
                              <p style={{ fontSize: 12, color: "#74777f", margin: "2px 0 0" }}>{chat.bookTitle}</p>
                              {chat.lastMessage && (
                                <p style={{ fontSize: 12, color: "#a0a3ab", margin: "4px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {chat.lastMessage}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {user.photoURL && <Link href="/my-books"><img src={user.photoURL} alt="Profile" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #d6e3ff", cursor: "pointer" }} /></Link>}
                <button onClick={handleLogout} className="signout-btn" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#74777f", fontWeight: 500, whiteSpace: "nowrap" }}>Sign out</button>
              </>
            ) : (
              <button onClick={handleLogin} disabled={loginLoading} style={{ backgroundColor: "#904d00", color: "#fff", padding: "8px 20px", borderRadius: 9999, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", opacity: loginLoading ? 0.6 : 1, whiteSpace: "nowrap" }}>
                {loginLoading ? "Signing in…" : "Sign in with Google"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hero-section" style={{ backgroundColor: "#f4f3f2", borderBottom: "1px solid #c4c6cf", padding: "80px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: "clamp(32px,5vw,56px)", fontWeight: 700, color: "#002045", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 16 }}>
            Give Your Books a <span style={{ color: "#904d00", fontStyle: "italic" }}>New Chapter.</span>
          </h1>
          <p style={{ fontSize: 18, color: "#43474e", lineHeight: 1.6, maxWidth: 560, margin: "0 auto 40px" }}>
            The neighborhood marketplace for students and book lovers. Buy, sell, or donate textbooks and literature within your community.
          </p>
          <form onSubmit={handleSearch} className="search-form" style={{ display: "flex", alignItems: "center", backgroundColor: "#fff", border: "1px solid #c4c6cf", borderRadius: 9999, padding: "6px 6px 6px 20px", maxWidth: 680, margin: "0 auto", boxShadow: "0 2px 8px rgba(0,32,69,0.06)" }}>
            <span className="material-symbols-outlined" style={{ color: "#74777f", marginRight: 12, fontSize: 22 }}>search</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, author, category…" style={{ flex: 1, minWidth: 0, width: 0, border: "none", outline: "none", fontSize: 16, color: "#1a1c1c", backgroundColor: "transparent", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
            <button type="submit" style={{ backgroundColor: "#002045", color: "#fff", border: "none", borderRadius: 9999, padding: "10px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Search</button>
          </form>
        </div>
      </section>

      <main className="main-content" style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 40px 80px" }}>

        {/* ── Nearby Finds ── */}
        <section style={{ marginBottom: 64 }}>
          <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
            <div>
              <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 32, fontWeight: 600, color: "#002045", marginBottom: 4 }}>Nearby Finds</h2>
              <p style={{ fontSize: 16, color: "#43474e" }}>Fresh listings from your community.</p>
            </div>
            <Link href="/books" style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", color: "#002045", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              View All <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
          </div>

          {booksLoading ? (
            <div className="books-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 24 }}>
              {[...Array(8)].map((_, i) => <div key={i} style={{ backgroundColor: "#eeeeed", borderRadius: 12, height: 300 }} />)}
            </div>
          ) : recentBooks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #c4c6cf" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#c4c6cf", display: "block", marginBottom: 12 }}>inbox</span>
              <p style={{ color: "#74777f", marginBottom: 16 }}>No books listed yet. Be the first!</p>
              {user && <Link href="/add-book" style={{ backgroundColor: "#904d00", color: "#fff", padding: "10px 24px", borderRadius: 9999, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>List a Book</Link>}
            </div>
          ) : (
            <div className="books-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 24 }}>
              {recentBooks.map((book) => (
                <Link key={book.id} href={`/books/${book.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #c4c6cf", overflow: "hidden", display: "flex", flexDirection: "column", height: "100%", cursor: "pointer", transition: "box-shadow 0.3s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,32,69,0.1)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                    <div style={{ height: 200, backgroundColor: "#eeeeed", position: "relative", overflow: "hidden" }}>
                      {book.imageUrl
                        ? <img src={book.imageUrl} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: book.status === "SOLD" ? 0.5 : 1, transition: "transform 0.5s" }}
                            onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = "scale(1.05)"; }}
                            onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = "scale(1)"; }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: 48, color: "#c4c6cf" }}>menu_book</span></div>
                      }
                      <div style={{ position: "absolute", top: 12, left: 12, backgroundColor: book.status === "SOLD" ? "#ba1a1a" : "#904d00", color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 9999 }}>
                        {book.status === "SOLD" ? "SOLD" : "SALE"}
                      </div>
                    </div>
                    <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                      {book.condition && <span style={{ backgroundColor: "#a6f2d1", color: "#002116", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, padding: "2px 8px", borderRadius: 4, alignSelf: "flex-start", marginBottom: 8 }}>{book.condition}</span>}
                      <h3 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 600, color: "#002045", marginBottom: 4, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{book.title}</h3>
                      <p style={{ fontSize: 13, color: "#74777f", marginBottom: 12, flex: 1 }}>{book.author}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 600, color: "#002045" }}>₹{book.price}</span>
                        <span style={{ fontSize: 12, color: "#74777f", display: "flex", alignItems: "center", gap: 2 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>{book.district || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── How It Works ── */}
        <section className="how-it-works" style={{ backgroundColor: "#fff", border: "1px solid #c4c6cf", borderRadius: 24, padding: "56px 40px", marginBottom: 64, textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 32, fontWeight: 600, color: "#002045", marginBottom: 48 }}>The Circle of Knowledge</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 40 }}>
            {[
              { icon: "add_photo_alternate", title: "1. List", desc: "Snap a photo, add condition details, and set your price or donation preference.", color: "#002045" },
              { icon: "forum", title: "2. Connect", desc: "Chat securely with interested buyers via our in-app messenger.", color: "#904d00" },
              { icon: "handshake", title: "3. Exchange", desc: "Meet in a safe community zone or arrange a drop-off to hand over the knowledge.", color: "#003e2c" },
            ].map((step) => (
              <div key={step.title} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 88, height: 88, borderRadius: "50%", border: `2px solid ${step.color}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, backgroundColor: "#fff" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36, color: step.color }}>{step.icon}</span>
                </div>
                <h3 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, fontWeight: 600, color: "#002045", marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 15, color: "#43474e", lineHeight: 1.6, maxWidth: 220 }}>{step.desc}</p>
              </div>
            ))}
          </div>
          {!user && (
            <button onClick={handleLogin} disabled={loginLoading} style={{ marginTop: 40, backgroundColor: "#904d00", color: "#fff", border: "none", borderRadius: 9999, padding: "14px 40px", fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 600, cursor: "pointer" }}>
              Start Selling Today
            </button>
          )}
        </section>

        {/* ── Categories ── */}
        <section style={{ marginBottom: 64 }}>
          <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
            <div>
              <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 32, fontWeight: 600, color: "#002045", marginBottom: 4 }}>Explore Collections</h2>
              <p style={{ fontSize: 16, color: "#43474e" }}>Hand-picked categories for every reader.</p>
            </div>
            <Link href="/books" style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", color: "#002045", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              View All <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 16 }}>
            {CATEGORIES.map((label) => (
              <Link key={label} href={`/books?category=${encodeURIComponent(label)}`} style={{ textDecoration: "none" }}>
                <div style={{ backgroundColor: "#eeeeed", borderRadius: 16, aspectRatio: "1", border: "1px solid rgba(196,198,207,0.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#904d00"; el.style.backgroundColor = "#f4f3f2"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(196,198,207,0.3)"; el.style.backgroundColor = "#eeeeed"; }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#002045" }}>{CATEGORY_ICONS[label] || DEFAULT_CATEGORY_ICON}</span>
                  <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 14, fontWeight: 600, color: "#1a1c1c", textAlign: "center", padding: "0 8px" }}>{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Bento Why Join ── */}
        <section>
          <div className="bento-grid">
            <div className="bento-card bento-hero" style={{ backgroundColor: "#002045", color: "#fff", borderRadius: 24, padding: 40, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 28, fontWeight: 600, lineHeight: 1.3, marginBottom: 16 }}>Empowering a Circular Academic Economy.</h3>
                <p style={{ fontSize: 16, opacity: 0.85, lineHeight: 1.6 }}>Stop letting expensive textbooks collect dust. Help the next batch of students while earning back your investment.</p>
              </div>
            </div>
            <div className="bento-card bento-wide" style={{ backgroundColor: "#fe932c", color: "#2f1500", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <h3 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, fontWeight: 600 }}>Community Verified</h3>
                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>verified_user</span>
              </div>
              <p style={{ fontSize: 15, opacity: 0.9, lineHeight: 1.5 }}>Every user is verified via academic or social credentials to ensure a safe exchange environment.</p>
            </div>
            <div className="bento-card" style={{ backgroundColor: "#a6f2d1", color: "#002116", borderRadius: 24, padding: 32 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, display: "block", marginBottom: 12 }}>eco</span>
              <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Sustainable</h4>
              <p style={{ fontSize: 14, lineHeight: 1.5 }}>Reduces paper waste significantly.</p>
            </div>
            <div className="bento-card" style={{ backgroundColor: "#fff", border: "1px solid #c4c6cf", borderRadius: 24, padding: 32 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#002045", display: "block", marginBottom: 12 }}>payments</span>
              <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#002045", marginBottom: 8 }}>Affordable</h4>
              <p style={{ fontSize: 14, color: "#43474e", lineHeight: 1.5 }}>Access materials at 40–70% lower costs.</p>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: "#fff", borderTop: "1px solid #c4c6cf" }}>
        <div className="footer-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 32 }}>
          <div>
            <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, fontWeight: 700, color: "#002045", display: "block", marginBottom: 12 }}>Book Undo</span>
            <p style={{ fontSize: 14, color: "#43474e", lineHeight: 1.6 }}>© {new Date().getFullYear()} Book Undo. Building a circular economy for knowledge.</p>
            <p style={{ fontSize: 14, color: "#43474e", marginTop: 8 }}>
              Contact: <a href="mailto:nelvinsevy@gmail.com" style={{ color: "#002045", textDecoration: "none", fontWeight: 600 }}>nelvinsevy@gmail.com</a>
            </p>
          </div>
          {[
            { heading: "Platform", links: ["About Us","Community","Safety Tips","How it Works"] },
            { heading: "Support", links: ["Help Center","Terms of Service","Privacy Policy","Trust & Safety"] },
          ].map((col) => (
            <div key={col.heading}>
              <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#904d00", marginBottom: 16 }}>{col.heading}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map((l) => <li key={l}><a href="#" style={{ fontSize: 14, color: "#43474e", textDecoration: "none" }}>{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #c4c6cf", padding: "16px 40px", textAlign: "center", fontSize: 12, color: "#74777f" }}>
          Designed with ❤️ for readers everywhere.
        </div>
      </footer>

      {/* ── Chat Modal Overlay ── */}
      {activeChatId && (
        <div className="chat-modal-overlay" style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="chat-modal" style={{ width: "100%", maxWidth: 480, height: "80vh", backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #eeeeed", padding: "14px 18px" }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16, color: "#1a1c1c", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeChat?.bookTitle}
                </h2>
                <p style={{ fontSize: 13, color: "#74777f", margin: "2px 0 0" }}>
                  {user?.uid === activeChat?.buyerId ? activeChat?.sellerName : activeChat?.buyerName}
                </p>
              </div>
              <button
                onClick={closeChat}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "#43474e" }}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              {chatLoading ? (
                <p style={{ textAlign: "center", color: "#a0a3ab" }}>Loading…</p>
              ) : messages.length === 0 ? (
                <p style={{ textAlign: "center", color: "#a0a3ab", marginTop: 40 }}>No messages yet. Say hello!</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.uid;
                  return (
                    <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "75%",
                        borderRadius: 18,
                        padding: "8px 14px",
                        backgroundColor: isMe ? "#002045" : "#f4f3f2",
                        color: isMe ? "#fff" : "#1a1c1c",
                        borderBottomRightRadius: isMe ? 4 : 18,
                        borderBottomLeftRadius: isMe ? 18 : 4,
                      }}>
                        {!isMe && (
                          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6, margin: "0 0 4px" }}>
                            {msg.senderName}
                          </p>
                        )}
                        <p style={{ fontSize: 14, margin: 0, lineHeight: 1.4 }}>{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #eeeeed", padding: "12px 18px" }}>
              <input
                type="text"
                placeholder="Type a message…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ flex: 1, minWidth: 0, borderRadius: 9999, border: "1px solid #c4c6cf", padding: "10px 16px", outline: "none", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", border: "none", backgroundColor: "#904d00", color: "#fff", cursor: "pointer", opacity: !newMessage.trim() ? 0.5 : 1, flexShrink: 0 }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap');

        * { box-sizing: border-box; }

        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; display: inline-block; vertical-align: middle; }

        /* ── Bento grid: responsive, no manual span needed on mobile ── */
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        .bento-hero { grid-column: span 2; grid-row: span 2; }
        .bento-wide { grid-column: span 2; }

        @media (max-width: 900px) {
          .bento-grid { grid-template-columns: repeat(2, 1fr); }
          .bento-hero { grid-column: span 2; grid-row: span 1; }
          .bento-wide { grid-column: span 2; }
        }

        @media (max-width: 560px) {
          .bento-grid { grid-template-columns: 1fr; gap: 16px; }
          .bento-hero, .bento-wide, .bento-card { grid-column: span 1 !important; grid-row: span 1 !important; }
        }

        /* ── General mobile responsiveness ── */
        @media (max-width: 768px) {
          .nav-inner { padding: 0 16px !important; flex-wrap: wrap; height: auto !important; min-height: 64px; gap: 8px; }
          .nav-actions { gap: 8px !important; flex-wrap: wrap; }
          .list-book-btn { padding: 6px 14px !important; font-size: 13px !important; }
          .signout-btn { font-size: 12px !important; }
          .chat-dropdown { position: fixed !important; top: 64px !important; left: 12px !important; right: 12px !important; width: auto !important; max-width: none !important; }

          .hero-section { padding: 48px 16px !important; }
          .search-form { flex-wrap: nowrap; padding: 4px 4px 4px 12px !important; max-width: 100% !important; }
          .search-form input { font-size: 14px !important; min-width: 0 !important; }
          .search-form button { padding: 10px 16px !important; font-size: 13px !important; flex-shrink: 0; }
          .search-form .material-symbols-outlined { font-size: 18px !important; margin-right: 6px !important; flex-shrink: 0; }

          .main-content { padding: 32px 16px 56px !important; }
          .section-header { flex-wrap: wrap; gap: 12px; }
          .books-grid { grid-template-columns: repeat(auto-fill,minmax(150px,1fr)) !important; gap: 14px !important; }
          .how-it-works { padding: 36px 20px !important; }

          .footer-grid { padding: 32px 20px !important; gap: 24px !important; }

          /* Chat modal: full-screen below tablet width so it never gets clipped */
          .chat-modal-overlay { padding: 0 !important; align-items: stretch !important; }
          .chat-modal { max-width: 100% !important; width: 100% !important; height: 100vh !important; height: 100dvh !important; border-radius: 0 !important; }
        }

        @media (max-width: 380px) {
          .search-form button { padding: 9px 12px !important; font-size: 12px !important; }
          .books-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#faf9f8" }} />}>
      <HomeContent />
    </Suspense>
  );
}