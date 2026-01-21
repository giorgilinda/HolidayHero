/**
 * Retry fetch with exponential backoff for temporary errors (503, 502, 429)
 */
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If successful or permanent error, return immediately
      if (response.ok || (response.status !== 503 && response.status !== 502 && response.status !== 429)) {
        return response;
      }
      
      // For temporary errors, retry if we have attempts left
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Temporary error ${response.status} on attempt ${attempt + 1}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Last attempt failed with temporary error
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If we have retries left, wait and retry
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Network error on attempt ${attempt + 1}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Last attempt failed
      throw lastError;
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries');
}

