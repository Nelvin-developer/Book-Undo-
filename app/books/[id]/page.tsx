"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import Link from "next/link";

interface Book {
  title: string;
  author: string;
  category: string;
  price: number;
  district?: string;
  town?: string;
  condition?: string;
  description?: string;
  imageUrl?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerId?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  status?: "AVAILABLE" | "SOLD";
}

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.uid) setCurrentUserId(user.uid);
    fetchBook();
  }, []);

  const fetchBook = async () => {
    try {
      const bookRef = doc(db, "books", params.id as string);
      const bookSnap = await getDoc(bookRef);
      if (bookSnap.exists()) {
        setBook(bookSnap.data() as Book);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSold = async () => {
    if (!book || statusUpdating) return;
    const newStatus = book.status === "SOLD" ? "AVAILABLE" : "SOLD";
    try {
      setStatusUpdating(true);
      await updateDoc(doc(db, "books", params.id as string), {
        status: newStatus,
      });
      setBook((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (error) {
      console.error(error);
      alert("Failed to update status. Please try again.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleChat = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!user.uid) {
      alert("Please login first");
      return;
    }

    if (user.uid === book?.ownerId) {
      alert("You cannot chat with yourself");
      return;
    }

    try {
      setStarting(true);

      const q = query(
        collection(db, "chats"),
        where("bookId", "==", params.id),
        where("buyerId", "==", user.uid)
      );

      const existing = await getDocs(q);

      if (!existing.empty) {
        router.push(`/?openChat=${existing.docs[0].id}`);
        return;
      }

      const chatRef = await addDoc(collection(db, "chats"), {
        bookId: params.id,
        bookTitle: book?.title,
        buyerId: user.uid,
        buyerName: user.name,
        sellerId: book?.ownerId,
        sellerName: book?.ownerName,
        createdAt: new Date(),
      });

      router.push(`/?openChat=${chatRef.id}`);
    } catch (error) {
      console.error(error);
      alert("Failed to start chat");
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-pulse text-5xl">
            menu_book
          </span>
          <p className="text-[14px] font-medium">Loading book…</p>
        </div>
      </main>
    );
  }

  if (!book) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl text-outline-variant">
            search_off
          </span>
          <h1 className="font-headline text-[24px] font-semibold text-primary">
            Book Not Found
          </h1>
        </div>
      </main>
    );
  }

  const isOwner = currentUserId === book.ownerId;
  const isSold = book.status === "SOLD";

  return (
    <main className="min-h-screen bg-surface">
      <div className="w-full max-w-[800px] mx-auto px-4 md:px-10 py-6">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 md:p-8 shadow-[0_4px_20px_-2px_rgba(0,32,69,0.08)]">

          {/* SOLD banner */}
          {isSold && (
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-error/10 border border-error/20 px-4 py-3">
              <span className="material-symbols-outlined text-error text-[20px]">
                sell
              </span>
              <span className="text-error text-[14px] font-medium">
                This book has already been sold.
              </span>
            </div>
          )}

          {/* Book image with SOLD watermark */}
          {book.imageUrl && (
            <div className="relative mb-6 rounded-xl overflow-hidden">
              <img
                src={book.imageUrl}
                alt={book.title}
                className={`h-80 w-full object-cover ${
                  isSold ? "opacity-50 grayscale" : ""
                }`}
              />
              {isSold && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                  <span className="rotate-[-12deg] border-4 border-error text-error font-extrabold text-4xl px-6 py-2 rounded-lg bg-surface-container-lowest/80">
                    SOLD
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Title + status badge */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <h1 className="font-headline text-[32px] md:text-[40px] font-bold text-primary leading-tight">
              {book.title}
            </h1>
            <span
              className={`shrink-0 mt-2 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                isSold
                  ? "bg-error/10 text-error"
                  : "bg-tertiary-container text-on-tertiary-container"
              }`}
            >
              {isSold ? "Sold" : "Available"}
            </span>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-6">
            <DetailRow icon="person" label="Author" value={book.author} />
            <DetailRow icon="category" label="Category" value={book.category} />
            <DetailRow
              icon="payments"
              label="Price"
              value={`₹${book.price}`}
            />
            <DetailRow
              icon="location_on"
              label="District"
              value={book.district || "—"}
            />
            <DetailRow icon="place" label="Town" value={book.town || "—"} />
            <DetailRow
              icon="auto_awesome"
              label="Condition"
              value={book.condition || "—"}
            />
          </div>

          <div className="flex items-center gap-2 mb-6 pb-6 border-b border-outline-variant/30">
            <span className="text-[13px] text-on-surface-variant">
              Uploaded by
            </span>
            <Link
              href={`/users/${book.ownerId}`}
              className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">
                storefront
              </span>
              {book.ownerName || "—"}
            </Link>
          </div>

          {/* Description */}
          <div className="mb-2">
            <h2 className="font-headline text-[20px] font-semibold text-primary mb-2">
              Description
            </h2>
            <p className="text-[14px] text-on-surface-variant leading-relaxed">
              {book.description || "No description available"}
            </p>
          </div>

          {/* ── Mark as Sold — owner only ── */}
          {isOwner && (
            <div className="mt-8 pt-6 border-t border-outline-variant/30">
              <h2 className="font-headline text-[20px] font-semibold text-primary mb-3">
                Manage Listing
              </h2>
              <button
                onClick={handleMarkAsSold}
                disabled={statusUpdating}
                className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 ${
                  isSold ? "bg-secondary" : "bg-error"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isSold ? "check_circle" : "sell"}
                </span>
                {statusUpdating
                  ? "Updating…"
                  : isSold
                  ? "Mark as Available"
                  : "Mark as Sold"}
              </button>
              <p className="mt-2 text-[12px] text-on-surface-variant">
                {isSold
                  ? "Mark as available again if the deal didn't go through."
                  : "Mark as sold once you've found a buyer."}
              </p>
            </div>
          )}

          {/* ── Contact Seller — buyers only ── */}
          {!isOwner && (
            <div className="mt-8 pt-6 border-t border-outline-variant/30">
              <h2 className="font-headline text-[20px] font-semibold text-primary mb-3">
                Contact Seller
              </h2>

              {isSold ? (
                <p className="text-[13px] text-on-surface-variant italic">
                  This book has been sold and is no longer available.
                </p>
              ) : (
                <button
                  onClick={handleChat}
                  disabled={starting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-3 text-white font-semibold shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    chat
                  </span>
                  {starting ? "Starting chat…" : "Chat with Seller"}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
        {icon}
      </span>
      <span className="text-[13px] text-on-surface-variant">{label}:</span>
      <span className="text-[14px] font-medium text-on-surface">{value}</span>
    </div>
  );
}