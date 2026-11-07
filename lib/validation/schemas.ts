import { z } from "zod";

// Shared between API route handlers (server-side) and forms (client-side),
// so the same rules are enforced in both places.

export const marketSearchSchema = z.object({
  query: z.string().trim().min(1, "Enter a search term").max(100),
});

export const trackMarketSchema = z.object({
  ticker: z.string().trim().min(1).max(200),
});

export const predictionInputSchema = z.object({
  marketId: z.string().min(1, "Market is required"),
  predictedProb: z
    .number({ invalid_type_error: "Probability must be a number" })
    .min(0, "Probability must be at least 0")
    .max(1, "Probability must be at most 1"),
  reasoning: z
    .string()
    .trim()
    .max(2000, "Reasoning must be 2000 characters or fewer")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const predictionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["all", "pending", "resolved"]).default("all"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type PredictionInput = z.infer<typeof predictionInputSchema>;
export type PredictionListQuery = z.infer<typeof predictionListQuerySchema>;
