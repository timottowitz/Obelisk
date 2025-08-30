// Error Handling and Retry Logic for DocETL Job Processing
// Provides comprehensive error handling, classification, and retry mechanisms

export type ErrorCategory = 
  | 'network'
  | 'timeout'
  | 'resource'
  | 'validation'
  | 'permission'
  | 'rate_limit'
  | 'processing'
  | 'system'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DocETLError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  retryable: boolean;
  retry_delay?: number; // milliseconds
  max_retries?: number;
  timestamp: string;
}

export interface RetryConfig {
  max_attempts: number;
  base_delay: number; // milliseconds
  max_delay: number; // milliseconds
  backoff_factor: number;
  retry_on_categories: ErrorCategory[];
}

/**
 * Error classification and analysis
 */
export class DocETLErrorClassifier {
  /**
   * Classify an error into category and severity
   */
  static classifyError(error: Error | any): DocETLError {
    const timestamp = new Date().toISOString();
    const message = error?.message || String(error);
    const stack = error?.stack;
    
    // Network errors
    if (this.isNetworkError(error, message)) {
      return {
        category: 'network',
        severity: 'medium',
        message: `Network error: ${message}`,
        details: { original_error: message, stack },
        retryable: true,
        retry_delay: 5000,
        max_retries: 3,
        timestamp
      };
    }
    
    // Timeout errors
    if (this.isTimeoutError(error, message)) {
      return {
        category: 'timeout',
        severity: 'medium',
        message: `Timeout error: ${message}`,
        details: { original_error: message, stack },
        retryable: true,
        retry_delay: 10000,
        max_retries: 2,
        timestamp
      };
    }
    
    // Resource errors (out of memory, disk space, etc.)
    if (this.isResourceError(error, message)) {
      return {
        category: 'resource',
        severity: 'high',
        message: `Resource error: ${message}`,
        details: { original_error: message, stack },
        retryable: true,
        retry_delay: 30000,
        max_retries: 2,
        timestamp
      };
    }
    
    // Validation errors
    if (this.isValidationError(error, message)) {
      return {
        category: 'validation',
        severity: 'medium',
        message: `Validation error: ${message}`,
        details: { original_error: message, stack },
        retryable: false,
        timestamp
      };
    }
    
    // Permission errors
    if (this.isPermissionError(error, message)) {
      return {
        category: 'permission',
        severity: 'high',
        message: `Permission error: ${message}`,
        details: { original_error: message, stack },
        retryable: false,
        timestamp
      };
    }
    
    // Rate limit errors
    if (this.isRateLimitError(error, message)) {
      return {
        category: 'rate_limit',
        severity: 'medium',
        message: `Rate limit error: ${message}`,
        details: { original_error: message, stack },
        retryable: true,
        retry_delay: 60000, // 1 minute
        max_retries: 3,
        timestamp
      };
    }
    
    // Processing errors (DocETL specific)
    if (this.isProcessingError(error, message)) {
      return {
        category: 'processing',
        severity: 'medium',
        message: `Processing error: ${message}`,
        details: { original_error: message, stack },
        retryable: true,
        retry_delay: 15000,
        max_retries: 2,
        timestamp
      };
    }
    
    // System errors
    if (this.isSystemError(error, message)) {
      return {
        category: 'system',
        severity: 'high',
        message: `System error: ${message}`,
        details: { original_error: message, stack },
        retryable: true,
        retry_delay: 20000,
        max_retries: 2,
        timestamp
      };
    }
    
    // Default unknown error
    return {
      category: 'unknown',
      severity: 'medium',
      message: `Unknown error: ${message}`,
      details: { original_error: message, stack },
      retryable: true,
      retry_delay: 10000,
      max_retries: 1,
      timestamp
    };
  }
  
  private static isNetworkError(error: any, message: string): boolean {
    return (
      error?.name === 'NetworkError' ||
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      message.includes('ETIMEDOUT')
    );
  }
  
  private static isTimeoutError(error: any, message: string): boolean {
    return (
      error?.name === 'TimeoutError' ||
      message.includes('timeout') ||
      message.includes('timed out') ||
      error?.code === 'TIMEOUT'
    );
  }
  
  private static isResourceError(error: any, message: string): boolean {
    return (
      message.includes('out of memory') ||
      message.includes('disk space') ||
      message.includes('ENOMEM') ||
      message.includes('ENOSPC') ||
      message.includes('resource unavailable')
    );
  }
  
