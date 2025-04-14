export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt: number; // Milliseconds since epoch for frontend
  likes: string[];
  comments?: Comment[];
  mediaURL?: string;
  mediaType?: "image" | "video" | "pdf" | "gif" | null;
  expiresAt?: { toDate: () => Date } | null; // Firestore Timestamp
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
  replyTo?: { id: string; content: string; senderId: string; senderName: string }
  postReply?: { postId: string; postTitle: string }
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
  description?: string
  createdBy: string
  createdAt: number
  updatedAt: number
  members: string[]
  admins?: string[] | { [key: string]: boolean }
  blockedMembers?: string[]
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
  contacts?: string[];
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
