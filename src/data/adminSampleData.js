// Legacy fixtures retained for local UI examples; application pages use the API.
// Money is in rupees here for readability; the API sends paise.
import { books } from "./sampleData";

export { books };
export const getBook = (id) => books.find((b) => b.id === Number(id));

export const members = [
  { id: "M-1001", name: "Aarav Patil", email: "aarav@mail.com", type: "Student", status: "Active", loans: 3, fines: 40, joined: "Jul 2024", maxLoans: 5 },
  { id: "M-1002", name: "Neha Kulkarni", email: "neha@mail.com", type: "Faculty", status: "Active", loans: 1, fines: 0, joined: "Jan 2023", maxLoans: 10 },
  { id: "M-1003", name: "Rohan Deshmukh", email: "rohan@mail.com", type: "Student", status: "Suspended", loans: 4, fines: 120, joined: "Aug 2024", maxLoans: 5 },
  { id: "M-1004", name: "Sneha Joshi", email: "sneha@mail.com", type: "Public", status: "Active", loans: 0, fines: 0, joined: "Mar 2025", maxLoans: 3 },
  { id: "M-1005", name: "Vikram More", email: "vikram@mail.com", type: "Student", status: "Active", loans: 3, fines: 15, joined: "Jun 2025", maxLoans: 5 },
  { id: "M-1006", name: "Isha Bhosale", email: "isha@mail.com", type: "Student", status: "Active", loans: 2, fines: 0, joined: "Sep 2025", maxLoans: 5 },
];

// Books currently out, used by the return desk
export const openLoans = [
  { id: 1, memberId: "M-1001", bookId: 3, issued: "28 Oct 2026", due: "10 Nov 2026", daysLate: 8 },
  { id: 2, memberId: "M-1003", bookId: 8, issued: "20 Oct 2026", due: "03 Nov 2026", daysLate: 15 },
  { id: 3, memberId: "M-1005", bookId: 4, issued: "30 Oct 2026", due: "13 Nov 2026", daysLate: 5 },
  { id: 4, memberId: "M-1002", bookId: 6, issued: "14 Nov 2026", due: "28 Nov 2026", daysLate: 0 },
];

export const activity = [
  { member: "Aarav Patil", book: "The Pragmatic Programmer", action: "Issued", time: "10 min ago" },
  { member: "Neha Kulkarni", book: "A Brief History of Time", action: "Returned", time: "32 min ago" },
  { member: "Rohan Deshmukh", book: "Deep Work", action: "Overdue", time: "1 hr ago" },
  { member: "Sneha Joshi", book: "Sapiens", action: "Reserved", time: "2 hr ago" },
  { member: "Isha Bhosale", book: "Cosmos", action: "Issued", time: "3 hr ago" },
];

export const reservations = [
  { id: 1, member: "Sneha Joshi", bookId: 2, queue: 1, requested: "14 Nov 2026", status: "waiting" },
  { id: 2, member: "Neha Kulkarni", bookId: 2, queue: 2, requested: "16 Nov 2026", status: "waiting" },
  { id: 3, member: "Vikram More", bookId: 8, queue: 1, requested: "15 Nov 2026", status: "ready" },
  { id: 4, member: "Isha Bhosale", bookId: 6, queue: 1, requested: "17 Nov 2026", status: "waiting" },
];

export const fines = [
  { id: 1, member: "Rohan Deshmukh", bookId: 8, days: 15, amount: 75, status: "unpaid" },
  { id: 2, member: "Aarav Patil", bookId: 3, days: 8, amount: 40, status: "unpaid" },
  { id: 3, member: "Vikram More", bookId: 4, days: 3, amount: 15, status: "unpaid" },
  { id: 4, member: "Neha Kulkarni", bookId: 9, days: 5, amount: 25, status: "paid" },
  { id: 5, member: "Isha Bhosale", bookId: 5, days: 2, amount: 10, status: "waived" },
];

export const circulation = {
  week: [
    { label: "Mon", issued: 40, returned: 33 },
    { label: "Tue", issued: 65, returned: 48 },
    { label: "Wed", issued: 52, returned: 55 },
    { label: "Thu", issued: 80, returned: 61 },
    { label: "Fri", issued: 70, returned: 66 },
    { label: "Sat", issued: 95, returned: 72 },
    { label: "Sun", issued: 60, returned: 50 },
  ],
  month: [
    { label: "Week 1", issued: 310, returned: 280 },
    { label: "Week 2", issued: 365, returned: 330 },
    { label: "Week 3", issued: 402, returned: 371 },
    { label: "Week 4", issued: 340, returned: 352 },
  ],
};

export const mostBorrowed = [
  { bookId: 3, times: 128 },
  { bookId: 1, times: 112 },
  { bookId: 10, times: 97 },
  { bookId: 7, times: 85 },
  { bookId: 5, times: 71 },
];

export const categorySplit = [
  { name: "Technology", pct: 32 },
  { name: "Fiction", pct: 24 },
  { name: "Self Help", pct: 18 },
  { name: "Science", pct: 15 },
  { name: "History", pct: 11 },
];

export const defaultSettings = {
  loanDaysStudent: 14, loanDaysFaculty: 30, loanDaysPublic: 14,
  maxRenewals: 2, renewDays: 7, finePerDay: 5, maxFinePerBook: 500,
  holdHours: 48, reminderDays: 2,
  selfCheckout: false, emailReminders: true, autoSuspend: true,
};