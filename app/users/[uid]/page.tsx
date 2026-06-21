"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import Link from "next/link";

interface User {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  district: string;
  condition: string;
  imageUrl: string;
}

export default function SellerProfilePage() {
  const params = useParams();
  const [seller, setSeller] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellerData();
  }, []);

  const fetchSellerData = async () => {
    try {
      const userSnap = await getDoc(doc(db, "users", params.uid as string));
      if (userSnap.exists()) {
        setSeller(userSnap.data() as User);
      }

      const q = query(
        collection(db, "books"),
        where("ownerId", "==", params.uid)
      );
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

  if (loading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-pulse text-5xl">
            person
          </span>
          <p className="text-[14px] font-medium">Loading profile…</p>
        </div>
      </main>
    );
  }

  if (!seller) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl text-outline-variant">
            person_off
          </span>
          <p className="text-[14px] font-medium">Seller not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-6">
        {/* Seller Info Card */}
        <div className="mb-8 bg-primary-container text-on-primary-container p-6 md:p-8 rounded-xl shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
            {seller.photoURL ? (
              <img
                src={seller.photoURL}
                alt={seller.name}
                className="h-16 w-16 rounded-full object-cover border-2 border-on-primary-container"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-2xl font-semibold border-2 border-on-primary-container">
                {seller.name?.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="font-headline text-[26px] md:text-[32px] font-semibold text-white">
                {seller.name}
              </h1>
              <p className="flex items-center gap-1 text-[14px] opacity-90 mt-1">
                <span className="material-symbols-outlined text-[16px]">
                  mail
                </span>
                {seller.email}
              </p>
              <p className="flex items-center gap-1 text-[13px] opacity-75 mt-1">
                <span className="material-symbols-outlined text-[16px]">
                  menu_book
                </span>
                {books.length} book{books.length !== 1 ? "s" : ""} listed
              </p>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "120px" }}
            >
              storefront
            </span>
          </div>
        </div>

        {/* Seller's Books */}
        <h2 className="font-headline text-[24px] font-semibold text-primary mb-4">
          Books by {seller.name}
        </h2>

        {books.length === 0 ? (
          <div className="text-center py-16 px-6 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
              inbox
            </span>
            <p className="text-on-surface-variant">No books listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => (
              <Link href={`/books/${book.id}`} key={book.id}>
                <div className="h-full flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden cursor-pointer transition-shadow hover:shadow-[0_8px_24px_-4px_rgba(0,32,69,0.12)]">
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
                  <div className="p-4 flex flex-col flex-1">
                    {book.condition && (
                      <span className="self-start mb-2 text-[10px] font-bold uppercase tracking-wider px-2 py-[2px] rounded bg-tertiary-container text-on-tertiary-container">
                        {book.condition}
                      </span>
                    )}
                    <h3 className="font-headline text-[16px] font-semibold text-primary mb-1 line-clamp-2 leading-snug">
                      {book.title}
                    </h3>
                    <p className="text-[13px] text-on-surface-variant mb-3 line-clamp-1">
                      {book.author}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-headline text-[18px] font-semibold text-primary">
                        ₹{book.price}
                      </span>
                    </div>
                    <p className="flex items-center gap-1 text-[12px] text-on-surface-variant mt-2">
                      <span className="material-symbols-outlined text-[14px]">
                        location_on
                      </span>
                      {book.district}
                    </p>
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