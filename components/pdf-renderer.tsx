"use client"

import { useEffect, useRef, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface PDFRendererProps {
  cloudinaryUrl: string
  width?: string
  height?: string
  className?: string
  onLoadComplete?: () => void
  onError?: (error: Error) => void
}

export function PDFRenderer({
  cloudinaryUrl,
  width = "100%",
  height = "600px",
  className = "",
  onLoadComplete,
  onError,
}: PDFRendererProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Transform Cloudinary URL to force download
        const transformedUrl = cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/')

        // Create a blob URL for the PDF
        const response = await fetch(transformedUrl, {
          headers: {
            'Accept': 'application/pdf',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`)
        }
        
        const blob = await response.blob()
        if (blob.type !== 'application/pdf') {
          throw new Error('Invalid PDF format')
        }

        const blobUrl = URL.createObjectURL(blob)

        if (iframeRef.current) {
          iframeRef.current.src = blobUrl
        }

        onLoadComplete?.()
      } catch (err) {
        const error = err as Error
        setError(error.message)
        onError?.(error)
        console.error('PDF loading error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (cloudinaryUrl) {
      loadPDF()
    }

    // Cleanup blob URL on unmount
    return () => {
      if (iframeRef.current?.src) {
        URL.revokeObjectURL(iframeRef.current.src)
      }
    }
  }, [cloudinaryUrl, onLoadComplete, onError])

  if (!cloudinaryUrl) {
    return <div className="text-destructive">No PDF URL provided</div>
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="w-full h-full" />
        </div>
      )}
      
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-destructive">
          {error}
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          className={`w-full h-full ${isLoading ? "invisible" : "visible"}`}
          style={{ border: "none" }}
          title="PDF Viewer"
          onLoad={() => setIsLoading(false)}
        />
      )}
    </div>
  )
}