"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import EditModal from "@/components/EditModal";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, ThumbsUp, Trash2, Pencil } from "lucide-react"
import type { Post } from "@/lib/types"
import type { User } from "firebase/auth"
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface PostCardProps {
  post: Post
  currentUser: User | null
}

export function PostCard({ post, currentUser }: PostCardProps) {
  // Local state for the post data.
  const [postData, setPostData] = useState(post);
  const [likes, setLikes] = useState(post.likes || [])
  const [isLiked, setIsLiked] = useState(currentUser ? likes.includes(currentUser.uid) : false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  useState(currentUser ? likes.includes(currentUser.uid) : false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  // Local state to track deletion status and update the UI immediately.
  const [isDeleted, setIsDeleted] = useState(false);

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

  const confirmDelete = async () => {
    try {
      const postRef = doc(db, "posts", postData.id);
      await deleteDoc(postRef);
      // Immediately update the UI by setting isDeleted to true.
      setIsDeleted(true);
      console.log("Post deleted successfully!");
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleDelete = () => {
    if (!currentUser || currentUser.uid !== postData.authorId) return;

    // Use a confirmation dialog for deletion.
    if (window.confirm("Are you sure you want to delete this post?")) {
      confirmDelete();
    }
  };


  const openEditModal = () => {
    if (!currentUser || currentUser.uid !== postData.authorId) return;
    setEditModalOpen(true);
  };

  // After editing, update both Firestore and local state immediately.
  const handleSave = async (updatedPost: { title: string; content: string }) => {
    try {
      const postRef = doc(db, "posts", postData.id);
      await updateDoc(postRef, updatedPost);
      setPostData((prev) => ({ ...prev, ...updatedPost }));
      console.log("Post updated successfully!");
    } catch (error) {
      console.error("Error updating post:", error);
    }
  };

  // If this post has been deleted locally, don't render the card.
  if (isDeleted) return null;

  return (
    <>
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
          {currentUser?.uid === postData.authorId && (
               <>
                 <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500">
                   <Trash2 className="h-4 w-4 mr-1" />
                 </Button>
                 <Button variant="ghost" size="sm" onClick={openEditModal} className="text-blue-500">
                   <Pencil className="h-4 w-4 mr-1" />
                 </Button>
                 </>
          )}
        </div>
      </CardFooter>
    </Card>
     {/* Edit Modal */}
     <EditModal
     post={postData}
     isOpen={isEditModalOpen}
     onClose={() => setEditModalOpen(false)}
     onSave={handleSave}
   />
   </>
  );
}
