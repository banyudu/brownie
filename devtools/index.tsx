import devtoolsPanelHTML from "url:../panels/devtools/index.html"

import type { NetworkRequest } from "~/types/network"
import { convertToNetworkRequest, isXHRRequest } from "~/utils/requestFilter"
import {
  addRequest,
  cleanupOldTabs,
  clearRequests,
  getCurrentTabId,
  getRequests,
  removeTab,
  updateTab
} from "~/utils/storage"

import "~/style.css"

// Get the current tab ID (available in devtools context)
const getTabId = (): number => {
  const tabId = getCurrentTabId()
  if (tabId === null) {
    return 0
  }
  return tabId
}

// Initialize: cleanup old tabs on startup
cleanupOldTabs().catch(() => {
  // Error cleaning up old tabs
})

// Create DevTools panel
chrome.devtools.panels.create(
  "Brownie",
  "assets/icon.png",
  devtoolsPanelHTML.split("/").pop(),
  (panel) => {
    // Update tab info when panel is shown
    const tabId = getTabId()
    chrome.devtools.inspectedWindow.eval(
      "({ url: window.location.href, title: document.title })",
      (result) => {
        if (result && typeof result === "object") {
          const { url, title } = result as { url: string; title: string }
          updateTab(tabId, url, title || "Unknown").catch(() => {
            // Error updating tab
          })
        } else {
          updateTab(tabId, "unknown", "Unknown").catch(() => {
            // Error updating tab
          })
        }
      }
    )
  }
)

// Listen for completed network requests
chrome.devtools.network.onRequestFinished.addListener(async (request) => {
  // Filter only XHR/fetch requests
  if (!isXHRRequest(request)) {
    return
  }

  // Convert to our format
  const networkRequest = await convertToNetworkRequest(request)
  if (!networkRequest) {
    return
  }

  // Get current tab ID
  const tabId = getTabId()

  // Update tab info with current URL
  try {
    chrome.devtools.inspectedWindow.eval(
      "({ url: window.location.href, title: document.title })",
      (result) => {
        if (result && typeof result === "object") {
          const { url, title } = result as { url: string; title: string }
          updateTab(tabId, url, title).catch(() => {
            // Error updating tab
          })
        }
      }
    )
  } catch {
    // Error updating tab info
  }

  // Add request to storage for this tab
  await addRequest(tabId, networkRequest)

  // Notify panel via custom event (using a simple storage key for change detection)
  // We'll use a timestamp key that the panel can listen to
  try {
    await chrome.storage.local.set({
      [`brownie_update_${tabId}`]: Date.now()
    })
  } catch {
    // Error notifying panel
  }
})

// Listen for tab navigation to update tab info
chrome.devtools.network.onNavigated.addListener((url) => {
  const tabId = getTabId()
  updateTab(tabId, url, "Loading...").catch(() => {
    // Error updating tab
  })
})

// Expose API for panel to get/clear requests
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const tabId = getTabId()

  if (message.type === "GET_REQUESTS") {
    try {
      const requests = await getRequests(tabId)
      sendResponse({ requests, tabId })
      return true
    } catch (error) {
      sendResponse({ requests: [], tabId, error: String(error) })
      return true
    }
  }

  if (message.type === "CLEAR_REQUESTS") {
    try {
      await clearRequests(tabId)
      sendResponse({ success: true, tabId })
      return true
    } catch (error) {
      sendResponse({ success: false, tabId, error: String(error) })
      return true
    }
  }

  if (message.type === "GET_TAB_ID") {
    sendResponse({ tabId })
    return true
  }

  return false
})

// Cleanup: remove tab data when devtools is closed
// Note: This is best-effort since we can't reliably detect when devtools closes
// The cleanupOldTabs function will handle stale data
