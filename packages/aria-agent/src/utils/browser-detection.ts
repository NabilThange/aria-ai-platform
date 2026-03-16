/**
 * Detect if a task is web-based and should use PinchTab
 */
export function isWebTask(taskDescription: string): boolean {
  const webKeywords = [
    'gmail',
    'email',
    'browser',
    'website',
    'web',
    'http',
    'https',
    'url',
    'google',
    'facebook',
    'twitter',
    'linkedin',
    'github',
    'slack',
    'telegram',
    'whatsapp',
    'instagram',
    'youtube',
    'reddit',
    'stackoverflow',
    'wikipedia',
    'amazon',
    'ebay',
    'shopify',
    'stripe',
    'paypal',
    'login',
    'sign in',
    'sign up',
    'register',
    'form',
    'search',
    'click link',
    'navigate to',
    'go to',
    'open website',
    'visit',
    'browse',
  ];

  const lowerDesc = taskDescription.toLowerCase();
  return webKeywords.some((keyword) => lowerDesc.includes(keyword));
}

/**
 * Extract URL from task description if present
 */
export function extractUrl(taskDescription: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const match = taskDescription.match(urlRegex);
  return match ? match[0] : null;
}

/**
 * Detect if browser is currently open
 */
export function isBrowserOpen(screenshotAnalysis: string): boolean {
  const browserIndicators = [
    'firefox',
    'chrome',
    'browser',
    'address bar',
    'url bar',
    'http',
    'https',
    'gmail',
    'google',
  ];

  return browserIndicators.some((indicator) =>
    screenshotAnalysis.toLowerCase().includes(indicator),
  );
}
