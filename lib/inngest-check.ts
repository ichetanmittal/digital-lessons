
export async function checkInngestHealth(): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development') {
      const response = await fetch('http://localhost:8288/health', {
        method: 'GET',
        signal: AbortSignal.timeout(1000), // 1 second timeout
      });
      return response.ok;
    }
    return true;
  } catch (error) {
    console.warn(
      'Inngest health check failed:',
      error instanceof Error ? error.message : 'Unknown error - Inngest dev server may not be running'
    );
    return false;
  }
}
