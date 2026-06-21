"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Favorite {
  bookId: string;
  bookTitle: string;
  bookImage: string;
  bookPrice: number;
  bookAuthor: string;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.uid) {
      alert("Please login first");
      router.push("/");
      return;
    }
    fetchFavorites(user.uid);
  }, []);

  const fetchFavorites = async (uid: string) => {
    try {
      const q = query(
        collection(db, "favorites"),
        where("userId", "==", uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => doc.data()) as Favorite[];
      setFavorites(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-pulse text-5xl">
            star
          </span>
          <p className="text-[14px] font-medium">Loading favorites…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-6">
        {/* Page Header */}
        <div className="mb-6 flex items-center gap-3">
          <span
            className="material-symbols-outlined text-[36px] text-secondary"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
          >
            star
          </span>
          <div>
            <h1 className="font-headline text-[32px] md:text-[48px] leading-tight font-bold text-primary">
              My Favorites
            </h1>
            <p className="text-[16px] text-on-surface-variant">
              Books you've saved to come back to.
            </p>
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-16 px-6 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
              star_border
            </span>
            <p className="text-on-surface-variant mb-4">
              No favorites yet. Tap the star on any book to save it here.
            </p>
            <Link
              href="/books"
              className="inline-flex items-center gap-1 bg-secondary text-white px-6 py-2.5 rounded-full text-[14px] font-semibold shadow-md hover:brightness-110 transition-all"
            >
              Browse Books
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((fav) => (
              <Link href={`/books/${fav.bookId}`} key={fav.bookId}>
                <div className="h-full flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden cursor-pointer transition-shadow hover:shadow-[0_8px_24px_-4px_rgba(0,32,69,0.12)]">
                  <div className="h-48 w-full bg-surface-container-low overflow-hidden">
                    {fav.bookImage ? (
                      <img
                        src={fav.bookImage}
                        alt={fav.bookTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-outline-variant">
                          menu_book
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h2 className="font-headline text-[16px] font-semibold text-primary mb-1 line-clamp-2 leading-snug">
                      {fav.bookTitle}
                    </h2>
                    <p className="text-[13px] text-on-surface-variant mb-3 line-clamp-1">
                      {fav.bookAuthor}
                    </p>
                    <span className="mt-auto font-headline text-[18px] font-semibold text-primary">
                      ₹{fav.bookPrice}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}