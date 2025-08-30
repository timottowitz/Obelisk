// Security configuration for Edge Functions
// Centralized security settings and validation rules

export interface SecurityConfig {
  // Request size limits
  maxRequestSize: number;
  maxJsonSize: number;
  maxFormDataSize: number;
  maxFileSize: number;
  
  // Rate limiting
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
  uploadRateLimitMaxRequests: number;
  webhookRateLimitMaxRequests: number;
  
  // Content validation
  allowedMimeTypes: string[];
  allowedContentTypes: string[];
  
  // HMAC settings
  hmacSecretEnvVar: string;
  hmacHeader: string;
  
  // Environment settings
  isDevelopment: boolean;
  
  // Security headers
  securityHeaders: Record<string, string>;
}

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  // Size limits (in bytes)
  maxRequestSize: 50 * 1024 * 1024, // 50MB
  maxJsonSize: 10 * 1024 * 1024, // 10MB
  maxFormDataSize: 100 * 1024 * 1024, // 100MB
  maxFileSize: 50 * 1024 * 1024, // 50MB for individual files
  
  // Rate limiting (per minute)
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMaxRequests: 100,
  uploadRateLimitMaxRequests: 20,
  webhookRateLimitMaxRequests: 1000,
  
  // Allowed file types for uploads
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/webp'
  ],
  
  // Allowed content types for requests
  allowedContentTypes: [
    'application/json',
    'multipart/form-data',
    'application/x-www-form-urlencoded',
    'text/plain'
  ],
  
  // HMAC configuration
  hmacSecretEnvVar: 'WEBHOOK_SECRET',
  hmacHeader: 'x-webhook-signature',
  
  // Environment detection
  isDevelopment: Deno.env.get("ENVIRONMENT") === "development",
  
  // Security headers to add to responses
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }
};

// Environment-specific configurations
export const SECURITY_CONFIGS = {
  development: {
    ...DEFAULT_SECURITY_CONFIG,
    rateLimitMaxRequests: 1000, // More lenient for development
    uploadRateLimitMaxRequests: 100,
  },
  
  staging: {
    ...DEFAULT_SECURITY_CONFIG,
    rateLimitMaxRequests: 200,
    uploadRateLimitMaxRequests: 50,
  },
  
  production: {
    ...DEFAULT_SECURITY_CONFIG,
    // Production uses default strict settings
  }
};

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const environment = Deno.env.get("ENVIRONMENT") || "production";
  
  switch (environment.toLowerCase()) {
    case "development":
      return SECURITY_CONFIGS.development;
    case "staging":
      return SECURITY_CONFIGS.staging;
    case "production":
    default:
      return SECURITY_CONFIGS.production;
  }
}

/**
 * Validate environment variables required for security
 */
export function validateSecurityEnvironment(): {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
} {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const optionalVars = [
    'WEBHOOK_SECRET', // Required only if using webhooks
    'GCS_JSON_KEY',
    'GCS_BUCKET_NAME'
  ];
  
  const missingVars: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables
  for (const varName of requiredVars) {
    if (!Deno.env.get(varName)) {
      missingVars.push(varName);
    }
  }
  
  // Check optional variables and warn if missing
  for (const varName of optionalVars) {
    if (!Deno.env.get(varName)) {
      warnings.push(`Optional environment variable '${varName}' is not set`);
    }
  }
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
    warnings
  };
}

/**
 * Sanitize error messages for production
 */
export function sanitizeErrorMessage(error: Error | string, isDevelopment: boolean = false): string {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  if (isDevelopment) {
    return errorMessage;
  }
  
  // In production, return generic messages for certain error types
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /key/i,
    /token/i,
    /credential/i,
    /database/i,
    /connection/i
  ];
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(errorMessage)) {
      return "Internal server error";
    }
  }
  
  return errorMessage;
}

/**
 * Generate security headers for responses
 */
export function getSecurityHeaders(config?: Partial<SecurityConfig>): Record<string, string> {
  const securityConfig = config || getSecurityConfig();
  return securityConfig.securityHeaders;
}

/**
 * Log security events
 */
export function logSecurityEvent(event: {
  type: 'RATE_LIMIT_EXCEEDED' | 'INVALID_HMAC' | 'FILE_TYPE_BLOCKED' | 'SIZE_LIMIT_EXCEEDED' | 'SUSPICIOUS_REQUEST';
  clientIP?: string;
  userId?: string;
  details?: Record<string, any>;
  timestamp?: string;
}) {
  const logEntry = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
    level: 'SECURITY',
  };
  
  // In a real implementation, you might send this to a security monitoring service
  console.log('SECURITY_EVENT:', JSON.stringify(logEntry));
}

/**
 * Check if a file type is allowed
 */
export function isFileTypeAllowed(mimeType: string, config?: SecurityConfig): boolean {
  const securityConfig = config || getSecurityConfig();
  return securityConfig.allowedMimeTypes.includes(mimeType);
}

/**
 * Check if request size is within limits
 */
export function isRequestSizeAllowed(
  size: number, 
  contentType: string, 
  config?: SecurityConfig
): { allowed: boolean; limit: number } {
  const securityConfig = config || getSecurityConfig();
  
  let limit: number;
  
  if (contentType.includes('application/json')) {
    limit = securityConfig.maxJsonSize;
  } else if (contentType.includes('multipart/form-data')) {
    limit = securityConfig.maxFormDataSize;
  } else {
    limit = securityConfig.maxRequestSize;
  }
  
  return {
    allowed: size <= limit,
    limit
  };
}