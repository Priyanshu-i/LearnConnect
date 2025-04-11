"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  Minimize,
  Printer,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MediaViewerProps {
  isOpen: boolean
  onClose: () => void
  mediaUrl: string
  mediaType: "image" | "video" | "pdf" | "gif"
  title?: string
}

export function MediaViewer({ isOpen, onClose, mediaUrl, mediaType, title }: MediaViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [searchResults, setSearchResults] = useState<number[]>([])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const [pdfDocument, setPdfDocument] = useState<any>(null)
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [pdfText, setPdfText] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // PDF.js library would be used here in a real implementation
  // For this example, we'll simulate PDF functionality
  useEffect(() => {
    if (mediaType === "pdf" && isOpen) {
      // Simulate loading a PDF document
      setIsLoading(true)

      // Simulate fetching PDF data
      setTimeout(() => {
        // Simulate PDF with 10 pages
        setTotalPages(10)

        // Generate fake thumbnails
        const fakeThumbnails = Array.from(
          { length: 10 },
          (_, i) => `/placeholder.svg?height=100&width=80&text=Page ${i + 1}`,
        )
        setThumbnails(fakeThumbnails)

        // Generate fake text content for search
        const fakeTextContent = Array.from(
          { length: 10 },
          (_, i) => `This is page ${i + 1} of the PDF document. It contains sample text that can be searched.`,
        )
        setPdfText(fakeTextContent)

        setIsLoading(false)
      }, 1000)
    }
  }, [mediaType, isOpen])

  useEffect(() => {
    if (searchText.trim() && pdfText.length > 0) {
      const results: number[] = []
      pdfText.forEach((text, pageIndex) => {
        if (text.toLowerCase().includes(searchText.toLowerCase())) {
          results.push(pageIndex + 1)
        }
      })
      setSearchResults(results)
      setCurrentSearchIndex(0)

      // Go to first result if there are any
      if (results.length > 0) {
        setCurrentPage(results[0])
      }
    } else {
      setSearchResults([])
    }
  }, [searchText, pdfText])

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = mediaUrl
    link.download = title || `download.${mediaType}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleZoomIn = () => {
    if (zoomLevel < 3) {
      setZoomLevel(zoomLevel + 0.25)
    }
  }

  const handleZoomOut = () => {
    if (zoomLevel > 0.5) {
      setZoomLevel(zoomLevel - 0.25)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleRotate = () => {
    setRotation((rotation + 90) % 360)
  }

  const handleToggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print: ${title || "Document"}</title>
            <style>
              body { margin: 0; padding: 20px; }
              img { max-width: 100%; }
            </style>
          </head>
          <body>
            ${
              mediaType === "pdf"
                ? `<iframe src="${mediaUrl}" width="100%" height="100%" style="border: none;"></iframe>`
                : mediaType === "image" || mediaType === "gif"
                  ? `<img src="${mediaUrl}" alt="${title || "Image"}" />`
                  : `<p>Cannot print this media type</p>`
            }
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  const handleNextSearchResult = () => {
    if (searchResults.length > 0) {
      const nextIndex = (currentSearchIndex + 1) % searchResults.length
      setCurrentSearchIndex(nextIndex)
      setCurrentPage(searchResults[nextIndex])
    }
  }

  const handlePrevSearchResult = () => {
    if (searchResults.length > 0) {
      const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length
      setCurrentSearchIndex(prevIndex)
      setCurrentPage(searchResults[prevIndex])
    }
  }

  const handleThumbnailClick = (page: number) => {
    setCurrentPage(page)
  }

  const renderMedia = () => {
    switch (mediaType) {
      case "image":
        return (
          <div className="relative flex items-center justify-center h-full">
            {isLoading && <Skeleton className="absolute inset-0" />}
            <img
              src={mediaUrl || "/placeholder.svg"}
              alt={title || "Image"}
              className="max-h-[80vh] max-w-full object-contain transition-transform"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: "transform 0.3s ease",
              }}
              onLoad={() => setIsLoading(false)}
            />
          </div>
        )
      case "gif":
        return (
          <div className="relative flex items-center justify-center h-full">
            {isLoading && <Skeleton className="absolute inset-0" />}
            <img
              src={mediaUrl || "/placeholder.svg"}
              alt={title || "GIF"}
              className="max-h-[80vh] max-w-full object-contain"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        )
      case "video":
        return (
          <div className="relative flex items-center justify-center h-full">
            {isLoading && <Skeleton className="absolute inset-0" />}
            <video src={mediaUrl} controls className="max-h-[80vh] max-w-full" onLoadedData={() => setIsLoading(false)}>
              Your browser does not support the video tag.
            </video>
          </div>
        )
      case "pdf":
        return (
          <div className="flex flex-col h-full" ref={containerRef}>
            <Tabs defaultValue="document" className="w-full h-full">
              <div className="flex justify-between items-center mb-2 border-b pb-2">
                <TabsList>
                  <TabsTrigger value="document">Document</TabsTrigger>
                  <TabsTrigger value="thumbnails">Thumbnails</TabsTrigger>
                </TabsList>

                <div className="flex items-center">
                  <div className="flex items-center mr-4">
                    <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="mx-2 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleRotate}>
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleToggleFullscreen}>
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handlePrint}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center mb-2">
                <Input
                  placeholder="Search in document..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="max-w-xs mr-2"
                />
                {searchResults.length > 0 && (
                  <div className="flex items-center">
                    <Button variant="outline" size="sm" onClick={handlePrevSearchResult}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="mx-2 text-xs">
                      {currentSearchIndex + 1} of {searchResults.length}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleNextSearchResult}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <TabsContent value="document" className="flex-1 relative mt-0">
                {isLoading && <Skeleton className="absolute inset-0" />}
                <div
                  className="w-full h-full bg-muted flex items-center justify-center overflow-auto"
                  style={{ minHeight: "60vh" }}
                >
                  {/* In a real implementation, this would be a PDF.js canvas */}
                  <div
                    className="bg-white shadow-md p-8 m-4"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transformOrigin: "center center",
                      transition: "transform 0.3s ease",
                      width: "calc(8.5in * 96px)", // Standard US Letter size at 96 DPI
                      height: "calc(11in * 96px)",
                    }}
                  >
                    <div className="flex flex-col h-full justify-center items-center">
                      <h2 className="text-2xl font-bold mb-4">Page {currentPage}</h2>
                      <p className="text-center mb-4">{pdfText[currentPage - 1] || "This is a simulated PDF page."}</p>
                      {searchText && pdfText[currentPage - 1]?.toLowerCase().includes(searchText.toLowerCase()) && (
                        <div className="bg-yellow-200 p-2 rounded">Search term "{searchText}" found on this page</div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="thumbnails" className="flex-1 mt-0">
                <div className="flex h-full">
                  <ScrollArea className="w-1/4 border-r pr-2">
                    <div className="space-y-2 p-2">
                      {thumbnails.map((thumbnail, index) => (
                        <div
                          key={index}
                          className={`cursor-pointer p-1 rounded ${currentPage === index + 1 ? "bg-accent" : ""}`}
                          onClick={() => handleThumbnailClick(index + 1)}
                        >
                          <div className="relative">
                            <img
                              src={thumbnail || "/placeholder.svg"}
                              alt={`Page ${index + 1}`}
                              className="w-full h-auto border"
                            />
                            <div className="absolute bottom-0 right-0 bg-background/80 px-1 text-xs">{index + 1}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex-1 relative">
                    {isLoading && <Skeleton className="absolute inset-0" />}
                    <div className="w-full h-full bg-muted flex items-center justify-center overflow-auto">
                      {/* In a real implementation, this would be a PDF.js canvas */}
                      <div
                        className="bg-white shadow-md p-8 m-4"
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                          transformOrigin: "center center",
                          transition: "transform 0.3s ease",
                          width: "calc(8.5in * 96px)", // Standard US Letter size at 96 DPI
                          height: "calc(11in * 96px)",
                        }}
                      >
                        <div className="flex flex-col h-full justify-center items-center">
                          <h2 className="text-2xl font-bold mb-4">Page {currentPage}</h2>
                          <p className="text-center mb-4">
                            {pdfText[currentPage - 1] || "This is a simulated PDF page."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )
      default:
        return <div>Unsupported media type</div>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-2 border-b">
            <h3 className="font-medium truncate">{title || "Media Viewer"}</h3>
            <div className="flex items-center gap-2">
              {(mediaType === "image" || mediaType === "gif") && (
                <>
                  <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleRotate}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">{renderMedia()}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
