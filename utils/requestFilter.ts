import type { NetworkRequest } from "~/types/network"

/**
 * Check if a request is an XHR/fetch request (not a static asset)
 */
export function isXHRRequest(
  request: chrome.devtools.network.Request
): boolean {
  const url = request.request.url.toLowerCase()
  const contentType =
    request.response?.headers
      ?.find((h) => h.name.toLowerCase() === "content-type")
      ?.value?.toLowerCase() || ""

  // Exclude static assets
  const staticExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".svg",
    ".webp",
    ".ico", // Images
    ".css", // Stylesheets
    ".woff",
    ".woff2",
    ".ttf",
    ".eot", // Fonts
    ".mp4",
    ".webm",
    ".mp3",
    ".wav", // Media
    ".pdf" // Documents
  ]

  // Check if URL ends with static extension
  if (staticExtensions.some((ext) => url.endsWith(ext))) {
    return false
  }

  // Include if content-type suggests API response
  const apiContentTypes = [
    "application/json",
    "application/xml",
    "text/xml",
    "text/html",
    "application/javascript",
    "text/plain"
  ]

  if (apiContentTypes.some((type) => contentType.includes(type))) {
    return true
  }

  // Include if it's a fetch/XHR pattern (no extension or common API patterns)
  if (
    !url.includes(".") ||
    url.includes("/api/") ||
    url.includes("/v1/") ||
    url.includes("/v2/")
  ) {
    return true
  }

  // Default: include if it's not clearly a static asset
  return (
    !contentType.includes("image/") &&
    !contentType.includes("font/") &&
    !contentType.includes("video/") &&
    !contentType.includes("audio/")
  )
}

/**
 * Convert Chrome DevTools Request to NetworkRequest
 */
export async function convertToNetworkRequest(
  request: chrome.devtools.network.Request
): Promise<NetworkRequest | null> {
  try {
    const response = request.response
    if (!response) {
      return null
    }

    // Get response body
    let responseBody = ""
    let responseBodyParsed: any = null
    let contentType = ""

    try {
      const content = await new Promise<string>((resolve, reject) => {
        request.getContent((content, encoding) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(content || "")
          }
        })
      })
      responseBody = content

      const contentTypeHeader = response.headers.find(
        (h) => h.name.toLowerCase() === "content-type"
      )
      contentType = contentTypeHeader?.value || ""

      // Try to parse JSON
      if (contentType.includes("application/json") && responseBody) {
        try {
          responseBodyParsed = JSON.parse(responseBody)
        } catch {
          // Not valid JSON, keep as string
        }
      }
    } catch (error) {
      // Response body might not be accessible (CORS, etc.)
      responseBody = "[Response body not accessible]"
    }

    // Convert headers to object
    const requestHeaders: Record<string, string> = {}
    request.request.headers.forEach((h) => {
      requestHeaders[h.name] = h.value
    })

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((h) => {
      responseHeaders[h.name] = h.value
    })

    return {
      id: `${request.request.url}-${request.request.headers.length}-${Date.now()}`,
      url: request.request.url,
      method: request.request.method,
      statusCode: response.status,
      statusText: response.statusText,
      requestHeaders,
      responseHeaders,
      responseBody,
      responseBodyParsed,
      contentType,
      timestamp: Date.now(),
      duration: response.headersSize + response.bodySize
    }
  } catch {
    return null
  }
}
