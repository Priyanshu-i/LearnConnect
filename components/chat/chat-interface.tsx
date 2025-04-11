"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Pin, Reply, X, User, MessageSquare, ChevronLeft } from "lucide-react"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Search, Trash, Download, Folder, Users, ChevronRight, Info } from "lucide-react"
import { ref, onValue, push, set, update, remove, query, orderByChild, get } from "firebase/database"
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc } from "firebase/firestore"
import { rtdb, db } from "@/lib/firebase"
import type { ChatMessage, ChatFolder, ChatGroup, UserProfile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { MessageActions } from "./message-actions"
import { ChatNotifications } from "./chat-notifications"
import { useRouter } from "next/navigation"
import { UserProfileEditor } from "./use-profile-editor"
import { GroupSettingsModal } from "./group-settings-modal"
import { DateSeparator } from "./date-separator"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"

export function ChatInterface() {
  const [activeTab, setActiveTab] = useState<string>("chats")
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [selectedChatType, setSelectedChatType] = useState<"direct" | "group">("direct")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<string[]>([])
  const [chatFolders, setChatFolders] = useState<ChatFolder[]>([])
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null)
  const [newGroupName, setNewGroupName] = useState("")
  const [newFolderName, setNewFolderName] = useState("")
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([])
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [unreadChats, setUnreadChats] = useState<Record<string, number>>({})
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [userSearch, setUserSearch] = useState("")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isEditingFolder, setIsEditingFolder] = useState(false)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState("")
  const [editingFolderContacts, setEditingFolderContacts] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const isMobile = useMobile()
  const router = useRouter()

  // Fetch user profile
  useEffect(() => {
    if (!user) {
      router.push("/")
      return
    }

    async function fetchUserProfile() {
      try {
        if (!user) return;
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile)
        } else {
          // Create user profile if it doesn't exist
          const newUserProfile: UserProfile = {
            
            id: user.uid,
            displayName: user.displayName || "Anonymous User",
            email: user.email || "",
            photoURL: user.photoURL || "",
            createdAt: Date.now(),
          }

          await setDoc(userDocRef, newUserProfile)
          setUserProfile(newUserProfile)
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
      }
    }

    fetchUserProfile()
  }, [user, router])

  // Fetch all users
  useEffect(() => {
    if (!user) {
      router.push("/")
      return
    }

    async function fetchUsers() {
      try {
        const usersCollection = collection(db, "users")
        const usersSnapshot = await getDocs(usersCollection)
        const usersList: UserProfile[] = []

        usersSnapshot.forEach((doc) => {
          const userData = doc.data() as UserProfile
          if (!user) return;
          if (doc.id !== user.uid) {
            usersList.push({
              id: doc.id,
              displayName: userData.displayName || "Anonymous User",
              email: userData.email || "",
              photoURL: userData.photoURL || "",
              createdAt: userData.createdAt || Date.now(),
              following: userData.following || [],
              followers: userData.followers || [],
            })
          }
        })

        setUsers(usersList)
        setFilteredUsers(usersList)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }

    // Fetch chat folders
    async function fetchChatFolders() {
      try {
        if (!user) return;
        const foldersRef = ref(rtdb, `users/${user.uid}/chatFolders`)
        onValue(foldersRef, (snapshot) => {
          const foldersData = snapshot.val()
          if (foldersData) {
            const foldersList: ChatFolder[] = Object.keys(foldersData).map((key) => ({
              id: key,
              name: foldersData[key].name,
              chatIds: foldersData[key].chatIds || [],
            }))
            setChatFolders(foldersList)
          } else {
            setChatFolders([])
          }
        })
      } catch (error) {
        console.error("Error fetching chat folders:", error)
      }
    }

    // Fetch chat groups
    async function fetchChatGroups() {
      try {
        const groupsRef = ref(rtdb, `chatGroups`)
        onValue(groupsRef, (snapshot) => {
          const groupsData = snapshot.val()
          if (groupsData) {
            const groupsList: ChatGroup[] = []

            Object.keys(groupsData).forEach((key) => {
              const group = groupsData[key]
              // Only include groups where the current user is a member
              if (!user) return;
              if (group.members && group.members.includes(user.uid)) {
                groupsList.push({
                  id: key,
                  name: group.name,
                  description: group.description || "",
                  members: group.members || [],
                  createdBy: group.createdBy,
                  createdAt: group.createdAt,
                  blockedMembers: group.blockedMembers || [],
                })
              }
            })

            setChatGroups(groupsList)
          } else {
            setChatGroups([])
          }
        })
      } catch (error) {
        console.error("Error fetching chat groups:", error)
      }
    }

    // Fetch unread messages
    async function fetchUnreadMessages() {
      try {
        if (!user) return;
        const unreadRef = ref(rtdb, `users/${user.uid}/unreadMessages`)
        onValue(unreadRef, (snapshot) => {
          const unreadData = snapshot.val()
          if (unreadData) {
            setUnreadChats(unreadData)
          } else {
            setUnreadChats({})
          }
        })
      } catch (error) {
        console.error("Error fetching unread messages:", error)
      }
    }

    fetchUsers()
    fetchChatFolders()
    fetchChatGroups()
    fetchUnreadMessages()
  }, [user, router])

  // Filter users based on search
  useEffect(() => {
    if (userSearch.trim() === "") {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
          (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())),
      )
      setFilteredUsers(filtered)
    }
  }, [userSearch, users])

  // Listen for messages in the selected chat
  useEffect(() => {
    if (!user || !selectedChat) return

    let messagesRef
    if (selectedChatType === "direct") {
      messagesRef = ref(rtdb, `chats/${selectedChat}/messages`)
    } else {
      messagesRef = ref(rtdb, `groupChats/${selectedChat}/messages`)

      // Set selected group
      const group = chatGroups.find((g) => g.id === selectedChat)
      if (group) {
        setSelectedGroup(group)
      }
    }

    const messagesQuery = query(messagesRef, orderByChild("timestamp"))

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const messagesData = snapshot.val()
      const messagesList: ChatMessage[] = []

      if (messagesData) {
        Object.keys(messagesData).forEach((key) => {
          messagesList.push({
            id: key,
            ...messagesData[key],
          })
        })

        // Sort messages by timestamp
        messagesList.sort((a, b) => a.timestamp - b.timestamp)
        setMessages(messagesList)

        // Mark messages as read
        if (selectedChatType === "direct") {
          markChatAsRead(selectedChat)
        } else {
          markGroupChatAsRead(selectedChat)
        }
      } else {
        setMessages([])
      }
    })

    // Fetch pinned messages
    const pinnedRef = ref(rtdb, `users/${user.uid}/pinnedMessages/${selectedChat}`)
    const pinnedUnsubscribe = onValue(pinnedRef, (snapshot) => {
      const pinnedData = snapshot.val()
      if (pinnedData) {
        setPinnedMessages(pinnedData)
      } else {
        setPinnedMessages([])
      }
    })

    return () => {
      unsubscribe()
      pinnedUnsubscribe()
    }
  }, [selectedChat, selectedChatType, user, chatGroups])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const markChatAsRead = (chatId: string) => {
    if (!user) return

    const unreadRef = ref(rtdb, `users/${user.uid}/unreadMessages/${chatId}`)
    set(unreadRef, null)
  }

  const markGroupChatAsRead = (groupId: string) => {
    if (!user) return

    const unreadRef = ref(rtdb, `users/${user.uid}/unreadGroupMessages/${groupId}`)
    set(unreadRef, null)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !selectedChat || !newMessage.trim() || !userProfile) return

    // Check if user is blocked in group
    if (selectedChatType === "group" && selectedGroup) {
      if (selectedGroup.blockedMembers && selectedGroup.blockedMembers.includes(user.uid)) {
        toast({
          title: "Cannot send message",
          description: "You have been blocked from sending messages in this group",
          variant: "destructive",
        })
        return
      }
    }

    // Check if users follow each other for direct messages
    if (selectedChatType === "direct") {
      const otherUserId = selectedChat.split("_").find((id) => id !== user.uid)
      if (otherUserId) {
        const otherUserDoc = await getDoc(doc(db, "users", otherUserId))
        const currentUserDoc = await getDoc(doc(db, "users", user.uid))

        if (otherUserDoc.exists() && currentUserDoc.exists()) {
          const otherUserData = otherUserDoc.data() as UserProfile
          const currentUserData = currentUserDoc.data() as UserProfile

          const mutualFollow =
            (otherUserData.followers?.includes(user.uid) || false) &&
            (currentUserData.followers?.includes(otherUserId) || false)

          if (!mutualFollow) {
            toast({
              title: "Cannot send message",
              description: "You can only message users who follow you and whom you follow",
              variant: "destructive",
            })
            return
          }
        }
      }
    }

    try {
      let messagesRef
      if (selectedChatType === "direct") {
        messagesRef = ref(rtdb, `chats/${selectedChat}/messages`)
      } else {
        messagesRef = ref(rtdb, `groupChats/${selectedChat}/messages`)
      }

      const newMessageRef = push(messagesRef)

      const messageData: Omit<ChatMessage, "id"> = {
        content: newMessage,
        senderId: user.uid,
        senderName: userProfile.displayName,
        senderPhotoURL: userProfile.photoURL || undefined,
        timestamp: Date.now(),
        reactions: {},
      }

      // Add reply data if replying to a message
      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          content: replyingTo.content,
          senderId: replyingTo.senderId,
          senderName: replyingTo.senderName,
        }
      }

      await set(newMessageRef, messageData)

      // Update last message in chat room
      if (selectedChatType === "direct") {
        const chatRoomRef = ref(rtdb, `chats/${selectedChat}`)
        await update(chatRoomRef, {
          lastMessage: newMessage,
          lastMessageTimestamp: Date.now(),
        })

        // Add unread message notification for the other user
        const otherUserId = selectedChat.split("_").find((id) => id !== user.uid)
        if (otherUserId) {
          const unreadRef = ref(rtdb, `users/${otherUserId}/unreadMessages/${selectedChat}`)
          const unreadSnapshot = await get(unreadRef)
          const currentUnread = unreadSnapshot.val() || 0
          await set(unreadRef, currentUnread + 1)
        }
      } else {
        // Update group chat
        const groupChatRef = ref(rtdb, `groupChats/${selectedChat}`)
        await update(groupChatRef, {
          lastMessage: newMessage,
          lastMessageTimestamp: Date.now(),
        })

        // Add unread message notification for all other group members
        const groupRef = ref(rtdb, `chatGroups/${selectedChat}`)
        const groupSnapshot = await get(groupRef)
        const groupData = groupSnapshot.val()

        if (groupData && groupData.members) {
          for (const memberId of groupData.members) {
            if (memberId !== user.uid) {
              const unreadRef = ref(rtdb, `users/${memberId}/unreadGroupMessages/${selectedChat}`)
              const unreadSnapshot = await get(unreadRef)
              const currentUnread = unreadSnapshot.val() || 0
              await set(unreadRef, currentUnread + 1)
            }
          }
        }
      }

      // Add to user activity
      const activityRef = collection(db, "users", user.uid, "activity")
      await addDoc(activityRef, {
        type: "message",
        targetId: selectedChat,
        chatType: selectedChatType,
        content: newMessage,
        timestamp: Date.now(),
      })

      setNewMessage("")
      setReplyingTo(null)
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateProfile = async (updatedProfile: Partial<UserProfile>) => {
    if (!user || !userProfile) return

    try {
      const userDocRef = doc(db, "users", user.uid)

      // Update Firestore document
      await updateDoc(userDocRef, updatedProfile)

      // Update local state
      setUserProfile({
        ...userProfile,
        ...updatedProfile,
      })

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })

      setIsEditingProfile(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyingTo(message)
    setSelectedMessages([])
  }

  const handlePinMessage = async (messageId: string) => {
    if (!user || !selectedChat) return

    try {
      const pinnedRef = ref(rtdb, `users/${user.uid}/pinnedMessages/${selectedChat}`)
      const pinnedSnapshot = await get(pinnedRef)
      const currentPinned = pinnedSnapshot.val() || []

      if (currentPinned.includes(messageId)) {
        // Unpin
        await set(
          pinnedRef,
          currentPinned.filter((id: string) => id !== messageId),
        )
        toast({
          title: "Message unpinned",
          description: "The message has been removed from your pinned messages.",
        })
      } else {
        // Pin
        await set(pinnedRef, [...currentPinned, messageId])
        toast({
          title: "Message pinned",
          description: "The message has been added to your pinned messages.",
        })
      }
    } catch (error) {
      console.error("Error pinning message:", error)
      toast({
        title: "Error",
        description: "Failed to pin message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: "Copied to clipboard",
      description: "Message content has been copied to your clipboard.",
    })
    setSelectedMessages([])
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!user || !selectedChat) return

    try {
      let messageRef
      if (selectedChatType === "direct") {
        messageRef = ref(rtdb, `chats/${selectedChat}/messages/${messageId}`)
      } else {
        messageRef = ref(rtdb, `groupChats/${selectedChat}/messages/${messageId}`)
      }

      await remove(messageRef)

      toast({
        title: "Message deleted",
        description: "The message has been deleted.",
      })
      setSelectedMessages([])
    } catch (error) {
      console.error("Error deleting message:", error)
      toast({
        title: "Error",
        description: "Failed to delete message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddReaction = async (messageId: string, reaction: string) => {
    if (!user || !selectedChat) return

    try {
      let reactionsRef
      if (selectedChatType === "direct") {
        reactionsRef = ref(rtdb, `chats/${selectedChat}/messages/${messageId}/reactions/${user.uid}`)
      } else {
        reactionsRef = ref(rtdb, `groupChats/${selectedChat}/messages/${messageId}/reactions/${user.uid}`)
      }

      await set(reactionsRef, reaction)

      toast({
        title: "Reaction added",
        description: `You reacted with ${reaction}`,
      })
    } catch (error) {
      console.error("Error adding reaction:", error)
      toast({
        title: "Error",
        description: "Failed to add reaction. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveReaction = async (messageId: string) => {
    if (!user || !selectedChat) return

    try {
      let reactionsRef
      if (selectedChatType === "direct") {
        reactionsRef = ref(rtdb, `chats/${selectedChat}/messages/${messageId}/reactions/${user.uid}`)
      } else {
        reactionsRef = ref(rtdb, `groupChats/${selectedChat}/messages/${messageId}/reactions/${user.uid}`)
      }

      await remove(reactionsRef)

      toast({
        title: "Reaction removed",
        description: "Your reaction has been removed.",
      })
    } catch (error) {
      console.error("Error removing reaction:", error)
      toast({
        title: "Error",
        description: "Failed to remove reaction. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleClearChat = async () => {
    if (!user || !selectedChat) return

    try {
      let chatMessagesRef
      if (selectedChatType === "direct") {
        chatMessagesRef = ref(rtdb, `chats/${selectedChat}/messages`)
      } else {
        chatMessagesRef = ref(rtdb, `groupChats/${selectedChat}/messages`)
      }

      await set(chatMessagesRef, null)

      toast({
        title: "Chat cleared",
        description: "All messages have been deleted from this chat.",
      })
    } catch (error) {
      console.error("Error clearing chat:", error)
      toast({
        title: "Error",
        description: "Failed to clear chat. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExportChat = () => {
    if (!messages.length) return

    const chatData = {
      chatId: selectedChat,
      chatType: selectedChatType,
      messages: messages,
      exportedAt: new Date().toISOString(),
    }

    const dataStr = JSON.stringify(chatData, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportFileDefaultName = `chat-export-${selectedChat}-${new Date().toISOString()}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()

    toast({
      title: "Chat exported",
      description: "The chat has been exported as a JSON file.",
    })
  }

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim() || selectedGroupMembers.length === 0 || !userProfile) return

    try {
      // Add current user to members
      const allMembers = [...selectedGroupMembers, user.uid]

      // Create new group in Firebase
      const groupsRef = ref(rtdb, "chatGroups")
      const newGroupRef = push(groupsRef)

      await set(newGroupRef, {
        name: newGroupName,
        description: "",
        members: allMembers,
        createdBy: user.uid,
        createdAt: Date.now(),
        blockedMembers: [],
      })

      // Create group chat room
      const groupChatRef = ref(rtdb, `groupChats/${newGroupRef.key}`)
      await set(groupChatRef, {
        groupId: newGroupRef.key,
        lastMessageTimestamp: Date.now(),
      })

      // Add a welcome message
      const messagesRef = ref(rtdb, `groupChats/${newGroupRef.key}/messages`)
      const welcomeMessageRef = push(messagesRef)
      await set(welcomeMessageRef, {
        content: `${userProfile.displayName} created the group "${newGroupName}"`,
        senderId: "system",
        senderName: "System",
        timestamp: Date.now(),
      })

      toast({
        title: "Group created",
        description: `The group "${newGroupName}" has been created.`,
      })

      // Reset form
      setNewGroupName("")
      setSelectedGroupMembers([])
      setIsCreatingGroup(false)

      // Select the new group
      if (newGroupRef.key) {
        setSelectedChat(newGroupRef.key)
        setSelectedChatType("group")
      }
    } catch (error) {
      console.error("Error creating group:", error)
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return

    try {
      const foldersRef = ref(rtdb, `users/${user.uid}/chatFolders`)
      const newFolderRef = push(foldersRef)

      await set(newFolderRef, {
        name: newFolderName,
        chatIds: [],
      })

      toast({
        title: "Folder created",
        description: `The folder "${newFolderName}" has been created.`,
      })

      setNewFolderName("")
      setIsCreatingFolder(false)
    } catch (error) {
      console.error("Error creating folder:", error)
      toast({
        title: "Error",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddChatToFolder = async (chatId: string, folderId: string) => {
    if (!user) return

    try {
      const folderRef = ref(rtdb, `users/${user.uid}/chatFolders/${folderId}`)
      const folderSnapshot = await get(folderRef)
      const folderData = folderSnapshot.val()

      const chatIds = folderData.chatIds || []
      if (!chatIds.includes(chatId)) {
        await update(folderRef, {
          chatIds: [...chatIds, chatId],
        })

        toast({
          title: "Chat added to folder",
          description: "The chat has been added to the selected folder.",
        })
      }
    } catch (error) {
      console.error("Error adding chat to folder:", error)
      toast({
        title: "Error",
        description: "Failed to add chat to folder. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveChatFromFolder = async (chatId: string, folderId: string) => {
    if (!user) return

    try {
      const folderRef = ref(rtdb, `users/${user.uid}/chatFolders/${folderId}`)
      const folderSnapshot = await get(folderRef)
      const folderData = folderSnapshot.val()

      const chatIds = folderData.chatIds || []
      await update(folderRef, {
        chatIds: chatIds.filter((id: string) => id !== chatId),
      })

      toast({
        title: "Chat removed from folder",
        description: "The chat has been removed from the folder.",
      })
    } catch (error) {
      console.error("Error removing chat from folder:", error)
      toast({
        title: "Error",
        description: "Failed to remove chat from folder. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!user) return

    try {
      const folderRef = ref(rtdb, `users/${user.uid}/chatFolders/${folderId}`)
      await remove(folderRef)

      toast({
        title: "Folder deleted",
        description: "The folder has been deleted.",
      })

      if (activeFolderId === folderId) {
        setActiveFolderId(null)
      }
    } catch (error) {
      console.error("Error deleting folder:", error)
      toast({
        title: "Error",
        description: "Failed to delete folder. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditFolder = (folder: ChatFolder) => {
    setEditingFolderId(folder.id)
    setEditingFolderName(folder.name)
    setEditingFolderContacts(folder.chatIds || [])
    setIsEditingFolder(true)
  }

  const handleSaveEditedFolder = async () => {
    if (!user || !editingFolderId || !editingFolderName.trim()) return

    try {
      const folderRef = ref(rtdb, `users/${user.uid}/chatFolders/${editingFolderId}`)
      await update(folderRef, {
        name: editingFolderName,
        chatIds: editingFolderContacts,
      })

      toast({
        title: "Folder updated",
        description: "The folder has been updated successfully.",
      })

      setIsEditingFolder(false)
      setEditingFolderId(null)
      setEditingFolderName("")
      setEditingFolderContacts([])
    } catch (error) {
      console.error("Error updating folder:", error)
      toast({
        title: "Error",
        description: "Failed to update folder. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSelectChat = (chatId: string, type: "direct" | "group") => {
    setSelectedChat(chatId)
    setSelectedChatType(type)
    setReplyingTo(null)
    setSelectedMessages([])
    setIsSearching(false)
    setSearchQuery("")

    // Mark as read
    if (type === "direct") {
      markChatAsRead(chatId)
    } else {
      markGroupChatAsRead(chatId)
    }
  }

  const handleToggleSelectMessage = (messageId: string) => {
    if (selectedMessages.includes(messageId)) {
      setSelectedMessages(selectedMessages.filter((id) => id !== messageId))
    } else {
      setSelectedMessages([...selectedMessages, messageId])
    }
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  const handleSearchMessages = () => {
    if (!searchQuery.trim()) {
      setIsSearching(false)
      return
    }

    setIsSearching(true)
  }

  const handleViewUserProfile = (userId: string) => {
    router.push(`/profile/${userId}`)
  }

  const handleDeleteChat = async (chatId: string, type: "direct" | "group") => {
    if (!user) return

    try {
      if (type === "direct") {
        // Clear direct chat messages
        const chatMessagesRef = ref(rtdb, `chats/${chatId}/messages`)
        await set(chatMessagesRef, null)

        // Remove from unread messages
        const unreadRef = ref(rtdb, `users/${user.uid}/unreadMessages/${chatId}`)
        await remove(unreadRef)

        // Remove from all folders
        for (const folder of chatFolders) {
          if (folder.chatIds.includes(chatId)) {
            await handleRemoveChatFromFolder(chatId, folder.id)
          }
        }

        toast({
          title: "Chat deleted",
          description: "The chat has been deleted.",
        })

        if (selectedChat === chatId) {
          setSelectedChat(null)
        }
      } else if (type === "group") {
        // Leave group
        const group = chatGroups.find((g) => g.id === chatId)
        if (!group) return

        // If user is the creator and the only member, delete the group
        if (group.createdBy === user.uid && group.members.length === 1) {
          const groupRef = ref(rtdb, `chatGroups/${chatId}`)
          await remove(groupRef)

          const groupChatRef = ref(rtdb, `groupChats/${chatId}`)
          await remove(groupChatRef)

          toast({
            title: "Group deleted",
            description: "The group has been deleted as you were the only member.",
          })
        } else {
          // Otherwise, just remove the user from the group
          const groupRef = ref(rtdb, `chatGroups/${chatId}`)
          const updatedMembers = group.members.filter((id) => id !== user.uid)
          await update(groupRef, {
            members: updatedMembers,
          })

          // Add system message about user leaving
          const messagesRef = ref(rtdb, `groupChats/${chatId}/messages`)
          const newMessageRef = push(messagesRef)
          await set(newMessageRef, {
            content: `${userProfile?.displayName || "A user"} left the group`,
            senderId: "system",
            senderName: "System",
            timestamp: Date.now(),
          })

          toast({
            title: "Left group",
            description: "You have left the group.",
          })
        }

        // Remove from unread messages
        const unreadRef = ref(rtdb, `users/${user.uid}/unreadGroupMessages/${chatId}`)
        await remove(unreadRef)

        if (selectedChat === chatId) {
          setSelectedChat(null)
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error)
      toast({
        title: "Error",
        description: "Failed to delete chat. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveUserFromGroup = async (groupId: string, userId: string) => {
    if (!user) return

    try {
      const group = chatGroups.find((g) => g.id === groupId)
      if (!group) return

      // Check if current user is admin
      if (group.createdBy !== user.uid) {
        toast({
          title: "Permission denied",
          description: "Only the group creator can remove members.",
          variant: "destructive",
        })
        return
      }

      // Remove user from group
      const groupRef = ref(rtdb, `chatGroups/${groupId}`)
      const updatedMembers = group.members.filter((id) => id !== userId)
      await update(groupRef, {
        members: updatedMembers,
      })

      // Add system message about user being removed
      const removedUser = users.find((u) => u.id === userId)
      const messagesRef = ref(rtdb, `groupChats/${groupId}/messages`)
      const newMessageRef = push(messagesRef)
      await set(newMessageRef, {
        content: `${removedUser?.displayName || "A user"} was removed from the group`,
        senderId: "system",
        senderName: "System",
        timestamp: Date.now(),
      })

      toast({
        title: "User removed",
        description: "The user has been removed from the group.",
      })
    } catch (error) {
      console.error("Error removing user from group:", error)
      toast({
        title: "Error",
        description: "Failed to remove user from group. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleViewPostFromReply = (postId: string) => {
    router.push(`/post/${postId}`)
  }

  const getFilteredMessages = () => {
    if (!isSearching || !searchQuery.trim()) {
      return messages
    }

    return messages.filter((message) => message.content.toLowerCase().includes(searchQuery.toLowerCase()))
  }

  const getTotalUnreadCount = () => {
    let count = 0

    // Count direct message unread
    Object.values(unreadChats).forEach((c) => {
      count += c
    })

    return count
  }

  // Group messages by date
  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [date: string]: ChatMessage[] } = {}

    messages.forEach((message) => {
      const date = new Date(message.timestamp).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })

    return groups
  }

  const renderChatList = () => {
    if (activeTab === "chats") {
      if (activeFolderId) {
        // Show chats in the selected folder
        const folder = chatFolders.find((f) => f.id === activeFolderId)
        if (!folder) return null

        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{folder.name}</h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleEditFolder(folder)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setActiveFolderId(null)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {folder.chatIds.map((chatId) => {
              // Find if this is a direct chat or group chat
              const isGroup = chatGroups.some((g) => g.id === chatId)

              if (isGroup) {
                const group = chatGroups.find((g) => g.id === chatId)
                if (!group) return null

                return (
                  <ContextMenu key={chatId}>
                    <ContextMenuTrigger>
                      <div
                        className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-accent ${
                          selectedChat === chatId ? "bg-accent" : ""
                        }`}
                        onClick={() => handleSelectChat(chatId, "group")}
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
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleRemoveChatFromFolder(chatId, folder.id)}>
                        Remove from folder
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleDeleteChat(chatId, "group")}>Leave group</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              } else {
                // This is a direct chat
                const otherUserId = chatId.split("_").find((id) => id !== user?.uid)
                const otherUser = users.find((u) => u.id === otherUserId)

                if (!otherUser) return null

                return (
                  <ContextMenu key={chatId}>
                    <ContextMenuTrigger>
                      <div
                        className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-accent ${
                          selectedChat === chatId ? "bg-accent" : ""
                        }`}
                        onClick={() => handleSelectChat(chatId, "direct")}
                      >
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={otherUser.photoURL || ""} />
                          <AvatarFallback>{otherUser.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{otherUser.displayName}</p>
                            {unreadChats[chatId] && (
                              <Badge variant="default" className="ml-2">
                                {unreadChats[chatId]}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleRemoveChatFromFolder(chatId, folder.id)}>
                        Remove from folder
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleDeleteChat(chatId, "direct")}>Delete chat</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              }
            })}

            {folder.chatIds.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No chats in this folder</p>
            )}
          </div>
        )
      }

      // Show all chats and folders
      return (
        <div className="space-y-2">
          {/* Folders */}
          {chatFolders.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Folders</h3>
              <div className="space-y-1">
                {chatFolders.map((folder) => (
                  <ContextMenu key={folder.id}>
                    <ContextMenuTrigger>
                      <div
                        className="flex items-center p-2 rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() => setActiveFolderId(folder.id)}
                      >
                        <Folder className="h-5 w-5 mr-3 text-muted-foreground" />
                        <span>{folder.name}</span>
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditFolder(folder)}>Edit folder</ContextMenuItem>
                      <ContextMenuItem onClick={() => handleDeleteFolder(folder.id)}>Delete folder</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            </div>
          )}

          {/* Direct Chats */}
          <h3 className="font-medium mb-2">Direct Messages</h3>
          <div className="space-y-1">
            {filteredUsers.map((u) => {
              // Check if users follow each other (for privacy)
              const mutualFollow =
                (u.followers?.includes(user?.uid || "") || false) && (userProfile?.followers?.includes(u.id) || false)

              // Create a unique chat ID (sorted user IDs to ensure consistency)
              const chatId = [user?.uid, u.id].sort().join("_")

              // If they don't follow each other, don't show the chat
              if (!mutualFollow) return null

              return (
                <ContextMenu key={u.id}>
                  <ContextMenuTrigger>
                    <div
                      className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-accent ${
                        selectedChat === chatId && selectedChatType === "direct" ? "bg-accent" : ""
                      }`}
                      onClick={() => handleSelectChat(chatId, "direct")}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={u.photoURL || ""} />
                        <AvatarFallback>{u.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{u.displayName}</p>
                          {unreadChats[chatId] && (
                            <Badge variant="default" className="ml-2">
                              {unreadChats[chatId]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleViewUserProfile(u.id)}>View profile</ContextMenuItem>
                    {chatFolders.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <ContextMenuItem>Add to folder</ContextMenuItem>
                        </PopoverTrigger>
                        <PopoverContent className="w-56">
                          <div className="space-y-1">
                            {chatFolders.map((folder) => (
                              <Button
                                key={folder.id}
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => handleAddChatToFolder(chatId, folder.id)}
                              >
                                {folder.name}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    <ContextMenuItem onClick={() => handleDeleteChat(chatId, "direct")}>Delete chat</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </div>

          {/* Group Chats */}
          {chatGroups.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Groups</h3>
              <div className="space-y-1">
                {chatGroups.map((group) => (
                  <ContextMenu key={group.id}>
                    <ContextMenuTrigger>
                      <div
                        className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-accent ${
                          selectedChat === group.id && selectedChatType === "group" ? "bg-accent" : ""
                        }`}
                        onClick={() => handleSelectChat(group.id, "group")}
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
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => setIsGroupSettingsOpen(true)}>Group settings</ContextMenuItem>
                      {chatFolders.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <ContextMenuItem>Add to folder</ContextMenuItem>
                          </PopoverTrigger>
                          <PopoverContent className="w-56">
                            <div className="space-y-1">
                              {chatFolders.map((folder) => (
                                <Button
                                  key={folder.id}
                                  variant="ghost"
                                  className="w-full justify-start"
                                  onClick={() => handleAddChatToFolder(group.id, folder.id)}
                                >
                                  {folder.name}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      <ContextMenuItem onClick={() => handleDeleteChat(group.id, "group")}>Leave group</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    } else if (activeTab === "notifications") {
      return (
        <ChatNotifications
          unreadChats={unreadChats}
          users={users}
          groups={chatGroups}
          onSelectChat={handleSelectChat}
        />
      )
    }

    return null
  }

  const renderChatHeader = () => {
    if (!selectedChat) return null

    if (selectedChatType === "direct") {
      const otherUserId = selectedChat.split("_").find((id) => id !== user?.uid)
      const otherUser = users.find((u) => u.id === otherUserId)

      if (!otherUser) return null

      return (
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center cursor-pointer" onClick={() => handleViewUserProfile(otherUser.id)}>
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={otherUser.photoURL || ""} />
              <AvatarFallback>{otherUser.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{otherUser.displayName}</h3>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setIsSearching(!isSearching)}>
                    <Search className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search in chat</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-1">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => handleClearChat()}>
                    <Trash className="h-4 w-4 mr-2" />
                    Clear chat
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => handleExportChat()}>
                    <Download className="h-4 w-4 mr-2" />
                    Export chat
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleDeleteChat(selectedChat, "direct")}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete chat
                  </Button>

                  {chatFolders.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start">
                          <Folder className="h-4 w-4 mr-2" />
                          Add to folder
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56" align="end">
                        <div className="space-y-1">
                          {chatFolders.map((folder) => (
                            <Button
                              key={folder.id}
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => handleAddChatToFolder(selectedChat, folder.id)}
                            >
                              {folder.name}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )
    } else {
      const group = chatGroups.find((g) => g.id === selectedChat)
      if (!group) return null

      return (
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center cursor-pointer" onClick={() => setIsGroupSettingsOpen(true)}>
            <Avatar className="h-10 w-10 mr-3">
              <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{group.name}</h3>
              <p className="text-xs text-muted-foreground">{group.members.length} members</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setIsSearching(!isSearching)}>
                    <Search className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search in chat</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setIsGroupSettingsOpen(true)}>
                    <Info className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Group info</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-1">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => handleClearChat()}>
                    <Trash className="h-4 w-4 mr-2" />
                    Clear chat
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => handleExportChat()}>
                    <Download className="h-4 w-4 mr-2" />
                    Export chat
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleDeleteChat(selectedChat, "group")}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Leave group
                  </Button>

                  {chatFolders.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start">
                          <Folder className="h-4 w-4 mr-2" />
                          Add to folder
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56" align="end">
                        <div className="space-y-1">
                          {chatFolders.map((folder) => (
                            <Button
                              key={folder.id}
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => handleAddChatToFolder(selectedChat, folder.id)}
                            >
                              {folder.name}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )
    }
  }

  const renderMessage = (message: ChatMessage) => {
    const isCurrentUser = message.senderId === user?.uid
    const isPinned = pinnedMessages.includes(message.id)
    const isSelected = selectedMessages.includes(message.id)

    // System messages
    if (message.senderId === "system") {
      return (
        <div key={message.id} className="text-center my-2">
          <span className="text-xs bg-accent px-2 py-1 rounded-full text-muted-foreground">{message.content}</span>
        </div>
      )
    }

    // Count reactions
    const reactionCounts: Record<string, number> = {}
    if (message.reactions) {
      Object.values(message.reactions).forEach((reaction) => {
        reactionCounts[reaction] = (reactionCounts[reaction] || 0) + 1
      })
    }

    // Get current user's reaction
    const userReaction = message.reactions?.[user?.uid || ""]

    return (
      <div
        key={message.id}
        className={`group relative p-1 ${isSelected ? "bg-accent/50 rounded-lg" : ""}`}
        onClick={() => selectedMessages.length > 0 && handleToggleSelectMessage(message.id)}
      >
        <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
          <div className={`flex max-w-[80%] ${isCurrentUser ? "flex-row-reverse" : ""}`}>
            {!isCurrentUser && (
              <div
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handleViewUserProfile(message.senderId)
                }}
              >
                <Avatar className="h-8 w-8 mx-2 mt-1">
                  <AvatarImage src={message.senderPhotoURL || ""} />
                  <AvatarFallback>{message.senderName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              </div>
            )}

            <div>
              {/* Reply reference */}
              {message.replyTo && (
                <div
                  className={`text-xs border-l-2 pl-2 mb-1 mx-2 ${
                    isCurrentUser ? "text-right border-r-2 border-l-0 pr-2 pl-0" : ""
                  }`}
                >
                  <p className="font-medium">{message.replyTo.senderName}</p>
                  <p className="text-muted-foreground truncate">{message.replyTo.content}</p>
                </div>
              )}

              {/* Post reply reference */}
              {message.postReply && (
                <div
                  className={`text-xs border-l-2 pl-2 mb-1 mx-2 cursor-pointer hover:bg-accent/50 ${
                    isCurrentUser ? "text-right border-r-2 border-l-0 pr-2 pl-0" : ""
                  }`}
                  onClick={() => handleViewPostFromReply(message.postReply!.postId)}
                >
                  <p className="font-medium">Reply to post</p>
                  <p className="text-muted-foreground truncate">{message.postReply.postTitle}</p>
                </div>
              )}

              <div
                className={`relative p-3 rounded-lg ${
                  isCurrentUser ? "bg-purple-500 text-white" : "bg-accent"
                } ${isPinned ? "border-2 border-yellow-500" : ""}`}
              >
                {!isCurrentUser && (
                  <p
                    className="text-xs font-medium mb-1 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewUserProfile(message.senderId)
                    }}
                  >
                    {message.senderName}
                  </p>
                )}
                <p>{message.content}</p>
                <p className="text-xs opacity-70 mt-1 text-right">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>

                {/* Reactions */}
                {Object.keys(reactionCounts).length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                    {Object.entries(reactionCounts).map(([reaction, count]) => (
                      <Badge
                        key={reaction}
                        variant={userReaction === reaction ? "default" : "outline"}
                        className="text-xs py-0 h-5"
                      >
                        {reaction} {count}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Pin indicator */}
                {isPinned && (
                  <div className="absolute -top-2 -right-2">
                    <Pin className="h-4 w-4 text-yellow-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message actions */}
        {!isSelected && (
          <div
            className={`absolute top-0 ${isCurrentUser ? "left-0" : "right-0"} opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            <MessageActions
              message={message}
              isPinned={isPinned}
              onReply={() => handleReplyToMessage(message)}
              onPin={() => handlePinMessage(message.id)}
              onCopy={() => handleCopyMessage(message.content)}
              onDelete={() => handleDeleteMessage(message.id)}
              onReact={(reaction) => handleAddReaction(message.id, reaction)}
              onRemoveReaction={() => handleRemoveReaction(message.id)}
              userReaction={userReaction}
            />
          </div>
        )}
      </div>
    )
  }

  // Render messages with date separators
  const renderMessagesWithDateSeparators = () => {
    const filteredMessages = getFilteredMessages()
    const messagesByDate = groupMessagesByDate(filteredMessages)

    return Object.entries(messagesByDate).map(([dateStr, messages]) => {
      const date = new Date(dateStr)

      return (
        <div key={dateStr}>
          <DateSeparator date={date} />
          {messages.map((message) => renderMessage(message))}
        </div>
      )
    })
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {selectedChat ? (
          // Chat view
          <div className="flex flex-col h-full">
            <div className="flex items-center p-2 border-b">
              <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              {renderChatHeader()}
            </div>

            {isSearching && (
              <div className="p-2 border-b">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search in chat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSearchMessages}>Search</Button>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 p-4">
              {renderMessagesWithDateSeparators()}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {replyingTo && (
              <div className="p-2 border-t bg-accent/50 flex items-center justify-between">
                <div className="flex items-center">
                  <Reply className="h-4 w-4 mr-2" />
                  <div className="text-sm">
                    <p className="font-medium">Replying to {replyingTo.senderName}</p>
                    <p className="text-muted-foreground truncate">{replyingTo.content}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCancelReply}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="p-2 border-t flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        ) : (
          // Chat list view
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Chats</h1>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingProfile(true)}>
                  <User className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex mt-4">
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <Tabs defaultValue="chats" className="flex-1 flex flex-col" onValueChange={setActiveTab}>
              <div className="border-b">
                <TabsList className="w-full">
                  <TabsTrigger value="chats" className="flex-1">
                    Chats
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex-1">
                    Notifications
                    {getTotalUnreadCount() > 0 && (
                      <Badge variant="default" className="ml-2">
                        {getTotalUnreadCount()}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="chats" className="flex-1 p-2 overflow-auto">
                {renderChatList()}
              </TabsContent>

              <TabsContent value="notifications" className="flex-1 p-2 overflow-auto">
                {renderChatList()}
              </TabsContent>
            </Tabs>

            <div className="p-2 border-t flex justify-between">
              <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Folder className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="folder-name">Folder Name</Label>
                      <Input
                        id="folder-name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Enter folder name"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreatingFolder(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                      Create Folder
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
                <DialogTrigger asChild>
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    New Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">Group Name</Label>
                      <Input
                        id="group-name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Enter group name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Select Members</Label>
                      <ScrollArea className="h-[200px] border rounded-md p-2">
                        {users.map((u) => (
                          <div key={u.id} className="flex items-center space-x-2 py-2">
                            <Checkbox
                              id={`user-${u.id}`}
                              checked={selectedGroupMembers.includes(u.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedGroupMembers([...selectedGroupMembers, u.id])
                                } else {
                                  setSelectedGroupMembers(selectedGroupMembers.filter((id) => id !== u.id))
                                }
                              }}
                            />
                            <Label htmlFor={`user-${u.id}`} className="flex items-center cursor-pointer">
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={u.photoURL || ""} />
                                <AvatarFallback>{u.displayName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {u.displayName}
                            </Label>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreatingGroup(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateGroup}
                      disabled={!newGroupName.trim() || selectedGroupMembers.length === 0}
                    >
                      Create Group
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Profile Editor Dialog */}
        <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            {userProfile && <UserProfileEditor profile={userProfile} onSave={handleUpdateProfile} />}
          </DialogContent>
        </Dialog>

        {/* Group Settings Modal */}
        <GroupSettingsModal
          group={selectedGroup}
          isOpen={isGroupSettingsOpen}
          onClose={() => setIsGroupSettingsOpen(false)}
          onGroupUpdated={() => {
            // Refresh group data
            const updatedGroup = chatGroups.find((g) => g.id === selectedChat)
            if (updatedGroup) {
              setSelectedGroup(updatedGroup)
            }
          }}
        />

        {/* Edit Folder Dialog */}
        <Dialog open={isEditingFolder} onOpenChange={setIsEditingFolder}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-folder-name">Folder Name</Label>
                <Input
                  id="edit-folder-name"
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  placeholder="Enter folder name"
                />
              </div>

              <div className="space-y-2">
                <Label>Chats in Folder</Label>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  {editingFolderContacts.length > 0 ? (
                    editingFolderContacts.map((chatId) => {
                      // Check if it's a group or direct chat
                      const group = chatGroups.find((g) => g.id === chatId)

                      if (group) {
                        return (
                          <div
                            key={chatId}
                            className="flex items-center justify-between py-2 px-2 hover:bg-accent rounded-md"
                          >
                            <div className="flex items-center">
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{group.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setEditingFolderContacts(editingFolderContacts.filter((id) => id !== chatId))
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        )
                      } else {
                        // Direct chat
                        const otherUserId = chatId.split("_").find((id) => id !== user?.uid)
                        const otherUser = users.find((u) => u.id === otherUserId)

                        if (!otherUser) return null

                        return (
                          <div
                            key={chatId}
                            className="flex items-center justify-between py-2 px-2 hover:bg-accent rounded-md"
                          >
                            <div className="flex items-center">
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={otherUser.photoURL || ""} />
                                <AvatarFallback>{otherUser.displayName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{otherUser.displayName}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setEditingFolderContacts(editingFolderContacts.filter((id) => id !== chatId))
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        )
                      }
                    })
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No chats in this folder</p>
                  )}
                </ScrollArea>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditingFolder(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditedFolder} disabled={!editingFolderName.trim()}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Chats</h1>
            <Button variant="ghost" size="icon" onClick={() => setIsEditingProfile(true)}>
              <User className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex mt-4">
            <Input
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <Tabs defaultValue="chats" className="flex-1 flex flex-col" onValueChange={setActiveTab}>
          <div className="border-b">
            <TabsList className="w-full">
              <TabsTrigger value="chats" className="flex-1">
                Chats
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex-1">
                Notifications
                {getTotalUnreadCount() > 0 && (
                  <Badge variant="default" className="ml-2">
                    {getTotalUnreadCount()}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chats" className="flex-1 p-4 overflow-auto">
            {renderChatList()}
          </TabsContent>

          <TabsContent value="notifications" className="flex-1 p-4 overflow-auto">
            {renderChatList()}
          </TabsContent>
        </Tabs>

        <div className="p-4 border-t flex justify-between">
          <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Folder className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-name">Folder Name</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreatingFolder(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                  Create Folder
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Users className="h-4 w-4 mr-2" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Select Members</Label>
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center space-x-2 py-2">
                        <Checkbox
                          id={`user-${u.id}`}
                          checked={selectedGroupMembers.includes(u.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedGroupMembers([...selectedGroupMembers, u.id])
                            } else {
                              setSelectedGroupMembers(selectedGroupMembers.filter((id) => id !== u.id))
                            }
                          }}
                        />
                        <Label htmlFor={`user-${u.id}`} className="flex items-center cursor-pointer">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={u.photoURL || ""} />
                            <AvatarFallback>{u.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {u.displayName}
                        </Label>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreatingGroup(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || selectedGroupMembers.length === 0}
                >
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {renderChatHeader()}

            {isSearching && (
              <div className="p-2 border-b">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search in chat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSearchMessages}>Search</Button>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 p-4">
              {renderMessagesWithDateSeparators()}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {replyingTo && (
              <div className="p-2 border-t bg-accent/50 flex items-center justify-between">
                <div className="flex items-center">
                  <Reply className="h-4 w-4 mr-2" />
                  <div className="text-sm">
                    <p className="font-medium">Replying to {replyingTo.senderName}</p>
                    <p className="text-muted-foreground truncate">{replyingTo.content}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCancelReply}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium mb-2">Select a chat to start messaging</h2>
              <p className="text-muted-foreground">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Editor Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          {userProfile && <UserProfileEditor profile={userProfile} onSave={handleUpdateProfile} />}
        </DialogContent>
      </Dialog>

      {/* Group Settings Modal */}
      <GroupSettingsModal
        group={selectedGroup}
        isOpen={isGroupSettingsOpen}
        onClose={() => setIsGroupSettingsOpen(false)}
        onGroupUpdated={() => {
          // Refresh group data
          const updatedGroup = chatGroups.find((g) => g.id === selectedChat)
          if (updatedGroup) {
            setSelectedGroup(updatedGroup)
          }
        }}
      />

      {/* Edit Folder Dialog */}
      <Dialog open={isEditingFolder} onOpenChange={setIsEditingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-folder-name">Folder Name</Label>
              <Input
                id="edit-folder-name"
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>

            <div className="space-y-2">
              <Label>Chats in Folder</Label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {editingFolderContacts.length > 0 ? (
                  editingFolderContacts.map((chatId) => {
                    // Check if it's a group or direct chat
                    const group = chatGroups.find((g) => g.id === chatId)

                    if (group) {
                      return (
                        <div
                          key={chatId}
                          className="flex items-center justify-between py-2 px-2 hover:bg-accent rounded-md"
                        >
                          <div className="flex items-center">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{group.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setEditingFolderContacts(editingFolderContacts.filter((id) => id !== chatId))
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      )
                    } else {
                      // Direct chat
                      const otherUserId = chatId.split("_").find((id) => id !== user?.uid)
                      const otherUser = users.find((u) => u.id === otherUserId)

                      if (!otherUser) return null

                      return (
                        <div
                          key={chatId}
                          className="flex items-center justify-between py-2 px-2 hover:bg-accent rounded-md"
                        >
                          <div className="flex items-center">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={otherUser.photoURL || ""} />
                              <AvatarFallback>{otherUser.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{otherUser.displayName}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setEditingFolderContacts(editingFolderContacts.filter((id) => id !== chatId))
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      )
                    }
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-4">No chats in this folder</p>
                )}
              </ScrollArea>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditingFolder(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditedFolder} disabled={!editingFolderName.trim()}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
