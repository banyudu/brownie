import { useState } from "react"
import type { NetworkRequest } from "~/types/network"
import { parseResponseBody, highlightKeywords } from "~/utils/responseParser"

interface ResponseViewerProps {
  request: NetworkRequest
  searchKeyword?: string
}

export default function ResponseViewer({ request, searchKeyword }: ResponseViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<"body" | "headers" | "request">("body")

  const { formatted, isJSON } = parseResponseBody(
    request.responseBody,
    request.contentType,
    request.responseBodyParsed
  )

  const displayText = searchKeyword
    ? highlightKeywords(formatted, searchKeyword)
    : formatted

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isExpanded ? "▼" : "▶"} Response Details
        </span>
      </button>

      {isExpanded && (
        <div className="bg-white dark:bg-gray-900">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("body")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "body"
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Response Body
            </button>
            <button
              onClick={() => setActiveTab("headers")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "headers"
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Response Headers
            </button>
            <button
              onClick={() => setActiveTab("request")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "request"
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Request Details
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-96 overflow-auto">
            {activeTab === "body" && (
              <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                {searchKeyword ? (
                  <code dangerouslySetInnerHTML={{ __html: displayText }} />
                ) : (
                  <code>{formatted}</code>
                )}
              </pre>
            )}

            {activeTab === "headers" && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Response Headers:
                </div>
                {Object.entries(request.responseHeaders).map(([key, value]) => (
                  <div key={key} className="text-xs font-mono">
                    <span className="text-blue-600 dark:text-blue-400">{key}:</span>{" "}
                    <span className="text-gray-800 dark:text-gray-200">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "request" && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Request URL:
                  </div>
                  <div className="text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
                    {request.url}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Method:
                  </div>
                  <div className="text-xs font-mono text-gray-800 dark:text-gray-200">
                    {request.method}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Request Headers:
                  </div>
                  {Object.entries(request.requestHeaders).map(([key, value]) => (
                    <div key={key} className="text-xs font-mono">
                      <span className="text-blue-600 dark:text-blue-400">{key}:</span>{" "}
                      <span className="text-gray-800 dark:text-gray-200">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

