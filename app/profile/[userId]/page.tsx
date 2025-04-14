"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { Navbar } from "@/components/navbar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PostCard } from "@/components/post-card"
import { UserActivity } from "@/components/user-activity"

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Post, UserProfile } from "@/lib/types"
import { CalendarDays, Link2, MapPin, UserPlus, UserMinus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const isOwnProfile = user?.uid === userId

  

  useEffect(() => {
    if (!userId) return

    async function fetchUserProfile() {
      try {
        setLoading(true)
        const userDocRef = doc(db, "users", userId as string)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile
          setUserProfile(userData)

          // Check if current user is following this user
          if (user && userData.followers) {
            setIsFollowing(userData.followers.includes(user.uid))
            setFollowerCount(userData.followers.length)
          }

          if (userData.following) {
            setFollowingCount(userData.following.length)
          }
        } else {
          toast({
            title: "User not found",
            description: "The requested user profile does not exist",
            variant: "destructive",
          })
          router.push("/")
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
      }
    }

    async function fetchUserPosts() {
      try {
        const now = Timestamp.now()

        const postsQuery = query(collection(db, "posts"), where("authorId", "==", userId), orderBy("createdAt", "desc"))

        const querySnapshot = await getDocs(postsQuery)
        const posts: Post[] = []

        querySnapshot.forEach((doc) => {
           const data = doc.data() as Omit<Post, "id">;

      // Check condition for expiresAt and add to posts
      if (!data.expiresAt || data.expiresAt > now) {
        posts.push({
          id: doc.id,
          ...data,
        });
      }
    });


        setUserPosts(posts)
      } catch (error) {
        console.error("Error fetching user posts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
    fetchUserPosts()
  }, [userId, user, router, toast])

  const handleFollowToggle = async () => {
    if (!user || !userProfile) return

    try {
      const userDocRef = doc(db, "users", userId as string)
      const currentUserRef = doc(db, "users", user.uid)

      if (isFollowing) {
        // Unfollow
        await updateDoc(userDocRef, {
          followers: arrayRemove(user.uid),
        })

        await updateDoc(currentUserRef, {
          following: arrayRemove(userId),
        })

        setIsFollowing(false)
        setFollowerCount((prev) => prev - 1)

        toast({
          title: "Unfollowed",
          description: `You are no longer following ${userProfile.displayName}`,
        })
      } else {
        // Follow
        await updateDoc(userDocRef, {
          followers: arrayUnion(user.uid),
        })

        await updateDoc(currentUserRef, {
          following: arrayUnion(userId),
        })

        setIsFollowing(true)
        setFollowerCount((prev) => prev + 1)

        toast({
          title: "Following",
          description: `You are now following ${userProfile.displayName}`,
        })
      }
    } catch (error) {
      console.error("Error updating follow status:", error)
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="flex-1 space-y-4 text-center sm:text-left">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex justify-center sm:justify-start gap-4">
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="posts">
              <TabsList className="mb-6">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                {/* <TabsTrigger value="activity">Activity</TabsTrigger> */}
              </TabsList>

              <TabsContent value="posts">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </>
    )
  }

  if (!userProfile) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">User not found</h2>
          <Button onClick={() => router.push("/")}>Back to Home</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={userProfile.photoURL || ""} />
                  <AvatarFallback>{userProfile.displayName.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-4 text-center sm:text-left">
                  <div>
                    <h1 className="text-2xl font-bold">{userProfile.displayName}</h1>
                    <p className="text-muted-foreground">{userProfile.email}</p>
                  </div>

                  {userProfile.bio && <p>{userProfile.bio}</p>}

                  <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm text-muted-foreground">
                    {userProfile.location && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{userProfile.location}</span>
                      </div>
                    )}

                    {userProfile.website && (
                      <div className="flex items-center">
                        <Link2 className="h-4 w-4 mr-1" />
                        <a
                          href={
                            userProfile.website.startsWith("http")
                              ? userProfile.website
                              : `https://${userProfile.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-primary"
                        >
                          {userProfile.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}

                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 mr-1" />
                      <span>Joined {new Date(userProfile.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-6 justify-center sm:justify-start">
                    <div>
                      <span className="font-bold">{userPosts.length}</span>
                      <span className="text-muted-foreground ml-1">Posts</span>
                    </div>
                    <div>
                      <span className="font-bold">{followerCount}</span>
                      <span className="text-muted-foreground ml-1">Followers</span>
                    </div>
                    <div>
                      <span className="font-bold">{followingCount}</span>
                      <span className="text-muted-foreground ml-1">Following</span>
                    </div>
                  </div>

                  <div>
                    {isOwnProfile ? (
                      <Button onClick={() => router.push("/profile")}>Edit Profile</Button>
                    ) : (
                      <Button onClick={handleFollowToggle} variant={isFollowing ? "outline" : "default"}>
                        {isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-2" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="posts">
            <TabsList className="mb-6">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              {/* <TabsTrigger value="activity">Activity</TabsTrigger> */}
            </TabsList>

            <TabsContent value="posts">
              {userPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userPosts.map((post) => (
                    <PostCard key={post.id} post={post} currentUser={user} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">No posts yet</p>
                    {isOwnProfile && (
                      <Button onClick={() => router.push("/create-post")}>Create Your First Post</Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* <TabsContent value="activity">
              <UserActivity userId={userId as string} />
            </TabsContent> */}
          </Tabs>
        </div>
      </div>
    </>
  )
}
