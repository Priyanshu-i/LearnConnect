"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/hooks/use-auth"
import type { ChatGroup, UserProfile } from "@/lib/types"
import { FollowRequestNotification } from "../follow-request-notification"

interface ChatNotificationsProps {
  unreadChats: Record<string, number>
  users: UserProfile[]
  groups: ChatGroup[]
  onSelectChat: (chatId: string, type: "direct" | "group") => void
}

export function ChatNotifications({ unreadChats, users, groups, onSelectChat }: ChatNotificationsProps) {
  const [followRequests, setFollowRequests] = useState<any[]>([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    async function fetchFollowRequests() {
      if (!user) return;
      try {
        const requestsQuery = query(
          collection(db, "followRequests"),
          where("recipientId", "==", user.uid),
          where("status", "==", "pending"),
          orderBy("timestamp", "desc"),
        )

        const querySnapshot = await getDocs(requestsQuery)
        const requests: any[] = []

        querySnapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data(),
          })
        })

        setFollowRequests(requests)
      } catch (error) {
        console.error("Error fetching follow requests:", error)
      }
    }

    fetchFollowRequests()
  }, [user])

  // Filter to only show chats with unread messages
  const unreadChatIds = Object.keys(unreadChats).filter((id) => unreadChats[id] > 0)

  const handleFollowRequestAccepted = () => {
    // Refresh follow requests
    if (user) {
      const requestsQuery = query(
        collection(db, "followRequests"),
        where("recipientId", "==", user.uid),
        where("status", "==", "pending"),
      )

      getDocs(requestsQuery).then((querySnapshot) => {
        const requests: any[] = []

        querySnapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data(),
          })
        })

        setFollowRequests(requests)
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Follow Requests Section */}
      {followRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium mb-2">Follow Requests</h3>
          {followRequests.map((request) => (
            <FollowRequestNotification
              key={request.id}
              request={request}
              onAccept={handleFollowRequestAccepted}
              onDecline={handleFollowRequestAccepted}
            />
          ))}
        </div>
      )}

      {/* Unread Messages Section */}
      {unreadChatIds.length > 0 ? (
        <>
          <h3 className="font-medium mb-2">Unread Messages</h3>
          {unreadChatIds.map((chatId) => {
            // Check if this is a group chat
            const group = groups.find((g) => g.id === chatId)

            if (group) {
              // This is a group chat
              return (
                <div
                  key={chatId}
                  className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-accent border"
                  onClick={() => onSelectChat(chatId, "group")}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{group.name}</p>
                      <Badge variant="default">{unreadChats[chatId]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {unreadChats[chatId]} new {unreadChats[chatId] === 1 ? "message" : "messages"}
                    </p>
                  </div>
                </div>
              )
            } else {
              // This is a direct chat
              // Extract the other user's ID from the chat ID (format: "user1_user2")
              const userIds = chatId.split("_")
              const otherUserId = userIds[0] === user?.uid ? userIds[1] : userIds[0]
              const otherUser = users.find((u) => u.id === otherUserId)

              if (!otherUser) return null

              return (
                <div
                  key={chatId}
                  className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-accent border"
                  onClick={() => onSelectChat(chatId, "direct")}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={otherUser.photoURL || ""} />
                    <AvatarFallback>{otherUser.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{otherUser.displayName}</p>
                      <Badge variant="default">{unreadChats[chatId]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {unreadChats[chatId]} new {unreadChats[chatId] === 1 ? "message" : "messages"}
                    </p>
                  </div>
                </div>
              )
            }
          })}
        </>
      ) : followRequests.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No notifications</p>
        </div>
      ) : null}
    </div>
  )
}
