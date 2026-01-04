import { useState, useEffect, useSyncExternalStore, useMemo } from "react"
import type { NetworkRequest } from "~/types/network"
import SearchBar from "~/components/SearchBar"
import RequestList from "~/components/RequestList"
import { createRoot } from "react-dom/client"
import { getRequests } from "~/utils/storage"
import "~/style.css"

// Store for managing requests state with useSyncExternalStore
let currentTabId: number | null = null
let currentRequests: NetworkRequest[] = []
let listeners = new Set<() => void>()

// Get current tab ID from background
async function fetchTabId(): Promise<number> {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_TAB_ID" })
    const tabId = response?.tabId ?? 0
    console.log("[Brownie Panel] Fetched tab ID:", tabId, "Response:", response)
    return tabId
  } catch (error) {
    console.error("[Brownie Panel] Error getting tab ID:", error)
    // Fallback: try to get tab ID from devtools API if available
    try {
      if (typeof chrome !== "undefined" && chrome.devtools?.inspectedWindow?.tabId) {
        const fallbackTabId = chrome.devtools.inspectedWindow.tabId
        console.log("[Brownie Panel] Using fallback tab ID:", fallbackTabId)
        return fallbackTabId
      }
    } catch (e) {
      console.error("[Brownie Panel] Fallback tab ID also failed:", e)
    }
    return 0
  }
}

// Load requests from storage
async function loadRequestsFromStorage(tabId: number): Promise<NetworkRequest[]> {
  try {
    const requests = await getRequests(tabId)
    console.log(`[Brownie Panel] Loaded ${requests.length} requests for tab ${tabId}`)
    return requests
  } catch (error) {
    console.error("[Brownie Panel] Error loading requests:", error)
    return []
  }
}

// Subscribe to storage changes
function subscribe(callback: () => void) {
  listeners.add(callback)

  // Listen for storage changes (notification mechanism)
  const storageListener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === "local" && currentTabId !== null) {
      // Check if the update is for our current tab
      const updateKey = `brownie_update_${currentTabId}`
      if (changes[updateKey]) {
        console.log(`[Brownie Panel] Storage change detected for tab ${currentTabId}`)
        // Reload requests for this tab
        loadRequestsFromStorage(currentTabId).then((requests) => {
          console.log(`[Brownie Panel] Reloaded ${requests.length} requests after storage change`)
          currentRequests = requests
          listeners.forEach((listener) => listener())
        })
      }
      // Also check for direct request key changes (backup)
      const requestsKey = `brownie_requests_${currentTabId}`
      if (changes[requestsKey]) {
        console.log(`[Brownie Panel] Direct requests key change detected for tab ${currentTabId}`)
        loadRequestsFromStorage(currentTabId).then((requests) => {
          currentRequests = requests
          listeners.forEach((listener) => listener())
        })
      }
    }
  }

  chrome.storage.onChanged.addListener(storageListener)

  // Poll as backup (more frequent initially to catch any missed updates)
  let pollCount = 0
  const interval = setInterval(() => {
    if (currentTabId !== null) {
      pollCount++
      loadRequestsFromStorage(currentTabId).then((requests) => {
        const requestsChanged = JSON.stringify(requests) !== JSON.stringify(currentRequests)
        if (requestsChanged) {
          console.log(`[Brownie Panel] Poll #${pollCount} detected ${requests.length} requests (was ${currentRequests.length})`)
          currentRequests = requests
          listeners.forEach((listener) => listener())
        }
      })
    }
  }, 2000) // Poll every 2 seconds as backup

  return () => {
    listeners.delete(callback)
    chrome.storage.onChanged.removeListener(storageListener)
    clearInterval(interval)
  }
}

// Get current snapshot
function getSnapshot(): NetworkRequest[] {
  return currentRequests
}

// Get server snapshot (for SSR compatibility, not needed in extension context)
function getServerSnapshot(): NetworkRequest[] {
  return []
}

function DevToolsPanel() {
  const [tabId, setTabId] = useState<number | null>(null)
  const [searchKeyword, setSearchKeyword] = useState("")

  // Initialize tab ID
  useEffect(() => {
    fetchTabId().then((id) => {
      console.log("[Brownie Panel] Setting tab ID:", id)
      currentTabId = id
      setTabId(id)
      // Load initial requests
      loadRequestsFromStorage(id).then((requests) => {
        console.log("[Brownie Panel] Initial requests loaded:", requests.length)
        currentRequests = requests
        listeners.forEach((listener) => listener())
        
        // If no requests found, try to check if there are any requests in storage at all
        if (requests.length === 0) {
          console.log("[Brownie Panel] No requests found, checking if IndexedDB is accessible...")
          // Try to verify IndexedDB is working by checking all keys
          import("idb-keyval").then(({ keys }) => {
            keys().then((allKeys) => {
              console.log("[Brownie Panel] IndexedDB keys found:", allKeys)
              const requestKeys = allKeys.filter((k) => 
                typeof k === "string" && k.startsWith("brownie_requests_")
              )
              console.log("[Brownie Panel] Request keys in storage:", requestKeys)
            }).catch((err) => {
              console.error("[Brownie Panel] Error checking IndexedDB keys:", err)
            })
          })
        }
      }).catch((error) => {
        console.error("[Brownie Panel] Error loading initial requests:", error)
      })
    }).catch((error) => {
      console.error("[Brownie Panel] Error fetching tab ID:", error)
    })
  }, [])

  // Use useSyncExternalStore to sync with storage
  const allRequests = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  // Force refresh when tab ID changes
  useEffect(() => {
    if (tabId !== null) {
      console.log("[Brownie Panel] Tab ID changed, refreshing requests...")
      loadRequestsFromStorage(tabId).then((requests) => {
        console.log(`[Brownie Panel] Refreshed ${requests.length} requests for tab ${tabId}`)
        currentRequests = requests
        listeners.forEach((listener) => listener())
      })
    }
  }, [tabId])

  // Filter requests when search keyword changes
  const filteredRequests = useMemo(() => {
    if (!searchKeyword.trim()) {
      return allRequests
    }

    const keyword = searchKeyword.toLowerCase()
    return allRequests.filter((request) => {
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
  }, [searchKeyword, allRequests])

  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword)
  }

  const handleClear = () => {
    setSearchKeyword("")
  }

  const handleClearRequests = async () => {
    if (tabId === null) return
    
    try {
      await chrome.runtime.sendMessage({ type: "CLEAR_REQUESTS" })
      // Clear local state immediately
      currentRequests = []
      listeners.forEach((listener) => listener())
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