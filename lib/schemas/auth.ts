import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
  role: z.enum(["user", "caretaker"]),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const linkSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "6-character code"),
});

export const eventSchema = z.object({
  type: z.enum(["checkin", "voice", "sos"]),
  payload: z
    .record(z.string(), z.unknown())
    // Bound stored size — the feed is personal check-ins, not a blob store.
    .refine((p) => JSON.stringify(p).length <= 2000, "payload too large"),
});

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
});
