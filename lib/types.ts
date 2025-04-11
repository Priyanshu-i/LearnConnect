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
  mediaURL?: string
  mediaType?: "image" | "video" | "pdf" | "gif" | null
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
  postReply?: {
    postId: string
    postTitle: string
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
  description: string
  members: string[]
  createdBy: string
  createdAt: number
  blockedMembers: string[]
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
  bio?: string
  location?: string
  website?: string
  followers?: string[]
  following?: string[]
}

export interface UserActivity {
  id: string
  type: "post" | "comment" | "like" | "message"
  targetId: string
  content?: string
  timestamp: number
}

export interface FollowRequest {
  id: string
  senderId: string
  senderName: string
  senderPhotoURL?: string
  recipientId: string
  timestamp: number
  status: "pending" | "accepted" | "declined"
}

export interface Bookmark {
  id: string
  postId: string
  userId: string
  createdAt: number
}
