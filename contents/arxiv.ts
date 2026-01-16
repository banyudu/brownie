import type { PlasmoContentScript } from "plasmo"

export const config: PlasmoContentScript = {
  matches: ["*://arxiv.org/*", "*://www.alphaxiv.org/*"],
  run_at: "document_end"
}

// Utility functions
function getPaperIdFromUrl(url: string): string {
  return (
    url
      .split("/")
      .pop()
      ?.replace(/[?#].*$/, "") || ""
  )
}

function formatFilename(paperId: string, title: string): string {
  // Clean up title: remove special characters that might cause issues in filenames
  const cleanTitle = title
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid filename characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()

  const basename = cleanTitle.includes(paperId)
    ? cleanTitle
    : `[${paperId}] ${cleanTitle}`

  return `${basename}.pdf`
}

function download(
  url: string,
  filename: string,
  onStart?: () => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
) {
  if (onStart) onStart()

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.blob()
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
      if (onComplete) onComplete()
    })
    .catch((error) => {
      if (onError) onError(error)
    })
}

function waitForElement(selector: string, timeout = 10000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector)
    if (element) {
      resolve(element)
      return
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector)
      if (element) {
        observer.disconnect()
        resolve(element)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    setTimeout(() => {
      observer.disconnect()
      reject(
        new Error(
          `Element with selector "${selector}" not found within ${timeout}ms`
        )
      )
    }, timeout)
  })
}

function buildDownloadAnchor(url: string, filename: string): HTMLAnchorElement {
  const downloadAnchor = document.createElement("a")
  downloadAnchor.href = "#"
  downloadAnchor.setAttribute("data-arxiv-download", "true")
  const originalEmoji = " ⬇️"
  const loadingEmoji = " ⏳"
  const errorEmoji = " ❌"

  // Add CSS styles
  downloadAnchor.style.cssText = `
    display: inline-block;
    line-height: 1;
    height: 1em;
    font-size: 14px;
    vertical-align: baseline;
    text-decoration: none;
    transition: transform 0.1s ease;
    margin-left: 0.2em;
  `

  // Add CSS animation keyframes if not already added
  if (!document.getElementById("arxiv-download-animations")) {
    const style = document.createElement("style")
    style.id = "arxiv-download-animations"
    style.textContent = `
      @keyframes arxiv-loading-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .arxiv-loading {
        animation: arxiv-loading-spin 2s linear infinite;
        display: inline-block;
      }
    `
    document.head.appendChild(style)
  }

  downloadAnchor.innerText = originalEmoji
  downloadAnchor.onclick = (event) => {
    event.preventDefault()
    event.stopPropagation()

    // Prevent multiple clicks while downloading
    if (downloadAnchor.classList.contains("arxiv-loading")) {
      return
    }

    download(
      url,
      filename,
      // onStart
      () => {
        downloadAnchor.innerText = loadingEmoji
        downloadAnchor.title = "Downloading..."
        downloadAnchor.classList.add("arxiv-loading")
      },
      // onComplete
      () => {
        downloadAnchor.classList.remove("arxiv-loading")
        downloadAnchor.innerText = originalEmoji
        downloadAnchor.title = "Download complete"
        setTimeout(() => {
          downloadAnchor.title = ""
        }, 2000)
      },
      // onError
      (error) => {
        downloadAnchor.classList.remove("arxiv-loading")
        downloadAnchor.innerText = errorEmoji
        downloadAnchor.title = `Download failed: ${error.message}`
        setTimeout(() => {
          downloadAnchor.innerText = originalEmoji
          downloadAnchor.title = ""
        }, 3000)
      }
    )
  }
  return downloadAnchor
}

