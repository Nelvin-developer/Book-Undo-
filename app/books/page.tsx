"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  setDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import Link from "next/link";

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  price: number;
  district: string;
  town?: string;
  condition: string;
  description: string;
  imageUrl: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: any;
}

const DISTRICTS = [
  "All Districts",
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
];

const CATEGORIES = [
  "All Categories",
  "Novel",
  "Engineering",
  "School",
  "College",
  "Competitive Exam",
  "Biography",
  "Comics",
  "Science",
  "History",
  "Self Help",
  "Other",
];

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (userData.uid) {
      setUser(userData);
      fetchFavorites(userData.uid);
    }
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const q = query(collection(db, "books"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Book[];
      setBooks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async (uid: string) => {
    try {
      const q = query(collection(db, "favorites"), where("userId", "==", uid));
      const snapshot = await getDocs(q);
      const favIds = new Set(
        snapshot.docs.map((doc) => doc.data().bookId as string)
      );
      setFavorites(favIds);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, book: Book) => {
    e.preventDefault();
    if (!user) {
      alert("Please login first");
      return;
    }
    const favDocId = `${user.uid}_${book.id}`;
    const favRef = doc(db, "favorites", favDocId);
    try {
      if (favorites.has(book.id)) {
        await deleteDoc(favRef);
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(book.id);
          return next;
        });
      } else {
        await setDoc(favRef, {
          userId: user.uid,
          bookId: book.id,
          bookTitle: book.title,
          bookImage: book.imageUrl,
          bookPrice: book.price,
          bookAuthor: book.author,
          createdAt: new Date(),
        });
        setFavorites((prev) => new Set(prev).add(book.id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase());

    const matchesDistrict =
      selectedDistrict === "All Districts" ||
      book.district === selectedDistrict;

    const matchesCategory =
      selectedCategory === "All Categories" ||
      book.category === selectedCategory;

    return matchesSearch && matchesDistrict && matchesCategory;
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-pulse text-5xl">
            menu_book
          </span>
          <p className="text-[14px] font-medium">Loading books…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="font-headline text-[32px] md:text-[48px] leading-tight font-bold text-primary mb-1">
            Browse Books
          </h1>
          <p className="text-[16px] md:text-[18px] text-on-surface-variant">
            Find your next read from the community.
          </p>
        </div>

        {/* Filters Bar */}
        <div className="bg-surface-container-lowest p-4 md:p-6 rounded-xl border border-outline-variant/30 shadow-[0_4px_20px_-2px_rgba(0,32,69,0.08)] mb-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search by title or author…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface pl-10 pr-3 py-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>

            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-surface p-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer sm:w-52"
            >
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-surface p-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer sm:w-52"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mb-4 text-[14px] text-on-surface-variant">
          {filteredBooks.length} book{filteredBooks.length !== 1 ? "s" : ""} found
        </p>

        {/* Results Grid */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-16 px-6 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
              search_off
            </span>
            <p className="text-on-surface-variant">
              No books found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBooks.map((book) => (
              <Link href={`/books/${book.id}`} key={book.id}>
                <div className="relative h-full flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden cursor-pointer transition-shadow hover:shadow-[0_8px_24px_-4px_rgba(0,32,69,0.12)]">
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => toggleFavorite(e, book)}
                    className="absolute right-2 top-2 z-10 w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur flex items-center justify-center shadow border border-outline-variant/30"
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{
                        fontVariationSettings: favorites.has(book.id)
                          ? "'FILL' 1, 'wght' 500"
                          : "'FILL' 0, 'wght' 400",
                        color: favorites.has(book.id) ? "#904d00" : "#74777f",
                      }}
                    >
                      star
                    </span>
                  </button>

                  {/* Image */}
                  <div className="h-48 w-full bg-surface-container-low overflow-hidden">
                    {book.imageUrl ? (
                      <img
                        src={book.imageUrl}
                        alt={book.title}
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

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    {book.condition && (
                      <span className="self-start mb-2 text-[10px] font-bold uppercase tracking-wider px-2 py-[2px] rounded bg-tertiary-container text-on-tertiary-container">
                        {book.condition}
                      </span>
                    )}

                    <h2 className="font-headline text-[16px] font-semibold text-primary mb-1 line-clamp-2 leading-snug">
                      {book.title}
                    </h2>
                    <p className="text-[13px] text-on-surface-variant mb-3 line-clamp-1">
                      {book.author}
                    </p>

                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-headline text-[18px] font-semibold text-primary">
                          ₹{book.price}
                        </span>
                        {book.category && (
                          <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-primary-container text-on-primary-container">
                            {book.category}
                          </span>
                        )}
                      </div>
                      <p className="flex items-center gap-1 text-[12px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">
                          location_on
                        </span>
                        {book.district}
                        {book.town ? `, ${book.town}` : ""}
                      </p>
                    </div>
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