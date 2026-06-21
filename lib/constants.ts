// Single source of truth for book categories and districts.
// Used by: app/add-book/page.tsx, app/books/page.tsx, and app/page.tsx (homepage).
// Update values here only — every page that filters or lists by category/
// district will automatically stay in sync.

export const CATEGORIES = [
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

export const DISTRICTS = [
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