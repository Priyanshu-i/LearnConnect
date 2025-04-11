"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, ThumbsUp } from "lucide-react"
import type { Post } from "@/lib/types"
import type { User } from "firebase/auth"
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface PostCardProps {
  post: Post
  currentUser: User | null
}

export function PostCard({ post, currentUser }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes || [])
  const [isLiked, setIsLiked] = useState(currentUser ? likes.includes(currentUser.uid) : false)
  const [isLoading, setIsLoading] = useState(false)
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
        await updateDoc(activityRef, {
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

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleViewProfile}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.authorPhotoURL || ""} />
              <AvatarFallback>{post.authorName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium hover:underline">{post.authorName}</p>
              <p className="text-xs text-muted-foreground">
                {post.createdAt && formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <Link href={`/post/${post.id}`}>
        <CardContent className="pb-2">
          <CardTitle className="text-xl mb-2">{post.title}</CardTitle>
          <p className="line-clamp-3 mb-3">{post.content}</p>

          {post.imageURL && (
            <div className="relative w-full h-48 rounded-md overflow-hidden mb-2">
              <Image src={post.imageURL || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
            </div>
          )}
        </CardContent>
      </Link>

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

          <Link href={`/post/${post.id}`}>
            <Button variant="ghost" size="sm">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span>{post.comments?.length || 0}</span>
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
