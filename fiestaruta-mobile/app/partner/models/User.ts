export type UserRole = "partner" | "admin";

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
}