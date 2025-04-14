"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, File, Trash, Upload, X, CalendarIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Post } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CustomCalendarModal } from "./calendar-modal";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PostEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
}

export function PostEditModal({ isOpen, onClose, post }: PostEditModalProps) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [mediaURL, setMediaURL] = useState(post.mediaURL || "");
  const [mediaType, setMediaType] = useState<
    "image" | "video" | "pdf" | "gif" | null
  >(post.mediaType || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [enableExpiration, setEnableExpiration] = useState(!!post.expiresAt);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    post.expiresAt ? new Date(post.expiresAt.toDate()) : undefined
  );
  const [expirationTime, setExpirationTime] = useState(
    post.expiresAt
      ? `${post.expiresAt.toDate().getHours().toString().padStart(2, "0")}:${post.expiresAt.toDate().getMinutes().toString().padStart(2, "0")}`
      : "23:59"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.split("/")[0];
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    let type: "image" | "video" | "pdf" | "gif" | null = null;
    if (fileType === "image") {
      type = fileExtension === "gif" ? "gif" : "image";
    } else if (fileType === "video") {
      type = "video";
    } else if (fileExtension === "pdf") {
      type = "pdf";
    }

    if (!type) {
      toast({
        title: "Unsupported file type",
        description: "Please select an image, video, GIF, or PDF file.",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "default_preset"
      );

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${
          process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "your_cloud_name"
        }/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Cloudinary upload failed");
      }

      const data = await response.json();
      setMediaURL(data.secure_url);
      setMediaType(type);

      toast({
        title: "File uploaded",
        description: "Media has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      toast({
        title: "Upload error",
        description: "Failed to upload media. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMedia = async () => {
    if (!mediaURL) return;

    try {
      setMediaURL("");
      setMediaType(null);

      toast({
        title: "Media removed",
        description: "Media has been removed from the post.",
      });
    } catch (error) {
      console.error("Error removing media:", error);
      toast({
        title: "Error",
        description: "Failed to remove media.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const postRef = doc(db, "posts", post.id);

      let expiresAt: number | null = null;
      if (enableExpiration && expirationDate) {
        const [hours, minutes] = expirationTime.split(":").map(Number);
        const expirationDateTime = new Date(expirationDate);
        expirationDateTime.setHours(hours, minutes, 0, 0);
        expiresAt = expirationDateTime.getTime();
      }

      const updatedPost = {
        title,
        content,
        mediaURL: mediaURL || null,
        mediaType: mediaType || null,
        expiresAt,
      };

      await updateDoc(postRef, updatedPost);

      toast({
        title: "Post updated",
        description: "Your post has been updated successfully.",
      });

      onClose();
      router.refresh();
    } catch (error) {
      console.error("Error updating post:", error);
      toast({
        title: "Error",
        description: "Failed to update post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const postRef = doc(db, "posts", post.id);

      if (post.mediaURL) {
        // Note: Cloudinary deletion requires server-side API call
      }

      await deleteDoc(postRef);

      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully.",
      });

      onClose();
      router.push("/");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Generate time options (every 30 minutes)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const formattedHour = hour.toString().padStart(2, "0");
      const formattedMinute = minute.toString().padStart(2, "0");
      timeOptions.push(`${formattedHour}:${formattedMinute}`);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-3xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content..."
              className="min-h-[150px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Media</Label>
            {mediaURL ? (
              <div className="relative border rounded-md p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-background/80 z-10"
                  onClick={handleRemoveMedia}
                >
                  <X className="h-4 w-4" />
                </Button>
                {mediaType === "image" || mediaType === "gif" ? (
                  <img
                    src={mediaURL}
                    alt="Post media"
                    className="max-h-[300px] w-full object-contain rounded-md"
                  />
                ) : mediaType === "video" ? (
                  <video
                    src={mediaURL}
                    controls
                    className="max-h-[300px] w-full object-contain rounded-md"
                  />
                ) : mediaType === "pdf" ? (
                  <div className="flex items-center justify-center p-8 bg-muted rounded-md">
                    <File className="h-12 w-12 mr-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">PDF Document</p>
                      <p className="text-sm text-muted-foreground">
                        PDF file attached to this post
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Tabs defaultValue="upload">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                  <TabsTrigger value="camera">Camera</TabsTrigger>
                  <TabsTrigger value="url">URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="p-4 border rounded-md">
                  <div className="flex flex-col items-center justify-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,video/*,application/pdf"
                      onChange={handleFileChange}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 flex flex-col gap-2"
                    >
                      <Upload className="h-8 w-8" />
                      <span>Click to upload</span>
                      <span className="text-xs text-muted-foreground">
                        Supports images, videos, GIFs, and PDFs
                      </span>
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="camera" className="p-4 border rounded-md">
                  <div className="flex flex-col items-center justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Camera access",
                          description: "Camera functionality not implemented.",
                        });
                      }}
                      className="w-full h-32 flex flex-col gap-2"
                    >
                      <Camera className="h-8 w-8" />
                      <span>Take a photo</span>
                      <span className="text-xs text-muted-foreground">
                        Use your device camera
                      </span>
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="url" className="p-4 border rounded-md">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="media-url">Media URL</Label>
                      <Input
                        id="media-url"
                        placeholder="Enter URL to image, video, or PDF"
                        value={mediaURL}
                        onChange={(e) => setMediaURL(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="media-type">Media Type</Label>
                      <select
                        id="media-type"
                        className="w-full p-2 border rounded-md"
                        value={mediaType || ""}
                        onChange={(e) =>
                          setMediaType(
                            e.target.value as "image" | "video" | "gif" | "pdf"
                          )
                        }
                      >
                        <option value="">Select type</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="gif">GIF</option>
                        <option value="pdf">PDF</option>
                      </select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="expiration-toggle">Post Expiration</Label>
                <p className="text-xs text-muted-foreground">
                  Set a time for this post to automatically expire
                </p>
              </div>
              <Switch
                id="expiration-toggle"
                checked={enableExpiration}
                onCheckedChange={setEnableExpiration}
              />
            </div>

            {enableExpiration && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label>Expiration Date</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !expirationDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {expirationDate ? format(expirationDate, "PPP") : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          style={{
            position: 'absolute',
            transform: 'translate(-50%, -110%)', // Combines both transformations
            bottom: '100%',
            left: '50%',
            maxWidth: '90vw', // Ensures it stays within the screen on mobile
          }}
        >
          <CustomCalendarModal
            selectedDate={expirationDate ?? null}
            onSelect={(date) => setExpirationDate(date || undefined)}
            disabled={(date) => date < new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>

    <div className="space-y-2">
      <Label>Expiration Time</Label>
      <Select value={expirationTime} onValueChange={setExpirationTime}>
        <SelectTrigger>
          <SelectValue placeholder="Select time" />
        </SelectTrigger>
        <SelectContent>
          {timeOptions.map((time) => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
)}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Are you sure?
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Post
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || isDeleting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
