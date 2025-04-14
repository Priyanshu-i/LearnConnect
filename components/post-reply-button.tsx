"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { doc, getDoc, collection, addDoc } from "firebase/firestore"
import { ref, push, set, get } from "firebase/database"
import { db, rtdb } from "@/lib/firebase"
import { MessageCircleReply, Send } from "lucide-react"
import type { Post } from "@/lib/types"
import { useRouter } from "next/navigation"
import { SignInModal } from "./sign-in-modal"

interface PostReplyButtonProps {
  post: Post
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

export function PostReplyButton({ post, variant = "ghost", size = "sm" }: PostReplyButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canMessage, setCanMessage] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function checkMessagingPermission() {
      if (!user || user.uid === post.authorId) {
        setCanMessage(false)
        return
      }

      try {
        // Check if users follow each other
        const currentUserDoc = await getDoc(doc(db, "users", user.uid))
        const authorDoc = await getDoc(doc(db, "users", post.authorId))

        if (!currentUserDoc.exists() || !authorDoc.exists()) {
          setCanMessage(false)
          return
        }

        const currentUserData = currentUserDoc.data()
        const authorData = authorDoc.data()

        const currentUserFollowing = currentUserData.following || []
        const authorFollowing = authorData.following || []

        // Check if they follow each other
        const mutualFollow = currentUserFollowing.includes(post.authorId) && authorFollowing.includes(user.uid)

        setCanMessage(mutualFollow)
      } catch (error) {
        console.error("Error checking messaging permission:", error)
        setCanMessage(false)
      }
    }

    checkMessagingPermission()
  }, [user, post.authorId])

  const handleSendMessage = async () => {
    if (!user || !message.trim() || !canMessage) return

    try {
      setIsSubmitting(true)

      // Create a unique chat ID (sorted user IDs to ensure consistency)
      const chatId = [user.uid, post.authorId].sort().join("_")

      // Check if chat already exists
      const chatRef = ref(rtdb, `chats/${chatId}`)
      const chatSnapshot = await get(chatRef)

      if (!chatSnapshot.exists()) {
        // Create new chat if it doesn't exist
        await set(chatRef, {
          participants: [user.uid, post.authorId],
          createdAt: Date.now(),
        })
      }

      // Add message to chat
      const messagesRef = ref(rtdb, `chats/${chatId}/messages`)
      const newMessageRef = push(messagesRef)

      await set(newMessageRef, {
        content: message,
        senderId: user.uid,
        senderName: user.displayName,
        senderPhotoURL: user.photoURL,
        timestamp: Date.now(),
        postReply: {
          postId: post.id,
          postTitle: post.title,
        },
      })

      // Update chat room
      await set(chatRef, {
        participants: [user.uid, post.authorId],
        lastMessage: message,
        lastMessageTimestamp: Date.now(),
        [`unreadCount.${post.authorId.replace(/[.#$/\[\]]/g, "_")}`]: (chatSnapshot.val()?.unreadCount?.[post.authorId.replace(/[.#$/\[\]]/g, "_")] || 0) + 1,
      })

      // Add to user activity
      const activityRef = collection(db, "users", user.uid, "activity")
      await addDoc(activityRef, {
        type: "message",
        targetId: post.id,
        content: "Replied to post via message",
        timestamp: Date.now(),
      })

      toast({
        title: "Message sent",
        description: "Your reply has been sent as a direct message",
      })

      setMessage("")
      setIsDialogOpen(false)

      // Navigate to chat with this user
      router.push(`/chat?chatId=${chatId}`)
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenDialog = () => {
    if (!user) {
      setIsSignInModalOpen(true)
      return
    }

    if (!canMessage) {
      toast({
        title: "Cannot send message",
        description: "You can only message users who follow you and whom you follow",
        variant: "destructive",
      })
      return
    }

    setIsDialogOpen(true)
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={handleOpenDialog}>
        <MessageCircleReply className={`h-4 w-4 ${size !== "icon" ? "mr-1" : ""}`} />
        {size !== "icon" && <span>Reply</span>}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-md">
              <p className="font-medium">{post.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
            </div>

            <Textarea
              placeholder="Type your reply..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={isSubmitting || !message.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        message="Sign in to reply to posts and send messages."
      />
    </>
  )
}
