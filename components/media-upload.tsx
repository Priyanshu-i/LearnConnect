"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Camera, File, FileImage, Film, ImageIcon, X } from "lucide-react"

interface MediaUploadProps {
  onMediaSelected: (file: File, type: "image" | "video" | "pdf" | "gif") => void
  onMediaRemoved: () => void
  selectedMedia: {
    file: File | null
    preview: string | null
    type: "image" | "video" | "pdf" | "gif" | null
  }
}

export function MediaUpload({ onMediaSelected, onMediaRemoved, selectedMedia }: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const gifInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()
  

  // Simulate progress for demo purposes
  const simulateProgress = () => {
    setIsUploading(true)
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          return 100
        }
        return prev + 10
      })
    }, 300)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video" | "pdf" | "gif") => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      })
      return
    }

    // Validate file type
    if (type === "image" && !file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    if (type === "video" && !file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      })
      return
    }

    if (type === "pdf" && file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive",
      })
      return
    }

    if (type === "gif" && file.type !== "image/gif") {
      toast({
        title: "Invalid file type",
        description: "Please select a GIF file",
        variant: "destructive",
      })
      return
    }

    simulateProgress()
    onMediaSelected(file, type)
  }

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take photos",
        variant: "destructive",
      })
    }
  }

  const handleTakePhoto = () => {
    if (!videoRef.current) return

    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) return

      const file = new window.File([blob], "camera-capture.jpg", { type: "image/jpeg" })
      simulateProgress()
      onMediaSelected(file, "image")

      // Stop the camera stream
      const stream = videoRef.current?.srcObject as MediaStream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }, "image/jpeg")
  }

  const renderPreview = () => {
    if (!selectedMedia.file || !selectedMedia.preview) return null

    switch (selectedMedia.type) {
      case "image":
      case "gif":
        return (
          <div className="relative">
            <img
              src={selectedMedia.preview || "/placeholder.svg"}
              alt="Preview"
              className="w-full h-48 object-contain rounded-md border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 rounded-full"
              onClick={onMediaRemoved}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      case "video":
        return (
          <div className="relative">
            <video src={selectedMedia.preview} controls className="w-full h-48 object-contain rounded-md border" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 rounded-full"
              onClick={onMediaRemoved}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      case "pdf":
        return (
          <div className="relative p-4 border rounded-md">
            <div className="flex items-center">
              <File className="h-10 w-10 mr-2 text-red-500" />
              <div className="flex-1 truncate">
                <p className="font-medium">{selectedMedia.file.name}</p>
                <p className="text-sm text-muted-foreground">{(selectedMedia.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 rounded-full"
              onClick={onMediaRemoved}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {isUploading ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      ) : selectedMedia.file ? (
        renderPreview()
      ) : (
        <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="camera">Camera</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex flex-col h-20 gap-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-5 w-5" />
                <span className="text-xs">Image</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="flex flex-col h-20 gap-1"
                onClick={() => videoInputRef.current?.click()}
              >
                <Film className="h-5 w-5" />
                <span className="text-xs">Video</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="flex flex-col h-20 gap-1"
                onClick={() => pdfInputRef.current?.click()}
              >
                <File className="h-5 w-5" />
                <span className="text-xs">PDF</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="flex flex-col h-20 gap-1"
                onClick={() => gifInputRef.current?.click()}
              >
                <FileImage className="h-5 w-5" />
                <span className="text-xs">GIF</span>
              </Button>
            </div>

            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, "image")}
              className="hidden"
            />

            <Input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => handleFileChange(e, "video")}
              className="hidden"
            />

            <Input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileChange(e, "pdf")}
              className="hidden"
            />

            <Input
              ref={gifInputRef}
              type="file"
              accept="image/gif"
              onChange={(e) => handleFileChange(e, "gif")}
              className="hidden"
            />
          </TabsContent>

          <TabsContent value="camera" className="space-y-4 pt-4">
            <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />

              {!videoRef.current?.srcObject && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button onClick={handleCameraCapture}>
                    <Camera className="h-4 w-4 mr-2" />
                    Access Camera
                  </Button>
                </div>
              )}
            </div>

            {videoRef.current?.srcObject && (
              <Button onClick={handleTakePhoto} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
