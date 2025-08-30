// Comprehensive request validation middleware for Edge Functions
// Security-focused validation including size limits, content-type, HMAC, rate limiting

import { Context, MiddlewareHandler } from "jsr:@hono/hono";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

// Configuration constants
const MAX_REQUEST_SIZE = 50 * 1024 * 1024; // 50MB default
const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10MB for JSON
const MAX_FORM_DATA_SIZE = 50 * 1024 * 1024; // 50MB for file uploads
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 100; // requests per window

// In-memory rate limiting store (for simple implementation)
// In production, consider using Redis or database
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface ValidationConfig {
  maxRequestSize?: number;
  maxJsonSize?: number;
  maxFormDataSize?: number;
  allowedContentTypes?: string[];
  requireContentType?: boolean;
  rateLimitEnabled?: boolean;
  rateLimitMaxRequests?: number;
  rateLimitWindow?: number;
  hmacRequired?: boolean;
  hmacHeader?: string;
  hmacSecretEnvVar?: string;
  skipPathsForAuth?: string[];
  skipPathsForRateLimit?: string[];
}

// Default configuration
const defaultConfig: ValidationConfig = {
  maxRequestSize: MAX_REQUEST_SIZE,
  maxJsonSize: MAX_JSON_SIZE,
  maxFormDataSize: MAX_FORM_DATA_SIZE,
  allowedContentTypes: [
    "application/json",
    "multipart/form-data",
    "application/x-www-form-urlencoded",
    "text/plain"
  ],
  requireContentType: true,
  rateLimitEnabled: true,
  rateLimitMaxRequests: RATE_LIMIT_MAX_REQUESTS,
  rateLimitWindow: RATE_LIMIT_WINDOW,
  hmacRequired: false,
  hmacHeader: "x-webhook-signature",
  hmacSecretEnvVar: "WEBHOOK_SECRET",
  skipPathsForAuth: ["/health", "/status"],
  skipPathsForRateLimit: ["/health"]
};

/**
 * Create validation middleware with custom configuration
 */
export function createValidationMiddleware(config: Partial<ValidationConfig> = {}): MiddlewareHandler {
  const fullConfig = { ...defaultConfig, ...config };
  
  return async (c: Context, next) => {
    try {
      // Skip validation for certain paths
      const path = c.req.path;
      const isSkippedPath = fullConfig.skipPathsForAuth?.some(skipPath => 
        path.includes(skipPath)
      );
      
      if (isSkippedPath) {
        await next();
        return;
      }

      // 1. Rate limiting
      if (fullConfig.rateLimitEnabled) {
        const rateLimitResult = await applyRateLimit(c, fullConfig);
        if (!rateLimitResult.allowed) {
          return c.json({
            error: "Rate limit exceeded",
            message: "Too many requests, please try again later",
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          }, 429);
        }
      }

      // 2. Request size validation
      const sizeResult = await validateRequestSize(c, fullConfig);
      if (!sizeResult.valid) {
        return c.json({
          error: "Request too large",
          message: sizeResult.message,
          maxSize: sizeResult.maxSize
        }, 413);
      }

      // 3. Content-Type validation
      const contentTypeResult = validateContentType(c, fullConfig);
      if (!contentTypeResult.valid) {
        return c.json({
          error: "Invalid content type",
          message: contentTypeResult.message,
          allowedTypes: fullConfig.allowedContentTypes
        }, 415);
      }

      // 4. HMAC signature validation (for webhooks)
      if (fullConfig.hmacRequired) {
        const hmacResult = await validateHmacSignature(c, fullConfig);
        if (!hmacResult.valid) {
          return c.json({
            error: "Invalid signature",
            message: hmacResult.message
          }, 401);
        }
      }

      // 5. Input sanitization and validation
      const sanitizationResult = await sanitizeRequest(c);
      if (!sanitizationResult.valid) {
        return c.json({
          error: "Invalid request data",
          message: sanitizationResult.message
        }, 400);
      }

      await next();
    } catch (error) {
      console.error("Validation middleware error:", error);
      return c.json({
        error: "Validation failed",
        message: "Internal validation error"
      }, 500);
    }
  };
}

/**
 * Apply rate limiting based on IP address and user ID
 */
