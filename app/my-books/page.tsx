"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  price: number;
  district?: string;
  condition?: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
}

export default function MyBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyBooks();
  }, []);

  const fetchMyBooks = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!user.uid) {
        alert("Please login first");
        return;
      }

      const querySnapshot = await getDocs(collection(db, "books"));

      const myBooks = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((book: any) => book.ownerId === user.uid) as Book[];

      setBooks(myBooks);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this book?"
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "books", id));
      setBooks((prevBooks) => prevBooks.filter((book) => book.id !== id));
      alert("Book deleted successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to delete book");
    }
  };

  return (
    <main className="min-h-screen bg-surface">
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-6">
        {/* Page Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-headline text-[28px] sm:text-[32px] md:text-[48px] leading-tight font-bold text-primary mb-1">
              My Books
            </h1>
            <p className="text-[15px] md:text-[16px] text-on-surface-variant">
              Manage the books you've listed.
            </p>
          </div>
          <Link
            href="/add-book"
            className="flex items-center gap-1 bg-secondary text-white px-5 sm:px-6 py-2.5 rounded-full text-[14px] font-semibold shadow-md hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            List a Book
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined animate-pulse text-5xl">
                inventory_2
              </span>
              <p className="text-[14px] font-medium">Loading your books…</p>
            </div>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-16 px-6 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
              inventory_2
            </span>
            <h2 className="font-headline text-[20px] font-semibold text-primary mb-1">
              No Books Found
            </h2>
            <p className="text-on-surface-variant mb-4">
              You haven't uploaded any books yet.
            </p>
            <Link
              href="/add-book"
              className="inline-flex items-center gap-1 bg-secondary text-white px-6 py-2.5 rounded-full text-[14px] font-semibold shadow-md hover:brightness-110 transition-all"
            >
              List Your First Book
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 sm:p-5 md:p-6 shadow-[0_4px_20px_-2px_rgba(0,32,69,0.06)]"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="font-headline text-[19px] sm:text-[22px] font-semibold text-primary break-words">
                        {book.title}
                      </h2>
                      {book.condition && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-[2px] rounded bg-tertiary-container text-on-tertiary-container shrink-0">
                          {book.condition}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-on-surface-variant mb-3">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">
                          person
                        </span>
                        {book.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">
                          category
                        </span>
                        {book.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">
                          location_on
                        </span>
                        {book.district || "—"}
                      </span>
                    </div>

                    {book.description && (
                      <p className="text-[14px] text-on-surface-variant leading-relaxed line-clamp-2">
                        {book.description}
                      </p>
                    )}
                  </div>

                  <div className="flex md:flex-col items-start gap-2 shrink-0">
                    <span className="font-headline text-[20px] sm:text-[24px] font-semibold text-primary">
                      ₹{book.price}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-outline-variant/30 flex flex-wrap gap-3">
                  <Link
                    href={`/edit-book/${book.id}`}
                    className="flex items-center gap-1 bg-primary-container text-on-primary-container px-4 py-2 rounded-lg text-[14px] font-semibold hover:brightness-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      edit
                    </span>
                    Edit
                  </Link>

                  <button
                    onClick={() => handleDelete(book.id)}
                    className="flex items-center gap-1 bg-error/10 text-error px-4 py-2 rounded-lg text-[14px] font-semibold hover:bg-error/20 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      delete
                    </span>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}