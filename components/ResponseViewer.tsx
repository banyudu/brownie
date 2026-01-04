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

  const Table = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {children}
        </table>
      </div>
    </div>
  )

  const TableHeader = ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {children}
    </thead>
  )

  const TableRow = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <tr className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${className}`}>
      {children}
    </tr>
  )

  const TableHead = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )

  const TableCell = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <td className={`px-4 py-3 text-xs font-mono text-gray-900 dark:text-gray-100 ${className}`}>
      {children}
    </td>
  )

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
          Response Details
        </span>
        {request.duration && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {request.duration}ms
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="bg-white dark:bg-gray-900">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => setActiveTab("body")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "body"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Response Body
              {activeTab === "body" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("headers")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "headers"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Response Headers
              {activeTab === "headers" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("request")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "request"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Request Details
              {activeTab === "request" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-96 overflow-auto">
            {activeTab === "body" && (
              <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4">
                <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words overflow-x-auto">
                  {searchKeyword ? (
                    <code dangerouslySetInnerHTML={{ __html: displayText }} />
                  ) : (
                    <code>{formatted}</code>
                  )}
                </pre>
              </div>
            )}

            {activeTab === "headers" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Response Headers
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {Object.keys(request.responseHeaders).length} headers
                  </span>
                </div>
                {Object.keys(request.responseHeaders).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Name</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <tbody>
                      {Object.entries(request.responseHeaders).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                            {key}
                          </TableCell>
                          <TableCell className="break-all">{value}</TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                    No response headers available
                  </div>
                )}
              </div>
            )}

            {activeTab === "request" && (
              <div className="space-y-6">
                {/* Request Info Table */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Request Information
                  </h3>
                  <Table>
                    <tbody>
                      <TableRow>
                        <TableCell className="text-blue-600 dark:text-blue-400 font-semibold w-[30%]">
                          Method
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-semibold">
                            {request.method}
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                          URL
                        </TableCell>
                        <TableCell className="break-all">{request.url}</TableCell>
                      </TableRow>
                      {request.duration && (
                        <TableRow>
                          <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                            Duration
                          </TableCell>
                          <TableCell>{request.duration}ms</TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                          Timestamp
                        </TableCell>
                        <TableCell>
                          {new Date(request.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </tbody>
                  </Table>
                </div>

                {/* Request Headers Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Request Headers
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {Object.keys(request.requestHeaders).length} headers
                    </span>
                  </div>
                  {Object.keys(request.requestHeaders).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Name</TableHead>
                          <TableHead>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <tbody>
                        {Object.entries(request.requestHeaders).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                              {key}
                            </TableCell>
                            <TableCell className="break-all">{value}</TableCell>
                          </TableRow>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 rounded-md border border-gray-200 dark:border-gray-800">
                      No request headers available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

