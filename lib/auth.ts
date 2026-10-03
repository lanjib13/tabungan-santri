import { z } from "zod";
import { apiRequest } from "./api";

export const profileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  role: z.enum(["super_admin", "admin", "user"]),
  status: z.enum(["active", "inactive"]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type AuthProfile = z.infer<typeof profileSchema>;

const loginResponseSchema = z.object({ profile: profileSchema });

export async function login(username: string, password: string): Promise<AuthProfile> {
  const result = await apiRequest("/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return result.profile;
}

export async function getCurrentProfile(): Promise<AuthProfile> {
  const result = await apiRequest("/auth/me", loginResponseSchema);
  return result.profile;
}

export async function logout(): Promise<void> {
  await apiRequest("/auth/logout", z.object({}), { method: "POST" });
}
