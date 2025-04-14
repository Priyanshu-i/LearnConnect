"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, addDoc, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/navbar";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MediaUpload } from "@/components/media-upload";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomCalendarModal } from "@/components/calendar-modal";

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{
    file: File | null;
    preview: string | null;
    type: "image" | "video" | "pdf" | "gif" | null;
  }>({
    file: null,
    preview: null,
    type: null,
  });
  const [enableExpiration, setEnableExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
  const [expirationTime, setExpirationTime] = useState("23:59");

  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleMediaSelected = (file: File, type: "image" | "video" | "pdf" | "gif") => {
    const preview = URL.createObjectURL(file);
    setSelectedMedia({
      file,
      preview,
      type,
    });
  };

  const handleMediaRemoved = () => {
    if (selectedMedia.preview) {
      URL.revokeObjectURL(selectedMedia.preview);
    }
    setSelectedMedia({
      file: null,
      preview: null,
      type: null,
    });
  };

  const uploadMediaToCloudinary = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok && data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error(data.error?.message || "Failed to upload media");
      }
    } catch (error) {
      console.error("Error uploading media:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload media. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error",
        description: "You must be signed in to create a post.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let mediaURL = null;
      let mediaType = null;

      if (selectedMedia.file) {
        mediaURL = await uploadMediaToCloudinary(selectedMedia.file);
        mediaType = selectedMedia.type;
      }

      let expiresAt = null;
      if (enableExpiration && expirationDate) {
        const [hours, minutes] = expirationTime.split(":").map(Number);
        const expirationDateTime = new Date(expirationDate);
        expirationDateTime.setHours(hours, minutes, 0, 0);
        expiresAt = Timestamp.fromDate(expirationDateTime);
      }

      const postRef = await addDoc(collection(db, "posts"), {
        title: title.trim(),
        content: content.trim(),
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        authorPhotoURL: user.photoURL || undefined,
        createdAt: Timestamp.now(),
        likes: [],
        comments: [],
        mediaURL,
        mediaType,
        expiresAt,
      });

      const activityRef = doc(db, "users", user.uid, "activity", `post_${postRef.id}`);
      await setDoc(activityRef, {
        type: "post",
        targetId: postRef.id,
        content: title.trim(),
        timestamp: Timestamp.now(),
      });

      toast({
        title: "Post created",
        description: "Your post has been published successfully.",
      });

      router.push("/");
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const formattedHour = hour.toString().padStart(2, "0");
      const formattedMinute = minute.toString().padStart(2, "0");
      timeOptions.push(`${formattedHour}:${formattedMinute}`);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create a New Post</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your post"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="content" className="text-sm font-medium">
                  Content
                </label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your knowledge..."
                  rows={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Media (optional)</label>
                <MediaUpload
                  onMediaSelected={handleMediaSelected}
                  onMediaRemoved={handleMediaRemoved}
                  selectedMedia={selectedMedia}
                />
              </div>
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="expiration-toggle">Post Expiration</Label>
                    <p className="text-xs text-muted-foreground">Set a time for this post to automatically expire</p>
                  </div>
                  <Switch id="expiration-toggle" checked={enableExpiration} onCheckedChange={setEnableExpiration} />
                </div>
                {enableExpiration && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Expiration Date</Label>
                      <CustomCalendarModal
                        selectedDate={expirationDate ?? null}
                        onSelect={(date) => setExpirationDate(date || undefined)}
                        disabled={(date) => date < new Date()}
                      />
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
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !title || !content}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isSubmitting ? "Publishing..." : "Publish Post"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
}