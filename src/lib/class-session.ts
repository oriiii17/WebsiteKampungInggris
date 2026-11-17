export type ClassSessionStatus = "open" | "closed";
export type GuestStatus = "pending" | "approved";

export interface StoredClassSession {
  id: string;
  code: string;
  title: string;
  teacherId: string;
  teacherName: string;
  status: ClassSessionStatus;
  requireApproval: boolean;
  capacity: number | null;
  materialLinks: string[];
  gameIds: string[];
  createdAt: string;
  closedAt?: string;
}

export interface ClassSessionAttendance {
  id: string;
  sessionId: string;
  participantKey: string;
  participantName: string;
  participantType: "guest" | "member";
  guestRegistrationId?: string;
  whatsapp?: string;
  attendedAt: string;
}

export interface StoredClassSessionGuest {
  id: string;
  sessionId: string;
  name: string;
  whatsapp: string;
  status: GuestStatus;
  registeredAt: string;
}

export function normalizeClassCode(value: unknown): string {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function validateGuestRegistration(name: unknown, whatsapp: unknown): { name: string; whatsapp: string } | null {
  const cleanName = String(name || "").trim().replace(/\s+/g, " ");
  const cleanWhatsapp = String(whatsapp || "").trim().replace(/[\s().-]/g, "");
  if (cleanName.length < 2 || cleanName.length > 80) return null;
  if (!/^\+?[0-9]{9,15}$/.test(cleanWhatsapp)) return null;
  return { name: cleanName, whatsapp: cleanWhatsapp };
}

export function classSessionJoinUrl(origin: string, code: unknown): string {
  return `${origin.replace(/\/$/, "")}/sesi/${normalizeClassCode(code)}`;
}

export function resolveGuestEntry(status: ClassSessionStatus, capacity: number | null, attendeeCount: number, requireApproval: boolean): "closed" | "full" | "pending" | "approved" {
  if (status !== "open") return "closed";
  if (capacity !== null && attendeeCount >= capacity) return "full";
  return requireApproval ? "pending" : "approved";
}
