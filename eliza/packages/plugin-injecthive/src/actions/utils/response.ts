/**
 * Standard response interface for all module functions
 */
export interface StandardResponse {
  success: boolean;
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Create a success response
 * @param data The data to return
 * @returns A standardized success response
 */
export function createSuccessResponse(data: any): StandardResponse {
  return {
    success: true,
    result: data
  };
}

/**
 * Create an error response
 * @param code Error code
 * @param error Error object or message
 * @returns A standardized error response
 */
export function createErrorResponse(code: string, error: any): StandardResponse {
  const errorMessage = error instanceof Error 
    ? error.message 
    : (typeof error === 'string' ? error : 'Unknown error');
  
  return {
    success: false,
    error: {
      code,
      message: errorMessage,
      details: error instanceof Error ? error : undefined
    }
  };
} 