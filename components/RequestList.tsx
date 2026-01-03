import type { NetworkRequest } from "~/types/network"
import ResponseViewer from "./ResponseViewer"

interface RequestListProps {
  requests: NetworkRequest[]
  searchKeyword?: string
}

export default function RequestList({ requests, searchKeyword }: RequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">No requests found</p>
          <p className="text-sm">
            {searchKeyword
              ? "Try a different search keyword"
              : "Network requests will appear here when you make API calls"}
          </p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) {
      return "text-green-600 dark:text-green-400"
    }
    if (status >= 300 && status < 400) {
      return "text-blue-600 dark:text-blue-400"
    }
    if (status >= 400 && status < 500) {
      return "text-yellow-600 dark:text-yellow-400"
    }
    if (status >= 500) {
      return "text-red-600 dark:text-red-400"
    }
    return "text-gray-600 dark:text-gray-400"
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {requests.map((request) => (
        <div
          key={request.id}
          className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {request.method}
                  </span>
                  <span className={`text-xs font-semibold ${getStatusColor(request.statusCode)}`}>
                    {request.statusCode} {request.statusText}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(request.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-all">
                  {request.url}
                </div>
              </div>
            </div>
          </div>
          <ResponseViewer request={request} searchKeyword={searchKeyword} />
        </div>
      ))}
    </div>
  )
}

