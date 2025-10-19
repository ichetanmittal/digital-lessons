/**
 * Helper to check if Inngest dev server is running
 */
export async function checkInngestHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8288/health', {
      method: 'GET',
      signal: AbortSignal.timeout(1000), // 1 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}
