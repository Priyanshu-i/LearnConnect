export interface Post {
  id: string
  title: string
  content: string
  authorId: string
  authorName: string
  authorPhotoURL?: string
  createdAt: number
  likes: string[]
  comments?: Comment[]
}

export interface Comment {
  id: string
  content: string
  authorId: string
  authorName: string
  authorPhotoURL?: string
  createdAt: number
}

export interface ChatMessage {
  id: string
  content: string
  senderId: string
  senderName: string
  senderPhotoURL?: string
  timestamp: number
  reactions?: Record<string, string>
  replyTo?: {
    id: string
    content: string
    senderId: string
    senderName: string
  }
}

export interface ChatReaction {
  userId: string
  userName: string
  reaction: string
}

export interface ChatRoom {
  id: string
  participants: string[]
  lastMessage?: string
  lastMessageTimestamp?: number
}

export interface ChatGroup {
  id: string
  name: string
  members: string[]
  createdBy: string
  createdAt: number
}

export interface ChatFolder {
  id: string
  name: string
  chatIds: string[]
}

export interface UserProfile {
  id: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: number
}
