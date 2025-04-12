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
import { Camera, File, Trash, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Post } from "@/lib/types";
import { useRouter } from "next/navigation";

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

    // Upload to Cloudinary
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

    // Optionally delete from Cloudinary
    try {
      // Extract public_id from Cloudinary URL
      const urlParts = mediaURL.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const publicId = fileName.split(".")[0];

      // Note: Deletion requires server-side call with API secret for security
      // For client-side demo, we'll assume media is removed from Firestore only
      // In production, implement a serverless function to delete from Cloudinary

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

      const updatedPost = {
        title,
        content,
        mediaURL: mediaURL || null,
        mediaType: mediaType || null,
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

      // Delete media from Cloudinary if it exists
      if (post.mediaURL) {
        // Extract public_id from Cloudinary URL
        const urlParts = post.mediaURL.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const publicId = fileName.split(".")[0];

        // Note: Deletion requires a server-side API call due to API secret
        // For this example, we'll skip Cloudinary deletion and delete from Firestore
        // In production, call a serverless function like:
        /*
        await fetch("/api/cloudinary/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId }),
        });
        */
      }

      // Delete post from Firestore
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                    className="max-h-[300px] mx-auto object-contain rounded-md"
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
        </div>

        <DialogFooter className="flex justify-between">
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