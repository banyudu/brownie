/**
 * Parse and format response body based on content type
 */
export function parseResponseBody(
  responseBody: string,
  contentType: string,
  parsed?: any
): { formatted: string; isJSON: boolean; isBinary: boolean } {
  if (!responseBody || responseBody === "[Response body not accessible]") {
    return {
      formatted: responseBody,
      isJSON: false,
      isBinary: false,
    }
  }

  // If already parsed as JSON, format it
  if (parsed && typeof parsed === "object") {
    try {
      return {
        formatted: JSON.stringify(parsed, null, 2),
        isJSON: true,
        isBinary: false,
      }
    } catch {
      // Fall through to text handling
    }
  }

  // Check if it's JSON
  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(responseBody)
      return {
        formatted: JSON.stringify(parsed, null, 2),
        isJSON: true,
        isBinary: false,
      }
    } catch {
      // Not valid JSON, return as text
    }
  }

  // Check if it's binary (base64 or binary data)
  if (contentType.includes("image/") || 
      contentType.includes("video/") || 
      contentType.includes("audio/") ||
      contentType.includes("application/octet-stream")) {
    return {
      formatted: `[Binary data: ${contentType}]`,
      isJSON: false,
      isBinary: true,
    }
  }

  // Default: return as text
  return {
    formatted: responseBody,
    isJSON: false,
    isBinary: false,
  }
}

/**
 * Highlight search keywords in text
 */
export function highlightKeywords(text: string, keyword: string): string {
  if (!keyword) {
    return text
  }

  const regex = new RegExp(`(${escapeRegex(keyword)})`, "gi")
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>')
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