  private static isValidationError(error: any, message: string): boolean {
    return (
      error?.name === 'ValidationError' ||
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('malformed') ||
      message.includes('bad request') ||
      error?.status === 400
    );
  }
  
  private static isPermissionError(error: any, message: string): boolean {
    return (
      error?.status === 401 ||
      error?.status === 403 ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('permission denied') ||
      message.includes('access denied')
    );
  }
  
  private static isRateLimitError(error: any, message: string): boolean {
    return (
      error?.status === 429 ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('quota exceeded')
    );
  }
  
  private static isProcessingError(error: any, message: string): boolean {
    return (
      message.includes('docetl') ||
      message.includes('extraction') ||
      message.includes('transformation') ||
      message.includes('pipeline') ||
      message.includes('document processing')
    );
  }
  
  private static isSystemError(error: any, message: string): boolean {
    return (
      error?.name === 'SystemError' ||
      message.includes('internal server error') ||
      message.includes('service unavailable') ||
      error?.status === 500 ||
      error?.status === 503
    );
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryHandler {
  private config: RetryConfig;
  
  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      max_attempts: 3,
      base_delay: 1000,
      max_delay: 60000,
      backoff_factor: 2,
      retry_on_categories: ['network', 'timeout', 'resource', 'rate_limit', 'processing', 'system'],
      ...config
    };
  }
  
  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: DocETLError;
    
    for (let attempt = 1; attempt <= this.config.max_attempts; attempt++) {
      try {
        const result = await operation();
        
        // If we succeeded after retries, log it
        if (attempt > 1) {
          console.log(`Operation succeeded on attempt ${attempt}${context ? ` (${context})` : ''}`);
        }
        
        return result;
      } catch (error) {
        const classifiedError = DocETLErrorClassifier.classifyError(error);
        lastError = classifiedError;
        
        // Check if we should retry
        const shouldRetry = this.shouldRetry(classifiedError, attempt);
        
        if (!shouldRetry) {
          console.error(`Operation failed permanently on attempt ${attempt}${context ? ` (${context})` : ''}:`, classifiedError);
          throw new DocETLProcessingError(classifiedError);
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, classifiedError);
        
        console.warn(`Operation failed on attempt ${attempt}${context ? ` (${context})` : ''}, retrying in ${delay}ms:`, {
          category: classifiedError.category,
          severity: classifiedError.severity,
          message: classifiedError.message
        });
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new DocETLProcessingError(lastError!);
  }
  
  private shouldRetry(error: DocETLError, attempt: number): boolean {
    return (
      attempt < this.config.max_attempts &&
      error.retryable &&
      this.config.retry_on_categories.includes(error.category)
    );
  }
  
  private calculateDelay(attempt: number, error: DocETLError): number {
    // Use error-specific delay if available
    let baseDelay = error.retry_delay || this.config.base_delay;
    
    // Apply exponential backoff
    const delay = baseDelay * Math.pow(this.config.backoff_factor, attempt - 1);
    
    // Add jitter (random 0-25% variation)
    const jitter = delay * 0.25 * Math.random();
    
    // Apply max delay limit
    return Math.min(delay + jitter, this.config.max_delay);
  }
}

/**
 * Custom error class for DocETL processing errors
 */
export class DocETLProcessingError extends Error {
  public readonly errorDetails: DocETLError;
  
  constructor(errorDetails: DocETLError) {
    super(errorDetails.message);
    this.name = 'DocETLProcessingError';
    this.errorDetails = errorDetails;
    
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, DocETLProcessingError.prototype);
  }
  
  toJSON(): any {
    return {
      name: this.name,
      message: this.message,
      ...this.errorDetails
    };
  }
}

/**
 * Error recovery strategies
 */
export class ErrorRecoveryManager {
  private supabase: any;
  private schema: string;
  
  constructor(supabase: any, schema: string) {
    this.supabase = supabase;
    this.schema = schema;
  }
  
  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(jobId: string, error: DocETLError): Promise<boolean> {
    console.log(`Attempting recovery for job ${jobId}, error category: ${error.category}`);
    
    try {
      switch (error.category) {
        case 'resource':
          return await this.recoverFromResourceError(jobId, error);
        case 'rate_limit':
          return await this.recoverFromRateLimitError(jobId, error);
        case 'processing':
          return await this.recoverFromProcessingError(jobId, error);
        default:
          return false;
      }
    } catch (recoveryError) {
      console.error(`Recovery attempt failed for job ${jobId}:`, recoveryError);
      return false;
    }
  }
  
