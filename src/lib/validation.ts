import { z } from "zod";

export const qty = z
  .number()
  .positive("Quantity must be greater than 0")
  .multipleOf(0.25, "Quantity must be in steps of 0.25");

export const price = z.number().nonnegative("Price cannot be negative");

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  unit: z.string().min(1).default("pack"),
  sellingPrice: price,
  categoryId: z.string().min(1),
  lowStockThreshold: z.number().nonnegative().default(5),
});

export const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  sellingPrice: price.optional(),
  categoryId: z.string().min(1).optional(),
  lowStockThreshold: z.number().nonnegative().optional(),
});

export const purchaseSchema = z.object({
  supplierId: z.string().min(1),
  note: z.string().optional(),
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: qty, unitCost: price }))
    .min(1, "Add at least one item"),
});

export const saleSchema = z.object({
  customerId: z.string().optional(),
  amountPaid: z.number().nonnegative().default(0),
  paidInFull: z.boolean().optional(),
  note: z.string().optional(),
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: qty, unitPrice: price }))
    .min(1, "Add at least one item"),
});

export const adjustmentSchema = z.object({
  productId: z.string().min(1),
  delta: z
    .number()
    .refine((n) => n !== 0, "Adjustment cannot be zero")
    .refine((n) => Number.isInteger(n / 0.25), "Must be in steps of 0.25"),
  reason: z.string().min(1),
});

export const expenseSchema = z.object({
  title: z.string().min(1),
  amount: price,
  category: z.string().min(1).default("General"),
  note: z.string().optional(),
});

export const partySchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export const categorySchema = z.object({ name: z.string().min(1) });

export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "SALESPERSON"]).default("SALESPERSON"),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
  role: z.enum(["ADMIN", "SALESPERSON"]).optional(),
  canEditSale: z.boolean().optional(),
  canCancelSale: z.boolean().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});
