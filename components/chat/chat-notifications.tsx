"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { ChatGroup, UserProfile } from "@/lib/types"

interface ChatNotificationsProps {
  unreadChats: Record<string, number>
  users: UserProfile[]
  groups: ChatGroup[]
  onSelectChat: (chatId: string, type: "direct" | "group") => void
}

export function ChatNotifications({ unreadChats, users, groups, onSelectChat }: ChatNotificationsProps) {
  // Filter to only show chats with unread messages
  const unreadChatIds = Object.keys(unreadChats).filter((id) => unreadChats[id] > 0)

  if (unreadChatIds.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No unread messages</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
          const otherUserId = userIds[0] === userIds[1] ? userIds[1] : userIds[0]
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
    </div>
  )
}