  private async recoverFromResourceError(jobId: string, error: DocETLError): Promise<boolean> {
    // For resource errors, we might try reducing processing parameters
    await this.supabase.rpc('create_doc_intel_job_log', {
      p_job_id: jobId,
      p_level: 'info',
      p_message: 'Attempting resource error recovery by reducing processing parameters'
    });
    
    // Update job metadata to use reduced processing
    await this.supabase
      .schema(this.schema)
      .from('doc_intel_job_queue')
      .update({
        metadata: {
          recovery_mode: true,
          reduced_processing: true,
          original_error: error
        }
      })
      .eq('id', jobId);
    
    return true;
  }
  
  private async recoverFromRateLimitError(jobId: string, error: DocETLError): Promise<boolean> {
    // For rate limit errors, we just need to wait longer
    await this.supabase.rpc('create_doc_intel_job_log', {
      p_job_id: jobId,
      p_level: 'info',
      p_message: 'Scheduling retry after rate limit cooldown'
    });
    
    // The retry handler will take care of the delay
    return true;
  }
  
  private async recoverFromProcessingError(jobId: string, error: DocETLError): Promise<boolean> {
    // For processing errors, try alternative processing methods
    await this.supabase.rpc('create_doc_intel_job_log', {
      p_job_id: jobId,
      p_level: 'info',
      p_message: 'Attempting processing error recovery with fallback methods'
    });
    
    // Update job to use fallback processing
    await this.supabase
      .schema(this.schema)
      .from('doc_intel_job_queue')
      .update({
        metadata: {
          use_fallback: true,
          original_error: error
        }
      })
      .eq('id', jobId);
    
    return true;
  }
}

/**
 * Comprehensive error handler that combines classification, retry, and recovery
 */
export class ComprehensiveErrorHandler {
  private retryHandler: RetryHandler;
  private recoveryManager: ErrorRecoveryManager;
  private supabase: any;
  private schema: string;
  
  constructor(supabase: any, schema: string, retryConfig?: Partial<RetryConfig>) {
    this.supabase = supabase;
    this.schema = schema;
    this.retryHandler = new RetryHandler(retryConfig);
    this.recoveryManager = new ErrorRecoveryManager(supabase, schema);
  }
  
  /**
   * Handle an error for a specific job
   */
  async handleJobError(jobId: string, error: Error | any): Promise<DocETLError> {
    // Classify the error
    const classifiedError = DocETLErrorClassifier.classifyError(error);
    
    // Log the error
    await this.logError(jobId, classifiedError);
    
    // Attempt recovery if appropriate
    if (classifiedError.retryable && classifiedError.severity !== 'critical') {
      const recovered = await this.recoveryManager.attemptRecovery(jobId, classifiedError);
      if (recovered) {
        await this.supabase.rpc('create_doc_intel_job_log', {
          p_job_id: jobId,
          p_level: 'info',
          p_message: 'Error recovery completed successfully'
        });
      }
    }
    
    return classifiedError;
  }
  
  /**
   * Execute job operation with full error handling
   */
  async executeJobOperation<T>(
    jobId: string,
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    return this.retryHandler.executeWithRetry(async () => {
      try {
        return await operation();
      } catch (error) {
        // Handle and classify the error
        const handledError = await this.handleJobError(jobId, error);
        throw new DocETLProcessingError(handledError);
      }
    }, context);
  }
  
  private async logError(jobId: string, error: DocETLError): Promise<void> {
    try {
      await this.supabase.rpc('create_doc_intel_job_log', {
        p_job_id: jobId,
        p_level: 'error',
        p_message: `${error.category.toUpperCase()}: ${error.message}`,
        p_details: {
          category: error.category,
          severity: error.severity,
          retryable: error.retryable,
          ...error.details
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
}

/**
 * Create comprehensive error handler
 */
export function createErrorHandler(
  supabase: any, 
  schema: string, 
  retryConfig?: Partial<RetryConfig>
): ComprehensiveErrorHandler {
  return new ComprehensiveErrorHandler(supabase, schema, retryConfig);
}