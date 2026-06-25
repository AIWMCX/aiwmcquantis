import { z } from 'zod';

// ============= Security Utilities =============

/**
 * Sanitizes input string by removing potentially dangerous characters
 * Prevents XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>{}]/g, '')  // Remove dangerous chars
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validates that input doesn't contain dangerous patterns
 */
const noXssPattern = /^[^<>{}]*$/;
const noDangerousChars = z.string().regex(noXssPattern, "Invalid characters detected");

// ============= Analysis Input Schemas =============

export const analysisInputSchema = z.object({
  idea: z.string()
    .trim()
    .min(10, "Business idea must be at least 10 characters")
    .max(20000, "Business idea must not exceed 20,000 characters")
    .refine(val => noXssPattern.test(val), "Invalid characters in business idea"),
  
  location: z.string()
    .trim()
    .min(2, "Location must be at least 2 characters")
    .max(200, "Location must not exceed 200 characters")
    .refine(val => noXssPattern.test(val), "Invalid characters in location"),
  
  industry: z.string()
    .max(100)
    .optional(),
  
  budget: z.number()
    .min(0, "Budget cannot be negative")
    .max(100000000, "Budget exceeds maximum allowed")
    .optional(),
  
  timeframe: z.number()
    .min(1, "Timeframe must be at least 1 month")
    .max(120, "Timeframe cannot exceed 120 months")
    .optional(),
});

export type AnalysisInput = z.infer<typeof analysisInputSchema>;

// ============= Financial Input Schemas =============

export const financialInputSchema = z.object({
  startup_investment: z.number()
    .min(0, "Investment cannot be negative")
    .max(100000000, "Investment exceeds maximum")
    .optional(),
  
  monthly_revenue: z.number()
    .min(0, "Revenue cannot be negative")
    .max(100000000, "Revenue exceeds maximum")
    .optional(),
  
  average_price: z.number()
    .min(0, "Price cannot be negative")
    .max(1000000, "Price exceeds maximum")
    .optional(),
  
  expected_customers: z.number()
    .min(0, "Customers cannot be negative")
    .max(10000000, "Customer count exceeds maximum")
    .int("Customer count must be a whole number")
    .optional(),
  
  monthly_costs: z.number()
    .min(0, "Costs cannot be negative")
    .max(100000000, "Costs exceed maximum")
    .optional(),
  
  cac: z.number()
    .min(0, "CAC cannot be negative")
    .max(100000, "CAC exceeds maximum")
    .optional(),
  
  churn_rate: z.number()
    .min(0, "Churn rate cannot be negative")
    .max(100, "Churn rate cannot exceed 100%")
    .optional(),
});

export type FinancialInput = z.infer<typeof financialInputSchema>;

// ============= User Profile Schemas =============

const phonePattern = /^\+?[0-9]{7,15}$/;

export const profileSchema = z.object({
  full_name: z.string()
    .trim()
    .max(100, "Name cannot exceed 100 characters")
    .refine(val => !val || noXssPattern.test(val), "Invalid characters in name")
    .optional()
    .nullable(),
  
  phone: z.string()
    .refine(val => !val || phonePattern.test(val), "Invalid phone format. Use 7-15 digits with optional + prefix")
    .optional()
    .nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// ============= Authentication Schemas =============

export const signUpSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must not exceed 255 characters")
    .toLowerCase(),
  
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must not exceed 72 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  
  fullName: z.string()
    .trim()
    .max(100, "Name cannot exceed 100 characters")
    .refine(val => !val || noXssPattern.test(val), "Invalid characters in name")
    .optional(),
  
  phone: z.string()
    .refine(val => !val || phonePattern.test(val), "Invalid phone format")
    .optional()
    .nullable(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must not exceed 255 characters")
    .toLowerCase(),
  
  password: z.string()
    .min(1, "Password is required")
    .max(72, "Password must not exceed 72 characters"),
});

export type SignInInput = z.infer<typeof signInSchema>;

// ============= Document Upload Schemas =============

const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
];

const maxFileSizeBytes = 10 * 1024 * 1024; // 10MB

export const documentUploadSchema = z.object({
  name: z.string()
    .trim()
    .max(255, "Filename too long")
    .refine(val => noXssPattern.test(val), "Invalid characters in filename"),
  
  type: z.string()
    .refine(val => allowedMimeTypes.includes(val), "Unsupported file type"),
  
  size: z.number()
    .max(maxFileSizeBytes, "File size exceeds 10MB limit"),
});

export type DocumentUpload = z.infer<typeof documentUploadSchema>;

// ============= Validation Helpers =============

/**
 * Safely validates input and returns result with errors
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => 
    `${err.path.join('.')}: ${err.message}`
  );
  
  return { success: false, errors };
}

/**
 * Validates and sanitizes analysis input
 */
export function validateAnalysisInput(data: unknown): { 
  success: true; 
  data: AnalysisInput;
  sanitized: { idea: string; location: string };
} | { 
  success: false; 
  errors: string[];
} {
  const result = analysisInputSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    );
    return { success: false, errors };
  }
  
  // Additional sanitization
  const sanitized = {
    idea: sanitizeInput(result.data.idea),
    location: sanitizeInput(result.data.location),
  };
  
  return { success: true, data: result.data, sanitized };
}
