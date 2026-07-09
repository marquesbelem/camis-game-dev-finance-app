/**
 * Sanitizes user text inputs to prevent HTML injection and Cross-Site Scripting (XSS).
 * Strips HTML tags and escapes special characters.
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return "";
  
  // 1. Strip HTML tags
  let cleaned = input.replace(/<[^>]*>/g, "");
  
  // 2. Escape special HTML characters to prevent rendering execution
  cleaned = cleaned.replace(/[&<>"']/g, (match) => {
    const escapeMap: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
    };
    return escapeMap[match] || match;
  });
  
  return cleaned.trim();
}
