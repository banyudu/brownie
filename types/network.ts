export interface NetworkRequest {
  id: string
  url: string
  method: string
  statusCode: number
  statusText: string
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  responseBody: string
  responseBodyParsed: any
  contentType: string
  timestamp: number
  duration?: number
}

export interface RequestFilter {
  keyword?: string
  method?: string
  statusCode?: number
}

