"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Folder, ChevronRight } from "lucide-react"
import type { ChatFolder, ChatGroup } from "@/lib/types"
import { ChatContextMenu } from "../context-menu"

interface ChatSidebarProps {
  users: { id: string; name: string; photoURL?: string; following?: string[] }[]
  chatFolders: ChatFolder[]
  chatGroups: ChatGroup[]
  unreadChats: Record<string, number>
  selectedChat: string | null
  selectedChatType: "direct" | "group"
  activeFolderId: string | null
  currentUserId?: string
  onSelectChat: (chatId: string, type: "direct" | "group") => void
  onSelectFolder: (folderId: string) => void
  onBackToFolders: () => void
  onDeleteChat: (chatId: string, type: "direct" | "group" | "folder") => void
}

export function ChatSidebar({
  users,
  chatFolders,
  chatGroups,
  unreadChats,
  selectedChat,
  selectedChatType,
  activeFolderId,
  currentUserId,
  onSelectChat,
  onSelectFolder,
  onBackToFolders,
  onDeleteChat,
}: ChatSidebarProps) {
  return (
    // Add wrapper div with Tailwind classes for height, scrolling, and responsiveness
    <div className="h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background p-4 w-full sm:w-80 md:w-96 flex-shrink-0">
      {activeFolderId ? (
        // Show chats in the selected folder
        (() => {
          const folder = chatFolders.find((f) => f.id === activeFolderId)
          if (!folder) return null

          return (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{folder.name}</h3>
                <Button variant="ghost" size="sm" onClick={onBackToFolders}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {folder.chatIds.map((chatId) => {
                const isGroup = chatGroups.some((g) => g.id === chatId)

                if (isGroup) {
                  const group = chatGroups.find((g) => g.id === chatId)
                  if (!group) return null

                  return (
                    <ChatContextMenu
                      key={chatId}
                      chatId={chatId}
                      chatType="group"
                      onDelete={() => onDeleteChat(chatId, "group")}
                    >
                      <div
                        className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-accent ${
                          selectedChat === chatId ? "bg-accent" : ""
                        }`}
                        onClick={() => onSelectChat(chatId, "group")}
                      >
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{group.name}</p>
                            {unreadChats[chatId] && (
                              <Badge variant="default" className="ml-2">
                                {unreadChats[chatId]}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{group.members.length} members</p>
                        </div>
                      </div>
                    </ChatContextMenu>
                  )
                } else {
                  const otherUserId = chatId.split("_").find((id) => id !== currentUserId)
                  const otherUser = users.find((u) => u.id === otherUserId)

                  if (!otherUser) return null

                  return (
                    <ChatContextMenu
                      key={chatId}
                      chatId={chatId}
                      chatType="direct"
                      onDelete={() => onDeleteChat(chatId, "direct")}
                    >
                      <div
                        className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-accent ${
                          selectedChat === chatId ? "bg-accent" : ""
                        }`}
                        onClick={() => onSelectChat(chatId, "direct")}
                      >
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={otherUser.photoURL || ""} />
                          <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{otherUser.name}</p>
                            {unreadChats[chatId] && (
                              <Badge variant="default" className="ml-2">
                                {unreadChats[chatId]}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </ChatContextMenu>
                  )
                }
              })}

              {folder.chatIds.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No chats in this folder</p>
              )}
            </div>
          )
        })()
      ) : (
        // Show all chats and folders
        <div className="space-y-2">
          {/* Folders */}
          {chatFolders.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Folders</h3>
              <div className="space-y-1">
                {chatFolders.map((folder) => (
                  <ChatContextMenu
                    key={folder.id}
                    chatId={folder.id}
                    chatType="folder"
                    onDelete={() => onDeleteChat(folder.id, "folder")}
                  >
                    <div
                      className="flex items-center p-2 rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() => onSelectFolder(folder.id)}
                    >
                      <Folder className="h-5 w-5 mr-3 text-muted-foreground" />
                      <span>{folder.name}</span>
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </div>
                  </ChatContextMenu>
                ))}
              </div>
            </div>
          )}

          {/* Direct Chats */}
          <h3 className="font-medium mb-2">Direct Messages</h3>
          <div className="space-y-1">
            {users.map((u) => {
              const canMessage = u.following?.includes(currentUserId || "") || false
              const chatId = [currentUserId, u.id].sort().join("_")

              if (!canMessage) return null

              return (
                <ChatContextMenu
                  key={u.id}
                  chatId={chatId}
                  chatType="direct"
                  onDelete={() => onDeleteChat(chatId, "direct")}
                >
                  <div
                    className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-accent ${
                      selectedChat === chatId && selectedChatType === "direct" ? "bg-accent" : ""
                    }`}
                    onClick={() => onSelectChat(chatId, "direct")}
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={u.photoURL || ""} />
                      <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{u.name}</p>
                        {unreadChats[chatId] && (
                          <Badge variant="default" className="ml-2">
                            {unreadChats[chatId]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </ChatContextMenu>
              )
            })}
          </div>

          {/* Group Chats */}
          {chatGroups.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Groups</h3>
              <div className="space-y-1">
                {chatGroups.map((group) => (
                  <ChatContextMenu
                    key={group.id}
                    chatId={group.id}
                    chatType="group"
                    onDelete={() => onDeleteChat(group.id, "group")}
                  >
                    <div
                      className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-accent ${
                        selectedChat === group.id && selectedChatType === "group" ? "bg-accent" : ""
                      }`}
                      onClick={() => onSelectChat(group.id, "group")}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{group.name}</p>
                          {unreadChats[group.id] && (
                            <Badge variant="default" className="ml-2">
                            {unreadChats[group.id]}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{group.members.length} members</p>
                      </div>
                    </div>
                  </ChatContextMenu>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}