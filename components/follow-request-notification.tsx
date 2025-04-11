"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { doc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface FollowRequestNotificationProps {
  request: {
    id: string
    senderId: string
    senderName: string
    senderPhotoURL?: string
    timestamp: number
  }
  onAccept: () => void
  onDecline: () => void
}

export function FollowRequestNotification({ request, onAccept, onDecline }: FollowRequestNotificationProps) {
  const { toast } = useToast()
  const router = useRouter()

  const handleAccept = async () => {
    try {
      // Update current user's followers
      const currentUserRef = doc(db, "users", request.id.split("_")[1])
      await updateDoc(currentUserRef, {
        followers: arrayUnion(request.senderId),
      })

      // Update sender's following
      const senderRef = doc(db, "users", request.senderId)
      await updateDoc(senderRef, {
        following: arrayUnion(request.id.split("_")[1]),
      })

      // Delete the request
      const requestRef = doc(db, "followRequests", request.id)
      await deleteDoc(requestRef)

      toast({
        title: "Request accepted",
        description: `You are now connected with ${request.senderName}`,
      })

      onAccept()
    } catch (error) {
      console.error("Error accepting follow request:", error)
      toast({
        title: "Error",
        description: "Failed to accept request. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDecline = async () => {
    try {
      // Delete the request
      const requestRef = doc(db, "followRequests", request.id)
      await deleteDoc(requestRef)

      toast({
        title: "Request declined",
        description: "The follow request has been declined",
      })

      onDecline()
    } catch (error) {
      console.error("Error declining follow request:", error)
      toast({
        title: "Error",
        description: "Failed to decline request. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleViewProfile = () => {
    router.push(`/profile/${request.senderId}`)
  }

  return (
    <Card className="mb-2 border-l-4 border-l-purple-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleViewProfile}>
            <Avatar>
              <AvatarImage src={request.senderPhotoURL || ""} />
              <AvatarFallback>{request.senderName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{request.senderName}</p>
              <p className="text-sm text-muted-foreground">wants to follow you</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDecline}>
              Decline
            </Button>
            <Button size="sm" onClick={handleAccept}>
              Accept
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
