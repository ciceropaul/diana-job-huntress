export const STATUSES = [
  "saved",
  "applied",
  "phone_screen",
  "interviewing",
  "offer",
  "closed",
] as const;

export type AppStatus = (typeof STATUSES)[number];

export const statusLabel: Record<AppStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  phone_screen: "Phone Screen",
  interviewing: "Interviewing",
  offer: "Offer",
  closed: "Closed",
};

export const statusColor: Record<AppStatus, string> = {
  saved: "border-slate-700",
  applied: "border-blue-700",
  phone_screen: "border-yellow-700",
  interviewing: "border-purple-700",
  offer: "border-green-700",
  closed: "border-red-700",
};
