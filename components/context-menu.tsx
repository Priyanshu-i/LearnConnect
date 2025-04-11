"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/hooks/use-auth"
import { ref, get, update, remove, child } from "firebase/database"
import { rtdb } from "@/lib/firebase"
import { Edit, Trash, UserMinus } from "lucide-react"

interface ChatContextMenuProps {
  children: React.ReactNode
  chatId: string
  chatType: "direct" | "group" | "folder"
  onDelete: () => void
}

export function ChatContextMenu({ children, chatId, chatType, onDelete }: ChatContextMenuProps) {
  const [isEditFolderOpen, setIsEditFolderOpen] = useState(false)
  const [folderName, setFolderName] = useState("")
  const [availableChats, setAvailableChats] = useState<{ id: string; name: string; selected: boolean }[]>([])
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (isEditFolderOpen && chatType === "folder") {
      fetchFolderData()
    }
  }, [isEditFolderOpen, chatId, chatType])

  const fetchFolderData = async () => {
    if (!user) return

    try {
      // Get folder data
      const folderRef = ref(rtdb, `users/${user.uid}/chatFolders/${chatId}`)
      const folderSnapshot = await get(folderRef)
      const folderData = folderSnapshot.val()

      if (folderData) {
        setFolderName(folderData.name)

        // Get all chats
        const directChatsRef = ref(rtdb, `chats`)
        const directChatsSnapshot = await get(directChatsRef)
        const directChatsData = directChatsSnapshot.val() || {}

        const groupChatsRef = ref(rtdb, `chatGroups`)
        const groupChatsSnapshot = await get(groupChatsRef)
        const groupChatsData = groupChatsSnapshot.val() || {}

        const chats: { id: string; name: string; selected: boolean }[] = []

        // Add direct chats
        Object.keys(directChatsData).forEach((chatId) => {
          if (chatId.includes(user.uid)) {
            const otherUserId = chatId.split("_").find((id) => id !== user.uid)
            if (otherUserId) {
              chats.push({
                id: chatId,
                name: `Chat with ${otherUserId}`, // In a real app, you'd fetch the user's name
                selected: folderData.chatIds?.includes(chatId) || false,
              })
            }
          }
        })

        // Add group chats
        Object.keys(groupChatsData).forEach((groupId) => {
          const group = groupChatsData[groupId]
          if (group.members?.includes(user.uid)) {
            chats.push({
              id: groupId,
              name: group.name,
              selected: folderData.chatIds?.includes(groupId) || false,
            })
          }
        })

        setAvailableChats(chats)
      }
    } catch (error) {
      console.error("Error fetching folder data:", error)
      toast({
        title: "Error",
        description: "Failed to load folder data",
        variant: "destructive",
      })
    }
  }

  const handleUpdateFolder = async () => {
    if (!user) return

    try {
      const folderRef = ref(rtdb, `users/${user.uid}/chatFolders/${chatId}`)

      await update(folderRef, {
        name: folderName,
        chatIds: availableChats.filter((chat) => chat.selected).map((chat) => chat.id),
      })

      toast({
        title: "Folder updated",
        description: "The folder has been updated successfully",
      })

      setIsEditFolderOpen(false)
    } catch (error) {
      console.error("Error updating folder:", error)
      toast({
        title: "Error",
        description: "Failed to update folder",
        variant: "destructive",
      })
    }
  }

  const handleDeleteChat = async () => {
    if (!user) return

    try {
      if (chatType === "direct") {
        // We don't actually delete the chat, just clear messages
        const messagesRef = ref(rtdb, `chats/${chatId}/messages`)
        await remove(messagesRef)
      } else if (chatType === "group") {
        // Remove user from group
        const groupRef = ref(rtdb, `chatGroups/${chatId}`)
        const groupSnapshot = await get(groupRef)
        const groupData = groupSnapshot.val()

        if (groupData) {
          const updatedMembers = (groupData.members || []).filter((id: string) => id !== user.uid)

          if (updatedMembers.length > 0) {
            await update(groupRef, {
              members: updatedMembers,
            })

            // Add system message
            const messagesRef = ref(rtdb, `groupChats/${chatId}/messages`)
            const newMessageRef = child(messagesRef, Date.now().toString())
            await update(newMessageRef, {
              content: `${user.displayName} left the group`,
              senderId: "system",
              senderName: "System",
              timestamp: Date.now(),
            })
          } else {
            // If no members left, delete the group
            await remove(groupRef)
            const groupChatRef = ref(rtdb, `groupChats/${chatId}`)
            await remove(groupChatRef)
          }
        }
      } else if (chatType === "folder") {
        // Delete folder
        const folderRef = ref(rtdb, `users/${user.uid}/chatFolders/${chatId}`)
        await remove(folderRef)
      }

      toast({
        title: chatType === "folder" ? "Folder deleted" : "Chat removed",
        description: chatType === "folder" ? "The folder has been deleted" : "The chat has been removed from your list",
      })

      onDelete()
    } catch (error) {
      console.error("Error deleting chat:", error)
      toast({
        title: "Error",
        description: "Failed to delete. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Mobile long press handling
  const handleTouchStart = () => {
    longPressTimeoutRef.current = setTimeout(() => {
      setShowContextMenu(true)
    }, 500) // 500ms long press
  }

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }
  }

  const handleTouchMove = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          className="w-full"
        >
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {chatType === "folder" && (
            <ContextMenuItem onClick={() => setIsEditFolderOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Folder
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={handleDeleteChat} className="text-red-500">
            {chatType === "direct" ? (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Delete Contact
              </>
            ) : chatType === "group" ? (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Leave Group
              </>
            ) : (
              <>
                <Trash className="h-4 w-4 mr-2" />
                Delete Folder
              </>
            )}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Edit Folder Dialog */}
      <Dialog open={isEditFolderOpen} onOpenChange={setIsEditFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>

            <div className="space-y-2">
              <Label>Chats in this folder</Label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {availableChats.map((chat) => (
                  <div key={chat.id} className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id={`chat-${chat.id}`}
                      checked={chat.selected}
                      onCheckedChange={(checked) => {
                        setAvailableChats(
                          availableChats.map((c) => (c.id === chat.id ? { ...c, selected: !!checked } : c)),
                        )
                      }}
                    />
                    <Label htmlFor={`chat-${chat.id}`} className="cursor-pointer">
                      {chat.name}
                    </Label>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFolder} disabled={!folderName.trim()}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
