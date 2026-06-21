"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import Link from "next/link";

const CATEGORIES = [
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

export default function EditBookPage() {
  const params = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [district, setDistrict] = useState("");
  const [condition, setCondition] = useState("Good");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    fetchBook();
  }, []);

  const fetchBook = async () => {
    try {
      const bookRef = doc(db, "books", params.id as string);
      const bookSnap = await getDoc(bookRef);

      if (bookSnap.exists()) {
        const data = bookSnap.data();

        setTitle(data.title || "");
        setAuthor(data.author || "");
        setCategory(data.category || "");
        setPrice(String(data.price || ""));
        setDistrict(data.district || "");
        setCondition(data.condition || "Good");
        setDescription(data.description || "");
        setImageUrl(data.imageUrl || "");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      await updateDoc(doc(db, "books", params.id as string), {
        title,
        author,
        category,
        price: Number(price),
        district,
        condition,
        description,
        imageUrl,
      });

      alert("Book Updated Successfully");
      router.push("/my-books");
    } catch (error) {
      console.error(error);
      alert("Failed to update book");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-pulse text-5xl">
            edit_note
          </span>
          <p className="text-[14px] font-medium">Loading book…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="w-full max-w-[800px] mx-auto px-4 md:px-10 py-6">
        {/* Page Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/my-books"
            className="flex items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">
              arrow_back
            </span>
          </Link>
          <div>
            <h1 className="font-headline text-[32px] md:text-[40px] leading-tight font-bold text-primary mb-1">
              Edit Book
            </h1>
            <p className="text-[16px] text-on-surface-variant">
              Update your listing's details below.
            </p>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 md:p-10 rounded-xl shadow-[0_4px_20px_-2px_rgba(0,32,69,0.08)] border border-outline-variant/30">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
          >
            <section>
              <h2 className="text-[24px] font-semibold text-primary mb-3 border-b border-outline-variant pb-2">
                Book Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                    Book Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fundamentals of Physics"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-surface p-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                    Author
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Halliday & Resnick"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full bg-surface p-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-surface p-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                    District
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">
                      location_on
                    </span>
                    <input
                      type="text"
                      placeholder="Enter your district"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full bg-surface pl-10 pr-3 py-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                    Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full bg-surface p-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value="New">New</option>
                    <option value="Good">Good</option>
                    <option value="Used">Used</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                    Asking Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-primary">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-surface pl-10 pr-3 py-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Image */}
            <section className="space-y-1">
              <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                Image URL
              </label>
              <input
                type="text"
                placeholder="https://…"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-surface p-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Book Preview"
                  className="mt-3 h-48 w-full rounded-lg border border-outline-variant object-cover"
                />
              )}
            </section>

            {/* Description */}
            <section className="space-y-1">
              <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                Book Description & Condition
              </label>
              <textarea
                placeholder="Mention any annotations, damage, or specific editions. Be as honest as possible!"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-surface p-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
              />
            </section>

            {/* Submit */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-secondary text-white py-3 rounded-xl text-[24px] font-semibold shadow-md hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Update Book"}
                {!saving && (
                  <span className="material-symbols-outlined">check_circle</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}