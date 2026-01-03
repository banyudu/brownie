import { useState, useEffect } from "react"
import type { NetworkRequest } from "~/types/network"
import SearchBar from "~/components/SearchBar"
import RequestList from "~/components/RequestList"
import { createRoot } from "react-dom/client"
import "~/style.css"

function DevToolsPanel() {
  const [allRequests, setAllRequests] = useState<NetworkRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<NetworkRequest[]>([])
  const [searchKeyword, setSearchKeyword] = useState("")

  // Load initial requests and set up storage listener
  useEffect(() => {
    loadRequests()

    // Listen for storage changes (when new requests are added)
    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && (changes.network_requests || changes.lastUpdate)) {
        loadRequests()
      }
    }

    chrome.storage.onChanged.addListener(storageListener)

    // Poll for requests periodically as backup
    const interval = setInterval(loadRequests, 2000)

    return () => {
      chrome.storage.onChanged.removeListener(storageListener)
      clearInterval(interval)
    }
  }, [])

  // Filter requests when search keyword changes
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredRequests(allRequests)
      return
    }

    const keyword = searchKeyword.toLowerCase()
    const filtered = allRequests.filter((request) => {
      // Search in URL
      if (request.url.toLowerCase().includes(keyword)) {
        return true
      }

      // Search in response body
      if (request.responseBody.toLowerCase().includes(keyword)) {
        return true
      }

      // Search in parsed JSON
      if (request.responseBodyParsed) {
        try {
          const jsonString = JSON.stringify(request.responseBodyParsed).toLowerCase()
          if (jsonString.includes(keyword)) {
            return true
          }
        } catch {
          // Ignore parsing errors
        }
      }

      return false
    })

    setFilteredRequests(filtered)
  }, [searchKeyword, allRequests])

  const loadRequests = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_REQUESTS" })
      if (response?.requests) {
        setAllRequests(response.requests)
      }
    } catch (error) {
      console.error("Error loading requests:", error)
    }
  }

  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword)
  }

  const handleClear = () => {
    setSearchKeyword("")
  }

  const handleClearRequests = async () => {
    try {
      await chrome.runtime.sendMessage({ type: "CLEAR_REQUESTS" })
      setAllRequests([])
      setFilteredRequests([])
    } catch (error) {
      console.error("Error clearing requests:", error)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Brownie
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredRequests.length} / {allRequests.length} requests
          </span>
          <button
            onClick={handleClearRequests}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} onClear={handleClear} />

      {/* Request List */}
      <div className="flex-1 overflow-auto">
        <RequestList requests={filteredRequests} searchKeyword={searchKeyword} />
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById("root"))
root.render(<DevToolsPanel />)