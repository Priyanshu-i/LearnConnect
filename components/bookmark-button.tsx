"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bookmark } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"

interface BookmarkButtonProps {
  postId: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

export function BookmarkButton({ postId, variant = "ghost", size = "sm" }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    async function checkBookmarkStatus() {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        const bookmarkRef = doc(db, "users", user.uid, "bookmarks", postId)
        const bookmarkDoc = await getDoc(bookmarkRef)

        setIsBookmarked(bookmarkDoc.exists())
      } catch (error) {
        console.error("Error checking bookmark status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkBookmarkStatus()
  }, [postId, user])

  const handleToggleBookmark = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to bookmark posts",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const bookmarkRef = doc(db, "users", user.uid, "bookmarks", postId)

      if (isBookmarked) {
        // Remove bookmark
        await deleteDoc(bookmarkRef)
        setIsBookmarked(false)
        toast({
          title: "Bookmark removed",
          description: "Post has been removed from your bookmarks",
        })
      } else {
        // Add bookmark
        await setDoc(bookmarkRef, {
          postId,
          createdAt: Date.now(),
        })
        setIsBookmarked(true)
        toast({
          title: "Bookmark added",
          description: "Post has been saved to your bookmarks",
        })
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error)
      toast({
        title: "Error",
        description: "Failed to update bookmark. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={isBookmarked ? "default" : variant}
      size={size}
      onClick={handleToggleBookmark}
      disabled={isLoading || !user}
      className={isBookmarked ? "text-primary-foreground" : ""}
    >
      <Bookmark className={`h-4 w-4 ${size !== "icon" ? "mr-1" : ""} ${isBookmarked ? "fill-current" : ""}`} />
      {size !== "icon" && <span>{isBookmarked ? "Saved" : "Save"}</span>}
    </Button>
  )
}