// Main logic: add download buttons based on page type
function addDownloadButtons() {
  const url = window.location.href

  // Handle arxiv.org/list pages
  if (url.startsWith("https://arxiv.org/list")) {
    const pdfLinks = Array.from(
      document.querySelectorAll("a[title='Download PDF']")
    ) as HTMLAnchorElement[]
    pdfLinks.forEach((link) => {
      // Skip if download button already exists
      if (link.querySelector("a[data-arxiv-download]")) {
        return
      }

      const pdfUrl = link.href
      const paperId = getPaperIdFromUrl(link.href)
      const titleNode =
        link.parentElement?.nextElementSibling?.querySelector("div.list-title")
      const title = titleNode?.textContent?.trim() || "Untitled"
      const filename = formatFilename(paperId, title)

      const downloadAnchor = buildDownloadAnchor(pdfUrl, filename)
      link.appendChild(downloadAnchor)
    })
  }
  // Handle arxiv.org/abs pages
  else if (url.startsWith("https://arxiv.org/abs/")) {
    const link = document.querySelector("a.download-pdf") as HTMLAnchorElement
    if (link) {
      // Skip if download button already exists
      if (link.querySelector("a[data-arxiv-download]")) {
        return
      }

      const pdfUrl = link.href
      const paperId = getPaperIdFromUrl(url)
      const title = document.title.replace(/\s*-\s*arXiv.*$/, "").trim()
      const filename = formatFilename(paperId, title)

      const downloadAnchor = buildDownloadAnchor(pdfUrl, filename)
      link.appendChild(downloadAnchor)
    }
  }
  // Handle arxiv.org/search pages
  else if (url.startsWith("https://arxiv.org/search")) {
    const pdfLinks = Array.from(
      document.querySelectorAll("li.arxiv-result .list-title a")
    ).filter(
      (link) => link.textContent?.trim() === "pdf"
    ) as HTMLAnchorElement[]

    pdfLinks.forEach((link) => {
      // Skip if download button already exists
      if (link.querySelector("a[data-arxiv-download]")) {
        return
      }

      const pdfUrl = link.href
      const paperId = getPaperIdFromUrl(link.href)

      const arxivResult = link.closest("li.arxiv-result")
      const titleNode = arxivResult?.querySelector("p.title")
      const title = titleNode?.textContent?.trim() || "Untitled"
      const filename = formatFilename(paperId, title)

      const downloadAnchor = buildDownloadAnchor(pdfUrl, filename)
      link.appendChild(downloadAnchor)
    })
  }
  // Handle www.alphaxiv.org/abs pages
  else if (url.startsWith("https://www.alphaxiv.org/abs/")) {
    waitForElement('svg[aria-label="Download from arXiv"]')
      .then((icon) => {
        const button = icon.parentElement
        if (button) {
          // Skip if download button already exists
          if (button.parentElement?.querySelector("a[data-arxiv-download]")) {
            return
          }

          const paperId = getPaperIdFromUrl(url)
          const title = document.title
            .replace(/^\[.*?\]\s*/, "")
            .replace(/\s*-\s*arXiv.*$/, "")
            .trim()
          const pdfUrl = `https://www.arxiv.org/pdf/${paperId}`
          const filename = formatFilename(paperId, title)

          const downloadAnchor = buildDownloadAnchor(pdfUrl, filename)

          // Insert the download button after the existing download button
          button.parentNode?.insertBefore(downloadAnchor, button.nextSibling)
        }
      })
      .catch(() => {
        // Element not found, silently fail
      })
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "download") {
    const url = request.url
    const filename = request.filename

    download(
      url,
      filename,
      // onStart
      () => {
        chrome.runtime.sendMessage({ action: "downloadStarted" })
      },
      // onComplete
      () => {
        chrome.runtime.sendMessage({ action: "downloadCompleted" })
      },
      // onError
      (error) => {
        chrome.runtime.sendMessage({
          action: "downloadError",
          error: error.message
        })
      }
    )
  }
  return true // Keep the message channel open for async response
})

// Run on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addDownloadButtons)
} else {
  addDownloadButtons()
}

// Also run when the page content changes (for SPA navigation)
let isAddingButtons = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const observer = new MutationObserver(() => {
  // Skip if already adding buttons or if mutation was caused by our own additions
  if (isAddingButtons) {
    return
  }

  // Debounce to avoid running too frequently
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    isAddingButtons = true
    addDownloadButtons()
    isAddingButtons = false
  }, 500)
})

observer.observe(document.body, {
  childList: true,
  subtree: true
})
