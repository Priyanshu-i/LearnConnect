"use client"
import React from "react"
import { FollowingModal } from "@/components/following-modal";
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { Navbar } from "@/components/navbar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FollowersModal } from "@/components/followers-modal"
import { PostCard } from "@/components/post-card"
import { UserActivity } from "@/components/user-activity"
import { CalendarDays, Link2, MapPin, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Post, UserProfile } from "@/lib/types"
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function MyProfile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    displayName: "",
    bio: "",
    location: "",
    website: "",
  })
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      router.push("/profile")
      return
    }

    async function fetchUserData() {
      try {
        if(!user) return
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile
          setUserProfile(userData)
          setEditForm({
            displayName: userData.displayName,
            bio: userData.bio || "",
            location: userData.location || "",
            website: userData.website || "",
          })
        }

        // Fetch user posts
        const postsQuery = query(
          collection(db, "posts"),
          where("authorId", "==", user.uid),
          orderBy("createdAt", "desc")
        )

        const querySnapshot = await getDocs(postsQuery)
        const posts: Post[] = []
        querySnapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...(doc.data() as Omit<Post, "id">) })
        })

        setUserPosts(posts)
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user, router, toast])

  const handleEditSubmit = async () => {
    if (!user || !userProfile) return

    try {
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        displayName: editForm.displayName,
        bio: editForm.bio,
        location: editForm.location,
        website: editForm.website,
      })

      setUserProfile({
        ...userProfile,
        ...editForm,
      })
      setIsEditing(false)

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    }
  }

  if (!user || loading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>

                {isEditing ? (
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={editForm.displayName}
                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleEditSubmit}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl">{userProfile?.displayName}</CardTitle>
                        <p className="text-muted-foreground">{user.email}</p>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>

                    {userProfile?.bio && <p className="mt-4">{userProfile.bio}</p>}

                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                      {userProfile?.location && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{userProfile.location}</span>
                        </div>
                      )}

                      {userProfile?.website && (
                        <div className="flex items-center">
                          <Link2 className="h-4 w-4 mr-1" />
                          <a
                            href={userProfile.website.startsWith("http") ? userProfile.website : `https://${userProfile.website}`}
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
                        <span>Joined {new Date(userProfile?.createdAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-6 mt-6 items-center flex-wrap">
                        <span className="gap-6">{userPosts.length} Posts</span>
                        <Button variant="ghost" onClick={() => setShowFollowersModal(true)}>
                          <span className="font-bold">{userProfile?.followers?.length || 0}</span>
                          <span className="ml-1">Followers</span>
                        </Button>
                        <Button variant="ghost" onClick={() => setShowFollowingModal(true)}>
                          <span className="font-bold">{userProfile?.following?.length || 0}</span>
                          <span className="ml-1">Following</span>
                        </Button>
                        <Button variant="ghost" onClick={() => setShowContactsModal(true)}>
                          <span className="ml-1">All Contacts</span>
                        </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="posts">
            <TabsList className="mb-6">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
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
                    <p className="text-muted-foreground mb-4">You haven't created any posts yet.</p>
                    <Button onClick={() => router.push("/create-post")}>Create Your First Post</Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity">
              <UserActivity userId={user.uid} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userId={user.uid}
        type="followers"
      />

      <FollowingModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        userId={user.uid}
      />

      <FollowersModal
        isOpen={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        userId={user.uid}
        type="contacts"
      />
    </>
    )}