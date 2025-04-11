"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { UserProfile } from "@/lib/types"
import { Search, UserPlus, UserMinus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FollowersModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  type: "followers" | "following"
}

export function FollowersModal({ isOpen, onClose, userId, type }: FollowersModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({})
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!isOpen || !userId) return

    async function fetchUsers() {
      try {
        setLoading(true)

        // Get the user profile
        const userDocRef = doc(db, "users", userId)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
          throw new Error("User not found")
        }

        const userData = userDoc.data() as UserProfile
        const userIds = type === "followers" ? userData.followers || [] : userData.following || []

        // Get current user's following list
        let currentUserFollowing: string[] = []
        if (user) {
          const currentUserDoc = await getDoc(doc(db, "users", user.uid))
          if (currentUserDoc.exists()) {
            currentUserFollowing = currentUserDoc.data().following || []
          }
        }

        // Fetch each user profile
        const userProfiles: UserProfile[] = []
        const followingStatusMap: Record<string, boolean> = {}

        for (const id of userIds) {
          const profileDoc = await getDoc(doc(db, "users", id))
          if (profileDoc.exists()) {
            userProfiles.push({
              id: profileDoc.id,
              ...(profileDoc.data() as Omit<UserProfile, "id">),
            })

            // Set following status
            followingStatusMap[id] = currentUserFollowing.includes(id)
          }
        }

        setUsers(userProfiles)
        setFilteredUsers(userProfiles)
        setFollowingStatus(followingStatusMap)
      } catch (error) {
        console.error(`Error fetching ${type}:`, error)
        toast({
          title: "Error",
          description: `Failed to load ${type}. Please try again.`,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [isOpen, userId, type, user, toast])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter((user) => user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredUsers(filtered)
    }
  }, [searchQuery, users])

  const handleFollowToggle = async (targetUserId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow users",
        variant: "destructive",
      })
      return
    }

    try {
      const isFollowing = followingStatus[targetUserId]
      const targetUserRef = doc(db, "users", targetUserId)
      const currentUserRef = doc(db, "users", user.uid)

      if (isFollowing) {
        // Unfollow
        await updateDoc(targetUserRef, {
          followers: arrayRemove(user.uid),
        })

        await updateDoc(currentUserRef, {
          following: arrayRemove(targetUserId),
        })

        setFollowingStatus({
          ...followingStatus,
          [targetUserId]: false,
        })

        toast({
          title: "Unfollowed",
          description: "You are no longer following this user",
        })
      } else {
        // Follow
        await updateDoc(targetUserRef, {
          followers: arrayUnion(user.uid),
        })

        await updateDoc(currentUserRef, {
          following: arrayUnion(targetUserId),
        })

        setFollowingStatus({
          ...followingStatus,
          [targetUserId]: true,
        })

        toast({
          title: "Following",
          description: "You are now following this user",
        })
      }
    } catch (error) {
      console.error("Error toggling follow status:", error)
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleViewProfile = (userId: string) => {
    router.push(`/profile/${userId}`)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{type === "followers" ? "Followers" : "Following"}</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[50vh]">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-2">
              {filteredUsers.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => handleViewProfile(profile.id)}
                  >
                    <Avatar>
                      <AvatarImage src={profile.photoURL || ""} />
                      <AvatarFallback>{profile.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{profile.displayName}</p>
                      {profile.bio && <p className="text-sm text-muted-foreground line-clamp-1">{profile.bio}</p>}
                    </div>
                  </div>

                  {user && user.uid !== profile.id && (
                    <Button
                      variant={followingStatus[profile.id] ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleFollowToggle(profile.id)}
                    >
                      {followingStatus[profile.id] ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
