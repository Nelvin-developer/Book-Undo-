"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { CATEGORIES, DISTRICTS } from "@/lib/constants";


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

function BooksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const activeSearch = searchParams.get("search") || "";
  const activeCategory = searchParams.get("category") || "";
  const activeDistrict = searchParams.get("district") || "";

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "books"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setAllBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Book)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Keep the search box in sync if the URL changes externally (e.g. nav search)
  useEffect(() => {
    setSearchInput(searchParams.get("search") || "");
  }, [searchParams]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/books?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("search", searchInput.trim());
  };

  const clearAllFilters = () => {
    setSearchInput("");
    router.push("/books");
  };

  const normalize = (v?: string) => (v || "").trim().toLowerCase();

  const normalizedSearch = normalize(activeSearch);

  const filteredBooks = allBooks.filter((book) => {
    if (normalizedSearch) {
      const haystack = `${book.title || ""} ${book.author || ""}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    if (activeCategory && normalize(book.category) !== normalize(activeCategory)) return false;
    if (activeDistrict && normalize(book.district) !== normalize(activeDistrict)) return false;
    return true;
  });

  const hasActiveFilters = !!(activeSearch || activeCategory || activeDistrict);

  // Categories: use the full fixed list (matches the add-book form exactly)
  // so every category is selectable even if no book has been listed under
  // it yet.
  const availableCategories = CATEGORIES;

  // Districts: district is free text on the add-book form, so start from the
  // full Kerala district list, then fold in any other values actually
  // present in the data (in case someone typed something outside that list).
  const extraDistricts = Array.from(
    new Set(allBooks.map((b) => b.district?.trim()).filter((d): d is string => !!d))
  ).filter((d) => !DISTRICTS.some((kd) => normalize(kd) === normalize(d)));

  const availableDistricts = [...DISTRICTS, ...extraDistricts].sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <main className="min-h-screen bg-surface">
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10 py-8">
        {/* Header */}
        <div className="mb-5 sm:mb-6">
          <h1 className="font-headline text-[24px] sm:text-[36px] font-bold text-primary leading-tight">
            Browse Books
          </h1>
          <p className="text-[13px] sm:text-[14px] text-on-surface-variant mt-1">
            {loading
              ? "Loading listings…"
              : `${filteredBooks.length} book${filteredBooks.length === 1 ? "" : "s"} found`}
          </p>
        </div>

        {/* Search bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/40 rounded-full px-3 sm:px-4 py-2 mb-5 shadow-sm w-full max-w-2xl"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] sm:text-[20px] shrink-0">
            search
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title or author…"
            className="flex-1 min-w-0 w-0 bg-transparent outline-none text-[13px] sm:text-[14px] text-on-surface placeholder:text-on-surface-variant/70"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                updateParam("search", "");
              }}
              className="text-on-surface-variant flex items-center justify-center shrink-0 w-6 h-6"
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
          <button
            type="submit"
            className="bg-primary text-on-primary rounded-full px-3.5 sm:px-5 py-1.5 text-[12px] sm:text-[13px] font-semibold shrink-0 whitespace-nowrap"
          >
            Search
          </button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-8">
          <select
            value={activeCategory}
            onChange={(e) => updateParam("category", e.target.value)}
            className="flex-1 min-w-[140px] sm:flex-none bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 sm:py-2 text-[13px] text-on-surface outline-none"
          >
            <option value="">All Categories</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={activeDistrict}
            onChange={(e) => updateParam("district", e.target.value)}
            className="flex-1 min-w-[140px] sm:flex-none bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 sm:py-2 text-[13px] text-on-surface outline-none"
          >
            <option value="">All Districts</option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="w-full sm:w-auto text-[13px] font-semibold text-primary flex items-center justify-center sm:justify-start gap-1 py-1"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              Clear filters
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest rounded-xl h-[260px] animate-pulse"
              />
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              search_off
            </span>
            <h2 className="font-headline text-[20px] font-semibold text-primary mb-1">
              No books found
            </h2>
            <p className="text-[14px] text-on-surface-variant max-w-sm">
              {hasActiveFilters
                ? "Try a different search term or clear your filters."
                : "No books have been listed yet."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-5 bg-secondary text-white rounded-full px-6 py-2 text-[13px] font-semibold"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {filteredBooks.map((book) => (
              <Link key={book.id} href={`/books/${book.id}`} className="group">
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden flex flex-col h-full transition-shadow group-hover:shadow-[0_8px_24px_-4px_rgba(0,32,69,0.12)]">
                  <div className="relative h-[140px] sm:h-[180px] bg-surface-container overflow-hidden">
                    {book.imageUrl ? (
                      <img
                        src={book.imageUrl}
                        alt={book.title}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          book.status === "SOLD" ? "opacity-50 grayscale" : ""
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-outline-variant">
                          menu_book
                        </span>
                      </div>
                    )}
                    <span
                      className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white ${
                        book.status === "SOLD" ? "bg-error" : "bg-secondary"
                      }`}
                    >
                      {book.status === "SOLD" ? "Sold" : "Sale"}
                    </span>
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    {book.condition && (
                      <span className="self-start bg-tertiary-container text-on-tertiary-container text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-1.5">
                        {book.condition}
                      </span>
                    )}
                    <h3 className="font-headline text-[14px] font-semibold text-primary leading-snug line-clamp-2 mb-1">
                      {book.title}
                    </h3>
                    <p className="text-[12px] text-on-surface-variant line-clamp-1 flex-1">
                      {book.author}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-headline text-[15px] font-semibold text-primary">
                        ₹{book.price}
                      </span>
                      <span className="text-[11px] text-on-surface-variant flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        {book.district || "—"}
                      </span>
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

export default function BooksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <BooksContent />
    </Suspense>
  );
}