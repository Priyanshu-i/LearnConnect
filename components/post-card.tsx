"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, ThumbsUp, FileText, Film, Pencil, Clock } from "lucide-react"
import type { Post } from "@/lib/types"
import type { User } from "firebase/auth"
import { doc, updateDoc, arrayUnion, arrayRemove, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { BookmarkButton } from "./bookmark-button"
import { PostReplyButton } from "./post-reply-button"
import { MediaViewer } from "./media-viewer"
import { PostEditModal } from "@/components/post-edit-modal"
import type React from "react"
import { SignInModal } from "./sign-in-modal"
import { Timestamp } from "firebase/firestore"

interface PostCardProps {
  post: Post
  currentUser: User | null
}

export function PostCard({ post, currentUser }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes || [])
  const [isLiked, setIsLiked] = useState(currentUser ? likes.includes(currentUser.uid) : false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleLike = async () => {
    if (!currentUser) return

    try {
      const postRef = doc(db, "posts", post.id)

      if (isLiked) {
        // Unlike
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.uid),
        })
        setLikes(likes.filter((id) => id !== currentUser.uid))
      } else {
        // Like
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid),
        })
        setLikes([...likes, currentUser.uid])

        // Add to user activity
        const activityRef = doc(db, "users", currentUser.uid, "activity", `like_${post.id}`)
        await setDoc(activityRef, {
          type: "like",
          targetId: post.id,
          timestamp: Date.now(),
        })
      }

      setIsLiked(!isLiked)
    } catch (error) {
      console.error("Error updating like:", error)
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleViewProfile = () => {
    router.push(`/profile/${post.authorId}`)
  }

  const handleOpenMediaViewer = () => {
    if (!currentUser) {
      setIsSignInModalOpen(true)
      return
    }
    setIsMediaViewerOpen(true)
  }

  const handlePostClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setIsSignInModalOpen(true)
      return
    }
    router.push(`/post/${post.id}`)
  }

  const getMediaType = () => {
    if (!post.mediaURL) return null

    const url = post.mediaURL.toLowerCase()

    if (url.endsWith(".pdf")) return "pdf"
    if (url.endsWith(".gif")) return "gif"
    if (url.match(/\.(mp4|webm|ogg)$/)) return "video"
    if (url.match(/\.(jpg|jpeg|png|webp)$/)) return "image"

    return "image" // Default to image
  }

  const renderMediaPreview = () => {
    if (!post.mediaURL) return null

    const mediaType = getMediaType()

    switch (mediaType) {
      case "image":
        return (
          <div
            className="relative w-full h-48 rounded-md overflow-hidden mb-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              handleOpenMediaViewer()
            }}
          >
            <Image src={post.mediaURL || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
          </div>
        )
      case "gif":
        return (
          <div
            className="relative w-full h-48 rounded-md overflow-hidden mb-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              handleOpenMediaViewer()
            }}
          >
            <Image src={post.mediaURL || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
          </div>
        )
      case "video":
        return (
          <div
            className="relative w-full rounded-md overflow-hidden mb-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              handleOpenMediaViewer()
            }}
          >
            <video src={post.mediaURL} className="w-full h-48 object-cover" controls={false} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Film className="h-12 w-12 text-white" />
            </div>
          </div>
        )
      case "pdf":
        return (
          <div
            className="relative p-4 border rounded-md mb-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              handleOpenMediaViewer()
            }}
          >
            <div className="flex items-center">
              <FileText className="h-10 w-10 mr-2 text-red-500" />
              <div>
                <p className="font-medium">PDF Document</p>
                <p className="text-sm text-muted-foreground">Click to view</p>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // Validate and format createdAt
  const createdAtDate = post.createdAt && post.createdAt instanceof Timestamp ? post.createdAt.toDate() : null

  // Validate and format expiresAt
  const expirationDate = post.expiresAt instanceof Timestamp ? post.expiresAt.toDate() : null

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {
                if (!currentUser) {
                  setIsSignInModalOpen(true)
                } else {
                  handleViewProfile()
                }
              }}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.authorPhotoURL || ""} />
                <AvatarFallback>{post.authorName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium hover:underline">{post.authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : "Unknown time"}
                </p>
              </div>
            </div>
          </div>
          {expirationDate && (
            <div className="flex items-center text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-full">
              <Clock className="h-3 w-3 mr-1" />
              Expires {formatDistanceToNow(expirationDate, { addSuffix: true })}
            </div>
          )}
        </CardHeader>

        <CardContent className="pb-2">
          <Link href="#" onClick={handlePostClick}>
            <CardTitle className="text-xl mb-2">{post.title}</CardTitle>
          </Link>
          <p className="line-clamp-3 mb-3">{post.content}</p>

          {renderMediaPreview()}
        </CardContent>

        <CardFooter className="flex justify-between pt-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={!currentUser}
              className={isLiked ? "text-purple-500" : ""}
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              <span>{likes.length}</span>
            </Button>

            <Link href="#" onClick={handlePostClick}>
              <Button variant="ghost" size="sm">
                <MessageSquare className="h-4 w-4 mr-1" />
                <span>{post.comments?.length || 0}</span>
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {currentUser?.uid === post.authorId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditModalOpen(true)}
                title="Edit post"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <PostEditModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              post={post}
            />
            {currentUser?.uid !== post.authorId && (
            <PostReplyButton post={post} size="icon" />
            )}
            <BookmarkButton postId={post.id} size="icon" />
          </div>
        </CardFooter>
      </Card>

      {post.mediaURL && getMediaType() && (
        <MediaViewer
          isOpen={isMediaViewerOpen}
          onClose={() => setIsMediaViewerOpen(false)}
          mediaUrl={post.mediaURL}
          mediaType={getMediaType() as "image" | "video" | "pdf" | "gif"}
          title={post.title}
        />
      )}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        message="Sign in to view posts, media, and interact with content."
      />
    </>
  )
}