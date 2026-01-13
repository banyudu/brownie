// Background script for handling arxiv download notifications

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle download progress messages from content script
  if (request.action === "downloadStarted") {
    try {
      chrome.action.setBadgeText({ text: "⏳" })
      chrome.action.setBadgeBackgroundColor({ color: "#FFA500" })
      chrome.action.setTitle({ title: "Downloading PDF..." })
    } catch {
      // Badge API not available
    }
  } else if (request.action === "downloadCompleted") {
    try {
      chrome.action.setBadgeText({ text: "✓" })
      chrome.action.setBadgeBackgroundColor({ color: "#28A745" })
      chrome.action.setTitle({ title: "Download completed!" })
      // Clear badge after 3 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" })
        chrome.action.setTitle({ title: "Brownie" })
      }, 3000)
    } catch {
      // Badge API not available
    }
  } else if (request.action === "downloadError") {
    try {
      chrome.action.setBadgeText({ text: "❌" })
      chrome.action.setBadgeBackgroundColor({ color: "#DC3545" })
      chrome.action.setTitle({ title: `Download failed: ${request.error}` })
      // Clear badge after 5 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" })
        chrome.action.setTitle({ title: "Brownie" })
      }, 5000)
    } catch {
      // Badge API not available
    }
  }

  return true // Keep the message channel open for async response
})

// Handle extension icon click to download from current arxiv page
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url) {
    return
  }

  const url = tab.url

  if (url.startsWith("https://arxiv.org/abs/")) {
    const paperId =
      url
        .split("/")
        .pop()
        ?.replace(/[?#].*$/, "") || ""
    const title = tab.title || "Untitled"
    const pdfUrl = `https://arxiv.org/pdf/${paperId}`
    // Format filename similar to content script
    const cleanTitle = title
      .replace(/^\[.*?\]\s*/, "")
      .replace(/\s*-\s*arXiv.*$/, "")
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim()
    const filename = `[${paperId}] ${cleanTitle}.pdf`

    // Send message to content script to download
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: "download",
        url: pdfUrl,
        filename
      })
    }
  } else if (url.startsWith("https://www.alphaxiv.org/abs/")) {
    const paperId =
      url
        .split("/")
        .pop()
        ?.replace(/[?#].*$/, "") || ""
    const title = tab.title || "Untitled"
    const cleanTitle = title
      .replace(/^\[.*?\]\s*/, "")
      .replace(/\s*-\s*arXiv.*$/, "")
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim()
    const pdfUrl = `https://www.arxiv.org/pdf/${paperId}`
    const filename = `[${paperId}] ${cleanTitle}.pdf`

    // Send message to content script to download
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: "download",
        url: pdfUrl,
        filename
      })
    }
  }
})
