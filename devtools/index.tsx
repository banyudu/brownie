import type { NetworkRequest } from "~/types/network"
import devtoolsPanelHTML from "url:../panels/devtools/index.html"
import { isXHRRequest, convertToNetworkRequest } from "~/utils/requestFilter"
import "~/style.css"

const MAX_REQUESTS = 1000
const STORAGE_KEY = "network_requests"

console.log("devtools/index.tsx loaded", devtoolsPanelHTML)

// Load requests from storage
async function loadRequests(): Promise<NetworkRequest[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return result[STORAGE_KEY] || []
  } catch {
    return []
  }
}

// Save requests to storage
async function saveRequests(requests: NetworkRequest[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: requests })
  } catch (error) {
    console.error("Error saving requests:", error)
  }
}

// Create DevTools panel
// Note: Plasmo will generate devtools-panel.html from devtools-panel.tsx
chrome.devtools.panels.create(
  "Brownie",
  "assets/icon.png",
  devtoolsPanelHTML.split("/").pop(),
  (panel) => {
    // Panel created
    console.log("Brownie panel created")
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

  // Load existing requests
  const requests = await loadRequests()
  
  // Add to storage (prepend to keep most recent first)
  requests.unshift(networkRequest)

  // Limit storage size
  if (requests.length > MAX_REQUESTS) {
    requests.splice(MAX_REQUESTS)
  }

  // Save to storage
  await saveRequests(requests)

  // Notify panel via storage change event (more reliable than messages)
  chrome.storage.local.set({ lastUpdate: Date.now() })
})

// Expose API for panel to get/clear requests
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "GET_REQUESTS") {
    const requests = await loadRequests()
    sendResponse({ requests })
    return true
  }

  if (message.type === "CLEAR_REQUESTS") {
    await saveRequests([])
    sendResponse({ success: true })
    return true
  }

  return false
})