async function applyRateLimit(
  c: Context, 
  config: ValidationConfig
): Promise<{ allowed: boolean; resetTime: number }> {
  try {
    const skipRateLimit = config.skipPathsForRateLimit?.some(skipPath => 
      c.req.path.includes(skipPath)
    );
    
    if (skipRateLimit) {
      return { allowed: true, resetTime: 0 };
    }

    // Create rate limit key based on IP and user (if available)
    const clientIP = c.req.header("cf-connecting-ip") || 
                    c.req.header("x-forwarded-for") || 
                    c.req.header("x-real-ip") || 
                    "unknown";
    
    const userId = c.get("userId") || "";
    const rateLimitKey = `${clientIP}:${userId}`;
    
    const now = Date.now();
    const windowStart = now - (config.rateLimitWindow || RATE_LIMIT_WINDOW);
    
    // Clean old entries
    for (const [key, data] of rateLimitStore.entries()) {
      if (data.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
    
    const current = rateLimitStore.get(rateLimitKey);
    const maxRequests = config.rateLimitMaxRequests || RATE_LIMIT_MAX_REQUESTS;
    
    if (!current) {
      // First request in window
      rateLimitStore.set(rateLimitKey, {
        count: 1,
        resetTime: now + (config.rateLimitWindow || RATE_LIMIT_WINDOW)
      });
      return { allowed: true, resetTime: 0 };
    }
    
    if (current.resetTime < now) {
      // Window expired, reset
      rateLimitStore.set(rateLimitKey, {
        count: 1,
        resetTime: now + (config.rateLimitWindow || RATE_LIMIT_WINDOW)
      });
      return { allowed: true, resetTime: 0 };
    }
    
    if (current.count >= maxRequests) {
      // Rate limit exceeded
      return { allowed: false, resetTime: current.resetTime };
    }
    
    // Increment count
    current.count++;
    rateLimitStore.set(rateLimitKey, current);
    
    return { allowed: true, resetTime: 0 };
  } catch (error) {
    console.error("Rate limit error:", error);
    // Allow request on error to prevent DoS
    return { allowed: true, resetTime: 0 };
  }
}

/**
 * Validate request size based on content type
 */
async function validateRequestSize(
  c: Context, 
  config: ValidationConfig
): Promise<{ valid: boolean; message?: string; maxSize?: number }> {
  try {
    const contentType = c.req.header("content-type") || "";
    const contentLength = parseInt(c.req.header("content-length") || "0");
    
    if (contentLength === 0) {
      return { valid: true }; // No content
    }
    
    let maxSize: number;
    
    if (contentType.includes("application/json")) {
      maxSize = config.maxJsonSize || MAX_JSON_SIZE;
    } else if (contentType.includes("multipart/form-data")) {
      maxSize = config.maxFormDataSize || MAX_FORM_DATA_SIZE;
    } else {
      maxSize = config.maxRequestSize || MAX_REQUEST_SIZE;
    }
    
    if (contentLength > maxSize) {
      return {
        valid: false,
        message: `Request size ${contentLength} bytes exceeds maximum allowed ${maxSize} bytes`,
        maxSize
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error("Size validation error:", error);
    return {
      valid: false,
      message: "Unable to validate request size"
    };
  }
}

/**
 * Validate Content-Type header
 */
function validateContentType(
  c: Context, 
  config: ValidationConfig
): { valid: boolean; message?: string } {
  try {
    const contentType = c.req.header("content-type");
    const method = c.req.method.toUpperCase();
    
    // OPTIONS requests don't need content-type
    if (method === "OPTIONS") {
      return { valid: true };
    }
    
    // GET requests don't need content-type
    if (method === "GET" || method === "HEAD" || method === "DELETE") {
      return { valid: true };
    }
    
    if (config.requireContentType && !contentType) {
      return {
        valid: false,
        message: "Content-Type header is required"
      };
    }
    
    if (contentType && config.allowedContentTypes) {
      const isAllowed = config.allowedContentTypes.some(allowed => 
        contentType.toLowerCase().includes(allowed.toLowerCase())
      );
      
      if (!isAllowed) {
        return {
          valid: false,
          message: `Content-Type '${contentType}' is not allowed`
        };
      }
    }
    
    return { valid: true };
  } catch (error) {
    console.error("Content-type validation error:", error);
    return {
      valid: false,
      message: "Unable to validate content-type"
    };
  }
}

/**
 * Validate HMAC signature for webhooks
 */
async function validateHmacSignature(
  c: Context, 
  config: ValidationConfig
): Promise<{ valid: boolean; message?: string }> {
  try {
    const signature = c.req.header(config.hmacHeader || "x-webhook-signature");
    
    if (!signature) {
      return {
        valid: false,
        message: `Missing ${config.hmacHeader} header`
      };
    }
    
    const secret = Deno.env.get(config.hmacSecretEnvVar || "WEBHOOK_SECRET");
    if (!secret) {
      console.error(`HMAC secret not found in environment variable: ${config.hmacSecretEnvVar}`);
      return {
        valid: false,
        message: "Webhook secret not configured"
      };
    }
    
    // Get raw body for signature verification
    const body = await c.req.text();
    
    // Create HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computedSignature = "sha256=" + Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    
    // Compare signatures using timing-safe comparison
    if (!timingSafeEqual(signature, computedSignature)) {
      return {
        valid: false,
        message: "Invalid HMAC signature"
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error("HMAC validation error:", error);
    return {
      valid: false,
      message: "HMAC validation failed"
    };
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Sanitize and validate request data
 */
async function sanitizeRequest(c: Context): Promise<{ valid: boolean; message?: string }> {
  try {
    const contentType = c.req.header("content-type") || "";
    const method = c.req.method.toUpperCase();
    
    // Skip for methods that don't have body
    if (method === "GET" || method === "HEAD" || method === "DELETE" || method === "OPTIONS") {
      return { valid: true };
    }
    
    // Validate JSON payloads
    if (contentType.includes("application/json")) {
      try {
        const body = await c.req.text();
        if (body.trim()) {
          const json = JSON.parse(body);
          
          // Basic JSON structure validation
          if (typeof json !== "object" || json === null) {
            return {
              valid: false,
              message: "Invalid JSON structure"
            };
          }
          
          // Check for potentially dangerous patterns
          const jsonString = JSON.stringify(json);
          const dangerousPatterns = [
            /__proto__/,
            /constructor/,
            /prototype/,
            /<script/i,
            /javascript:/i,
            /eval\(/,
            /function\(/
          ];
          
          for (const pattern of dangerousPatterns) {
            if (pattern.test(jsonString)) {
              return {
                valid: false,
                message: "Request contains potentially dangerous content"
              };
            }
          }
        }
      } catch (jsonError) {
        return {
          valid: false,
          message: "Invalid JSON format"
        };
      }
    }
    
    return { valid: true };
  } catch (error) {
    console.error("Request sanitization error:", error);
    return {
      valid: false,
      message: "Unable to validate request data"
    };
  }
}

/**
 * Middleware specifically for webhook endpoints with HMAC validation
 */
export function createWebhookValidationMiddleware(config: Partial<ValidationConfig> = {}): MiddlewareHandler {
  return createValidationMiddleware({
    ...config,
    hmacRequired: true,
    requireContentType: true,
    allowedContentTypes: ["application/json"],
    rateLimitMaxRequests: 1000, // Higher limit for webhooks
  });
}

/**
 * Middleware for file upload endpoints
 */
export function createUploadValidationMiddleware(config: Partial<ValidationConfig> = {}): MiddlewareHandler {
  return createValidationMiddleware({
    ...config,
    maxRequestSize: 100 * 1024 * 1024, // 100MB for uploads
    maxFormDataSize: 100 * 1024 * 1024,
    allowedContentTypes: ["multipart/form-data"],
    requireContentType: true,
    rateLimitMaxRequests: 50, // Lower limit for uploads
  });
}

/**
 * Middleware for API endpoints with standard validation
 */
export function createApiValidationMiddleware(config: Partial<ValidationConfig> = {}): MiddlewareHandler {
  return createValidationMiddleware({
    ...config,
    allowedContentTypes: [
      "application/json",
      "application/x-www-form-urlencoded"
    ],
    rateLimitMaxRequests: 200,
  });
}

// Export rate limit status check for monitoring
export function getRateLimitStatus(clientIP: string, userId: string = ""): {
  remaining: number;
  resetTime: number;
  isLimited: boolean;
} {
  const rateLimitKey = `${clientIP}:${userId}`;
  const current = rateLimitStore.get(rateLimitKey);
  
  if (!current) {
    return {
      remaining: RATE_LIMIT_MAX_REQUESTS,
      resetTime: Date.now() + RATE_LIMIT_WINDOW,
      isLimited: false
    };
  }
  
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - current.count);
  const isLimited = current.count >= RATE_LIMIT_MAX_REQUESTS && current.resetTime > Date.now();
  
  return {
    remaining,
    resetTime: current.resetTime,
    isLimited
  };
}