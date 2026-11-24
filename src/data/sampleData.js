// Legacy fixtures retained for local UI examples; application pages use the API.
// Money is in rupees here for readability; the API sends paise.

export const user = {
  name: "Aarav Patil",
  memberId: "M-1001",
  email: "aarav@mail.com",
  phone: "+91 98765 43210",
  type: "Student",
  status: "Active",
  since: "Jul 2024",
  city: "Pune, Maharashtra",
};

const d = (id, title, author, category, year, copies, rating, pages, isbn, shelf) => ({
  id, title, author, category, year, copies, rating, pages, isbn, shelf,
  desc: `${title} is a widely read title in the ${category} section. Loan period is 14 days with up to two renewals. Overdue fine is ₹5 per day.`,
});

export const books = [
  d(1, "The Pragmatic Programmer", "Andrew Hunt", "Technology", 1999, 3, 4.7, 352, "9780201616224", "T-12"),
  d(2, "Sapiens", "Yuval Noah Harari", "History", 2011, 0, 4.6, 498, "9780062316097", "H-04"),
  d(3, "Atomic Habits", "James Clear", "Self Help", 2018, 5, 4.8, 320, "9780735211292", "S-21"),
  d(4, "Clean Code", "Robert C. Martin", "Technology", 2008, 2, 4.4, 464, "9780132350884", "T-15"),
  d(5, "The Alchemist", "Paulo Coelho", "Fiction", 1988, 4, 4.3, 208, "9780062315007", "F-08"),
  d(6, "A Brief History of Time", "Stephen Hawking", "Science", 1988, 1, 4.5, 256, "9780553380163", "SC-02"),
  d(7, "Wings of Fire", "A.P.J. Abdul Kalam", "Biography", 1999, 6, 4.7, 180, "9788173711466", "B-10"),
  d(8, "Deep Work", "Cal Newport", "Self Help", 2016, 0, 4.4, 304, "9781455586691", "S-22"),
  d(9, "Cosmos", "Carl Sagan", "Science", 1980, 2, 4.6, 396, "9780345539434", "SC-05"),
  d(10, "1984", "George Orwell", "Fiction", 1949, 3, 4.7, 328, "9780451524935", "F-01"),
];

export const categories = [...new Set(books.map((b) => b.category))];

export const loans = [
  { id: 1, bookId: 3, issued: "28 Oct 2026", due: "10 Nov 2026", status: "overdue", renewals: 0, maxRenewals: 2 },
  { id: 2, bookId: 1, issued: "06 Nov 2026", due: "20 Nov 2026", status: "issued", renewals: 1, maxRenewals: 2 },
  { id: 3, bookId: 6, issued: "14 Nov 2026", due: "28 Nov 2026", status: "issued", renewals: 0, maxRenewals: 2 },
];

export const history = [
  { id: 11, bookId: 4, issued: "01 Oct 2026", returned: "12 Oct 2026", fine: 0 },
  { id: 12, bookId: 5, issued: "10 Sep 2026", returned: "28 Sep 2026", fine: 20 },
  { id: 13, bookId: 10, issued: "02 Aug 2026", returned: "15 Aug 2026", fine: 0 },
];

export const reservations = [
  { id: 1, bookId: 2, queue: 2, since: "14 Nov 2026" },
  { id: 2, bookId: 8, queue: 1, since: "15 Nov 2026" },
];

export const fines = [
  { id: 1, bookId: 3, days: 8, amount: 40, status: "unpaid" },
  { id: 2, bookId: 5, days: 4, amount: 20, status: "paid", paidOn: "28 Sep 2026" },
];

export const payments = [
  { id: "RC-2041", date: "28 Sep 2026", amount: 20, method: "Demo payment" },
];

export const getBook = (id) => books.find((b) => b.id === Number(id));