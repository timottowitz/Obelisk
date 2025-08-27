const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export interface GraphRequestInit extends RequestInit {
  eventual?: boolean; // For $search operations that need eventual consistency
}

export interface GraphError {
  error: {
    code: string;
    message: string;
    innerError?: {
      code?: string;
      date?: string;
      'request-id'?: string;
      'client-request-id'?: string;
    };
  };
}

export interface GraphListResponse<T> {
  '@odata.context'?: string;
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
  value: T[];
}

/**
 * Make a request to Microsoft Graph API
 * Handles authentication, retries, and error handling
 */
export async function graphFetch<T = any>(
  path: string,
  accessToken: string,
  init: GraphRequestInit = {},
  options: { eventual?: boolean } = {}
): Promise<T> {
  const { eventual = false, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  
  // Set required headers
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Accept', 'application/json');
  
  // Set ConsistencyLevel header for $search operations
  if (eventual || options.eventual) {
    headers.set('ConsistencyLevel', 'eventual');
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${GRAPH_BASE}${normalizedPath}`;
  
  try {
    const response = await fetch(url, {
      ...requestInit,
      headers,
    });
    
    // Handle successful responses
    if (response.ok) {
      // Handle empty responses (like DELETE operations)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }
      
      return await response.json();
    }
    
    // Handle error responses
    let errorData: GraphError;
    try {
      errorData = await response.json();
    } catch {
      throw new Error(`Graph API error ${response.status}: ${response.statusText}`);
    }
    
    // Handle specific error codes
    const errorCode = errorData.error?.code;
    const errorMessage = errorData.error?.message || 'Unknown error';
    
    switch (errorCode) {
      case 'InvalidAuthenticationToken':
      case 'AuthenticationFailure':
        throw new Error('Authentication failed. Please reconnect your Microsoft account.');
        
      case 'Forbidden':
      case 'Authorization_RequestDenied':
        throw new Error('Permission denied. Please ensure you have granted the necessary permissions.');
        
      case 'ResourceNotFound':
      case 'ErrorItemNotFound':
        throw new Error(`Resource not found: ${errorMessage}`);
        
      case 'TooManyRequests':
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limited. Please retry after ${retryAfter || '60'} seconds.`);
        
      case 'ServiceUnavailable':
      case 'BadGateway':
      case 'GatewayTimeout':
        throw new Error('Microsoft Graph service is temporarily unavailable. Please try again later.');
        
      default:
        throw new Error(`Graph API error: ${errorMessage}`);
    }
  } catch (error) {
    // Re-throw if already processed
    if (error instanceof Error) {
      throw error;
    }
    
    // Handle network errors
    throw new Error('Network error while connecting to Microsoft Graph API');
  }
}

/**
 * Helper to handle paginated responses from Graph API
 */
export async function* graphFetchPaginated<T>(
  path: string,
  accessToken: string,
  init: GraphRequestInit = {},
  options: { eventual?: boolean; maxPages?: number } = {}
): AsyncGenerator<T[], void, unknown> {
  let nextLink: string | undefined = path;
  let pageCount = 0;
  const maxPages = options.maxPages || Infinity;
  
  while (nextLink && pageCount < maxPages) {
    const response = await graphFetch<GraphListResponse<T>>(
      nextLink,
      accessToken,
      init,
      options
    );
    
    yield response.value;
    
    // Get next page URL if available
    nextLink = response['@odata.nextLink'];
    if (nextLink) {
      // Extract the path from the full URL
      nextLink = nextLink.replace(GRAPH_BASE, '');
    }
    
    pageCount++;
  }
}

/**
 * Helper to build OData query parameters
 */
export function buildODataParams(params: {
  select?: string[];
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  search?: string;
  expand?: string[];
  count?: boolean;
}): string {
  const queryParts: string[] = [];
  
  if (params.select?.length) {
    queryParts.push(`$select=${params.select.join(',')}`);
  }
  
  if (params.filter) {
    queryParts.push(`$filter=${encodeURIComponent(params.filter)}`);
  }
  
  if (params.orderby) {
    queryParts.push(`$orderby=${encodeURIComponent(params.orderby)}`);
  }
  
  if (params.top) {
    queryParts.push(`$top=${params.top}`);
  }
  
  if (params.skip) {
    queryParts.push(`$skip=${params.skip}`);
  }
  
  if (params.search) {
    queryParts.push(`$search="${encodeURIComponent(params.search)}"`);
  }
  
  if (params.expand?.length) {
    queryParts.push(`$expand=${params.expand.join(',')}`);
  }
  
  if (params.count) {
    queryParts.push('$count=true');
  }
  
  return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
}