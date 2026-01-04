import { get, set, del, clear, keys } from "idb-keyval"
import type { NetworkRequest } from "~/types/network"

const DB_PREFIX = "brownie_"
const REQUESTS_KEY = (tabId: number) => `${DB_PREFIX}requests_${tabId}`
const TABS_KEY = `${DB_PREFIX}tabs`
const MAX_REQUESTS_PER_TAB = 1000

export interface TabInfo {
  tabId: number
  url: string
  title: string
  lastActive: number
}

/**
 * Get the current tab ID from devtools context
 * This should be called from the devtools script context where chrome.devtools is available
 */
export function getCurrentTabId(): number | null {
  try {
    // In devtools context, we can access tabId directly
    if (typeof chrome !== "undefined" && chrome.devtools?.inspectedWindow?.tabId) {
      const tabId = chrome.devtools.inspectedWindow.tabId
      console.log("[Brownie Storage] Got tab ID from devtools:", tabId)
      return tabId
    }
    // Fallback: use 0 as default tab ID
    console.warn("[Brownie Storage] Tab ID not available, using 0 as fallback")
    return 0
  } catch (error) {
    console.error("[Brownie Storage] Error getting tab ID:", error)
    return 0
  }
}

/**
 * Get all tracked tabs
 */
export async function getTabs(): Promise<TabInfo[]> {
  try {
    const tabs = await get<TabInfo[]>(TABS_KEY)
    return tabs || []
  } catch (error) {
    console.error("Error getting tabs:", error)
    return []
  }
}

/**
 * Update or add a tab
 */
export async function updateTab(tabId: number, url: string, title: string): Promise<void> {
  try {
    const tabs = await getTabs()
    const existingTabIndex = tabs.findIndex((t) => t.tabId === tabId)
    
    const tabInfo: TabInfo = {
      tabId,
      url,
      title,
      lastActive: Date.now(),
    }

    if (existingTabIndex >= 0) {
      tabs[existingTabIndex] = tabInfo
    } else {
      tabs.push(tabInfo)
    }

    await set(TABS_KEY, tabs)
  } catch (error) {
    console.error("Error updating tab:", error)
  }
}

/**
 * Remove a tab and its requests
 */
export async function removeTab(tabId: number): Promise<void> {
  try {
    // Remove tab from list
    const tabs = await getTabs()
    const filteredTabs = tabs.filter((t) => t.tabId !== tabId)
    await set(TABS_KEY, filteredTabs)

    // Remove tab's requests
    await del(REQUESTS_KEY(tabId))
  } catch (error) {
    console.error("Error removing tab:", error)
  }
}

/**
 * Clean up old tabs (older than 24 hours)
 */
export async function cleanupOldTabs(): Promise<void> {
  try {
    const tabs = await getTabs()
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    for (const tab of tabs) {
      if (now - tab.lastActive > maxAge) {
        await removeTab(tab.tabId)
      }
    }
  } catch (error) {
    console.error("Error cleaning up old tabs:", error)
  }
}

/**
 * Get requests for a specific tab
 */
export async function getRequests(tabId: number): Promise<NetworkRequest[]> {
  try {
    const key = REQUESTS_KEY(tabId)
    const requests = await get<NetworkRequest[]>(key)
    const result = requests || []
    console.log(`[Brownie Storage] getRequests for tab ${tabId} (key: ${key}): ${result.length} requests`)
    return result
  } catch (error) {
    console.error(`[Brownie Storage] Error getting requests for tab ${tabId}:`, error)
    return []
  }
}

/**
 * Add a request to a tab's storage
 */
export async function addRequest(tabId: number, request: NetworkRequest): Promise<void> {
  try {
    const requests = await getRequests(tabId)
    
    // Prepend to keep most recent first
    requests.unshift(request)

    // Limit storage size
    if (requests.length > MAX_REQUESTS_PER_TAB) {
      requests.splice(MAX_REQUESTS_PER_TAB)
    }

    const key = REQUESTS_KEY(tabId)
    await set(key, requests)
    console.log(`[Brownie Storage] addRequest: Added request to tab ${tabId} (key: ${key}), total: ${requests.length}`)
  } catch (error) {
    console.error(`[Brownie Storage] Error adding request to tab ${tabId}:`, error)
  }
}

/**
 * Clear requests for a specific tab
 */
export async function clearRequests(tabId: number): Promise<void> {
  try {
    await set(REQUESTS_KEY(tabId), [])
  } catch (error) {
    console.error("Error clearing requests:", error)
  }
}

/**
 * Get all requests across all tabs
 */
export async function getAllRequests(): Promise<NetworkRequest[]> {
  try {
    const tabs = await getTabs()
    const allRequests: NetworkRequest[] = []

    for (const tab of tabs) {
      const requests = await getRequests(tab.tabId)
      allRequests.push(...requests)
    }

    return allRequests.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error("Error getting all requests:", error)
    return []
  }
}
