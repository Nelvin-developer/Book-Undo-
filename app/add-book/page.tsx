"use client";

import { useState, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

type TransactionType = "SALE" | "BORROW" | "DONATE";

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

const TRANSACTION_OPTIONS: {
  type: TransactionType;
  label: string;
  icon: string;
}[] = [
  { type: "SALE", label: "Sale", icon: "payments" },
  { type: "BORROW", label: "Borrow", icon: "menu_book" },
  { type: "DONATE", label: "Donate", icon: "volunteer_activism" },
];

export default function AddBookPage() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");
  const [condition, setCondition] = useState("Good");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [transactionType, setTransactionType] =
    useState<TransactionType>("SALE");

  // Pull whatever's in localStorage just to render the sidebar card.
  // Read on the client only (after mount) to avoid hydration mismatches.
  const [displayName, setDisplayName] = useState("Your Name");
  const [displayEmail, setDisplayEmail] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser.name) setDisplayName(storedUser.name);
    if (storedUser.email) setDisplayEmail(storedUser.email);
  }, []);

  const avatarInitial = displayName.charAt(0).toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!user.uid) {
        alert("Please login first");
        return;
      }

      if (!title || !author || !category || !district || !town) {
        alert("Please fill in all required fields");
        return;
      }

      if (transactionType === "SALE" && !price) {
        alert("Please enter an asking price");
        return;
      }

      let imageUrl = "";

      if (selectedFile) {
        setUploading(true);

        const authRes = await fetch("/api/upload-auth");
        const authData = await authRes.json();

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("fileName", selectedFile.name);
        formData.append(
          "publicKey",
          process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || ""
        );
        formData.append("signature", authData.signature);
        formData.append("expire", authData.expire);
        formData.append("token", authData.token);

        const uploadRes = await fetch(
          "https://upload.imagekit.io/api/v1/files/upload",
          { method: "POST", body: formData }
        );

        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;

        setUploading(false);
      }

      await addDoc(collection(db, "books"), {
        title,
        author,
        category,
        price: transactionType === "SALE" ? Number(price) : 0,
        district,
        town,
        condition,
        description,
        imageUrl,
        phoneNumber,
        whatsappNumber,
        type: transactionType,
        ownerId: user.uid,
        ownerName: user.name,
        ownerEmail: user.email,
        createdAt: new Date(),
      });

      alert("Book Added Successfully");

      setTitle("");
      setAuthor("");
      setCategory("");
      setPrice("");
      setDistrict("");
      setTown("");
      setCondition("Good");
      setDescription("");
      setSelectedFile(null);
      setPreviewUrl("");
      setPhoneNumber("");
      setWhatsappNumber("");
      setTransactionType("SALE");
    } catch (error) {
      console.error(error);
      setUploading(false);
      alert("Failed to add book");
    }
  };

  return (
    <main className="min-h-screen bg-surface flex flex-col">
      <div className="flex-grow w-full max-w-[1280px] mx-auto px-4 md:px-10 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="font-headline text-[28px] sm:text-[32px] md:text-[48px] leading-tight font-bold text-primary mb-1">
            Share Your Knowledge
          </h1>
          <p className="text-[15px] md:text-[18px] text-on-surface-variant">
            Turn your old books into new opportunities for someone else.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-8 bg-surface-container-lowest p-4 sm:p-6 md:p-10 rounded-xl shadow-[0_4px_20px_-2px_rgba(0,32,69,0.08)] border border-outline-variant/30">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Book Basic Info */}
              <section>
                <h2 className="text-[20px] sm:text-[24px] font-semibold text-primary mb-3 border-b border-outline-variant pb-2">
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
                      Town
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your town"
                      value={town}
                      onChange={(e) => setTown(e.target.value)}
                      className="w-full bg-surface p-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
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
                </div>
              </section>

              {/* Transaction Settings */}
              <section className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                <h2 className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider mb-3">
                  Transaction Type
                </h2>
                <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                  {TRANSACTION_OPTIONS.map((opt) => {
                    const isActive = transactionType === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setTransactionType(opt.type)}
                        className={`sm:flex-1 sm:min-w-[120px] flex flex-col items-center gap-1 p-2 sm:p-3 border-2 rounded-xl transition-all ${
                          isActive
                            ? "bg-secondary-container border-secondary-container text-white"
                            : "bg-surface border-outline-variant hover:border-secondary-container"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]">
                          {opt.icon}
                        </span>
                        <span className="text-[11px] sm:text-[14px] font-semibold tracking-wide text-center">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {transactionType === "SALE" && (
                  <div className="mt-6 space-y-1">
                    <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                      Asking Price
                    </label>
                    <div className="relative max-w-xs">
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
                )}

                {transactionType === "BORROW" && (
                  <div className="mt-4 flex items-start gap-2 bg-error/10 border border-error/20 rounded-lg p-3">
                    <span className="material-symbols-outlined text-error text-[18px] mt-0.5">
                      info
                    </span>
                    <p className="text-[12px] text-error leading-relaxed">
                      BookUndo is not responsible for any damage or loss of
                      the book during a borrow exchange. Please coordinate
                      directly and carefully with the other party.
                    </p>
                  </div>
                )}
              </section>

              {/* Contact Info */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-surface p-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="With country code, e.g. 919876543210"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full bg-surface p-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </section>

              {/* Image Upload */}
              <section>
                <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider block mb-2">
                  Book Cover Image
                </label>
                <div
                  onClick={() => document.getElementById("fileInput")?.click()}
                  className="border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center bg-surface-container-low hover:bg-surface transition-colors cursor-pointer group"
                >
                  <input
                    id="fileInput"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "32px" }}
                    >
                      add_a_photo
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold text-primary text-center">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-[13px] sm:text-[14px] text-on-surface-variant mt-1 text-center">
                    High resolution JPG, PNG (Max 5MB)
                  </p>
                </div>

                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Book Preview"
                    className="mt-4 h-48 w-full rounded-lg border border-outline-variant object-cover"
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
                  disabled={uploading}
                  className="w-full bg-secondary text-white py-3 rounded-xl text-[18px] sm:text-[24px] font-semibold shadow-md hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "List My Book"}
                  {!uploading && (
                    <span className="material-symbols-outlined">send</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {/* User Card */}
            <div className="bg-primary-container text-on-primary-container p-6 rounded-xl shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-full border-2 border-on-primary-container flex items-center justify-center bg-primary text-white text-[20px] font-semibold shrink-0">
                    {avatarInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] opacity-80 uppercase tracking-tighter">
                      Listing as
                    </p>
                    <h3 className="text-[20px] sm:text-[24px] font-semibold text-white truncate">
                      {displayName}
                    </h3>
                  </div>
                </div>
                {displayEmail && (
                  <div className="flex items-center gap-2 bg-surface-container-lowest/10 p-2 rounded-lg mb-3 min-w-0">
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      mail
                    </span>
                    <span className="text-[14px] truncate">{displayEmail}</span>
                  </div>
                )}
                <p className="text-[14px] opacity-90 leading-relaxed">
                  Your profile info will be visible to potential buyers to
                  ensure safety.
                </p>
              </div>
              <div className="absolute -bottom-4 -right-4 opacity-10">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "120px" }}
                >
                  verified_user
                </span>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-surface-container p-6 rounded-xl border border-outline-variant">
              <h3 className="text-[20px] sm:text-[24px] font-semibold text-primary mb-3">
                Quick Tips
              </h3>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-secondary shrink-0">
                    check_circle
                  </span>
                  <p className="text-[14px] text-on-surface-variant">
                    Clear photos of the front cover and spine get 4x more
                    interest.
                  </p>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-secondary shrink-0">
                    check_circle
                  </span>
                  <p className="text-[14px] text-on-surface-variant">
                    Accurate &quot;Condition&quot; tags build long-term
                    community trust.
                  </p>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-secondary shrink-0">
                    check_circle
                  </span>
                  <p className="text-[14px] text-on-surface-variant">
                    Academic books sell best when listed at 40–60% of MRP.
                  </p>
                </li>
              </ul>
            </div>

            {/* Live Preview Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-[0_4px_20px_-2px_rgba(0,32,69,0.08)]">
              <h3 className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider mb-3">
                Listing Preview
              </h3>
              <div className="aspect-[3/4] bg-surface-container-low rounded-lg mb-3 flex items-center justify-center text-outline overflow-hidden border border-outline-variant/20">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-5xl opacity-40">
                    image
                  </span>
                )}
              </div>
              <div className="font-semibold text-primary truncate">
                {title || "Book title appears here"}
              </div>
              <div className="text-[14px] text-on-surface-variant truncate">
                {author || "Author name"}
                {transactionType === "SALE" && price ? ` · ₹${price}` : ""}
                {transactionType === "BORROW" ? " · Borrow" : ""}
                {transactionType === "DONATE" ? " · Donate" : ""}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}