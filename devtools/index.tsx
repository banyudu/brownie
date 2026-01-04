import type { NetworkRequest } from "~/types/network"
import devtoolsPanelHTML from "url:../panels/devtools/index.html"
import { isXHRRequest, convertToNetworkRequest } from "~/utils/requestFilter"
import {
  getCurrentTabId,
  updateTab,
  addRequest,
  getRequests,
  clearRequests,
  removeTab,
  cleanupOldTabs,
} from "~/utils/storage"
import "~/style.css"

console.log("devtools/index.tsx loaded", devtoolsPanelHTML)

// Get the current tab ID (available in devtools context)
const getTabId = (): number => {
  const tabId = getCurrentTabId()
  if (tabId === null) {
    console.warn("Could not get tab ID, using 0 as fallback")
    return 0
  }
  return tabId
}

// Initialize: cleanup old tabs on startup
cleanupOldTabs().catch(console.error)

// Create DevTools panel
chrome.devtools.panels.create(
  "Brownie",
  "assets/icon.png",
  devtoolsPanelHTML.split("/").pop(),
  (panel) => {
    console.log("Brownie panel created")
    
    // Update tab info when panel is shown
    const tabId = getTabId()
    chrome.devtools.inspectedWindow.eval(
      "({ url: window.location.href, title: document.title })",
      (result) => {
        if (result && typeof result === "object") {
          const { url, title } = result as { url: string; title: string }
          updateTab(tabId, url, title || "Unknown").catch(console.error)
        } else {
          // Fallback if eval fails
          updateTab(tabId, "unknown", "Unknown").catch(console.error)
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
  console.log("[Brownie DevTools] Captured request for tab:", tabId, "URL:", request.request.url)

  // Update tab info with current URL
  try {
    chrome.devtools.inspectedWindow.eval(
      "({ url: window.location.href, title: document.title })",
      (result) => {
        if (result && typeof result === "object") {
          const { url, title } = result as { url: string; title: string }
          updateTab(tabId, url, title).catch(console.error)
        }
      }
    )
  } catch (error) {
    console.error("Error updating tab info:", error)
  }

  // Add request to storage for this tab
  await addRequest(tabId, networkRequest)
  console.log("[Brownie DevTools] Added request to storage for tab:", tabId)

  // Notify panel via custom event (using a simple storage key for change detection)
  // We'll use a timestamp key that the panel can listen to
  try {
    await chrome.storage.local.set({ 
      [`brownie_update_${tabId}`]: Date.now() 
    })
    console.log("[Brownie DevTools] Notified panel of update for tab:", tabId)
  } catch (error) {
    console.error("[Brownie DevTools] Error notifying panel:", error)
  }
})

// Listen for tab navigation to update tab info
chrome.devtools.network.onNavigated.addListener((url) => {
  const tabId = getTabId()
  updateTab(tabId, url, "Loading...").catch(console.error)
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
      console.error("Error getting requests:", error)
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
      console.error("Error clearing requests:", error)
      sendResponse({ success: false, tabId, error: String(error) })
      return true
    }
  }

  if (message.type === "GET_TAB_ID") {
    console.log("[Brownie DevTools] GET_TAB_ID requested, responding with:", tabId)
    sendResponse({ tabId })
    return true
  }

  return false
})

// Cleanup: remove tab data when devtools is closed
// Note: This is best-effort since we can't reliably detect when devtools closes
// The cleanupOldTabs function will handle stale data


