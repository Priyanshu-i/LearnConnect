"use client"
import { FollowingModal } from "@/components/following-modal"
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
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FollowersModal } from "@/components/followers-modal"
import { PostCard } from "@/components/post-card"
import { UserActivity } from "@/components/user-activity"
import { CalendarDays, MapPin, Edit3, Plus, Trash2, Shuffle, Mail, Globe, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Post, UserProfile } from "@/lib/types"
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function MyProfile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [showContactsModal, setShowContactsModal] = useState(false)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [newInterest, setNewInterest] = useState("")
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState("adventurer")
  const [avatarOptions, setAvatarOptions] = useState<string[]>([])
  const [selectedAvatar, setSelectedAvatar] = useState("")

  // Edit form state
  const [editForm, setEditForm] = useState({
    displayName: "",
    username: "",
    bio: "",
    location: "",
    website: "",
    dateOfBirth: "",
  })

  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    async function fetchUserData() {
      try {
        if (!user) return

        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile
          setUserProfile(userData)
          setEditForm({
            displayName: userData.displayName || "",
            username: userData.username || "",
            bio: userData.bio || "",
            location: userData.location || "",
            website: userData.website || "",
            dateOfBirth: userData.dateOfBirth || "",
          })
        }

        // Fetch user posts
        const postsQuery = query(
          collection(db, "posts"),
          where("authorId", "==", user.uid),
          orderBy("createdAt", "desc"),
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

  useEffect(() => {
    if (showAvatarDialog) {
      generateAvatarOptions()
    }
  }, [selectedAvatarStyle, showAvatarDialog])

  const addInterest = async () => {
    if (!newInterest.trim() || !user || !userProfile) return

    const currentInterests = userProfile.interests || []
    if (currentInterests.includes(newInterest.trim())) {
      setMessage("Interest already exists!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    setSaving(true)
    try {
      const updatedInterests = [...currentInterests, newInterest.trim()]
      await updateDoc(doc(db, "users", user.uid), { interests: updatedInterests })

      setUserProfile((prev) => ({ ...prev, interests: updatedInterests }))
      setNewInterest("")

      setMessage("Interest added successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (error: any) {
      setMessage("Failed to add interest. Please try again.")
      console.error("Error adding interest:", error)
    } finally {
      setSaving(false)
    }
  }

  const removeInterest = async (interestToRemove: string) => {
    if (!user || !userProfile) return

    setSaving(true)
    try {
      const updatedInterests = userProfile.interests?.filter((interest: string) => interest !== interestToRemove) || []
      await updateDoc(doc(db, "users", user.uid), { interests: updatedInterests })

      setUserProfile((prev) => ({ ...prev, interests: updatedInterests }))

      setMessage("Interest removed successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (error: any) {
      setMessage("Failed to remove interest. Please try again.")
      console.error("Error removing interest:", error)
    } finally {
      setSaving(false)
    }
  }

  const avatarStyles = [
    "adventurer",
    "avataaars",
    "big-ears",
    "big-smile",
    "croodles",
    "fun-emoji",
    "icons",
    "identicon",
    "initials",
    "lorelei",
    "micah",
    "miniavs",
    "open-peeps",
    "personas",
    "pixel-art",
    "shapes",
  ]

  const generateAvatarOptions = () => {
    const seeds = [
      userProfile?.username || "default",
      userProfile?.displayName || "user",
      `user${Math.random().toString(36).substr(2, 9)}`,
      `avatar${Math.random().toString(36).substr(2, 9)}`,
      `${selectedAvatarStyle}${Math.random().toString(36).substr(2, 9)}`,
      `random${Math.random().toString(36).substr(2, 9)}`,
    ]

    const options = seeds.map((s) => `https://api.dicebear.com/7.x/${selectedAvatarStyle}/svg?seed=${s}&size=120`)
    setAvatarOptions(options)
  }

  const openAvatarEditor = () => {
    setSelectedAvatar(userProfile?.photoURL || user?.photoURL || "")
    generateAvatarOptions()
    setShowAvatarDialog(true)
  }

  const saveAvatar = async () => {
    if (!user || !selectedAvatar) return

    setSaving(true)
    try {
      await updateDoc(doc(db, "users", user.uid), { photoURL: selectedAvatar })
      setUserProfile((prev) => ({ ...prev, photoURL: selectedAvatar }))
      setShowAvatarDialog(false)
      setMessage("Avatar updated successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (error: any) {
      setMessage("Failed to update avatar. Please try again.")
      console.error("Error updating avatar:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleEditSubmit = async () => {
    if (!user || !userProfile) return

    setSaving(true)
    try {
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, editForm)

      setUserProfile({
        ...userProfile,
        ...editForm,
      })
      setShowEditDialog(false)
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
    } finally {
      setSaving(false)
    }
  }

  if (!user || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {message && (
              <Alert className="mb-6">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {/* Profile Header Card */}
            <Card className="mb-8 overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
              <CardContent className="relative px-6 pb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 -mt-16">
                  {/* Avatar Section */}
                  <div className="relative">
                    <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                      <AvatarImage src={userProfile?.photoURL || user?.photoURL || ""} />
                      <AvatarFallback className="text-2xl">
                        {userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full p-0 bg-white shadow-md hover:shadow-lg"
                      onClick={openAvatarEditor}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 text-center sm:text-left mt-4 sm:mt-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                          {userProfile?.displayName || user?.displayName || "User"}
                        </h1>
                        {userProfile?.username && <p className="text-lg text-gray-600 mt-1">@{userProfile.username}</p>}
                        <div className="flex items-center justify-center sm:justify-start mt-2 text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          <span>{user.email}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowEditDialog(true)}
                        className="mt-4 sm:mt-0 bg-white hover:bg-gray-50"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>

                    {/* Bio */}
                    {userProfile?.bio && <p className="text-gray-700 mb-4 max-w-2xl">{userProfile.bio}</p>}

                    {/* Profile Details */}
                    <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm text-gray-600 mb-4">
                      {userProfile?.location && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{userProfile.location}</span>
                        </div>
                      )}
                      {userProfile?.website && (
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 mr-1" />
                          <a
                            href={
                              userProfile.website.startsWith("http")
                                ? userProfile.website
                                : `https://${userProfile.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-blue-600"
                          >
                            {userProfile.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-1" />
                        <span>
                          {userProfile?.dateOfBirth
                            ? `Born ${new Date(userProfile.dateOfBirth).toLocaleDateString()}`
                            : `Joined ${new Date(userProfile?.createdAt || Date.now()).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 justify-center sm:justify-start mb-4">
                      <div className="text-center">
                        <div className="font-bold text-xl">{userPosts.length}</div>
                        <div className="text-sm text-gray-600">Posts</div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setShowFollowersModal(true)}
                        className="text-center hover:bg-gray-100"
                      >
                        <div>
                          <div className="font-bold text-xl">{userProfile?.followers?.length || 0}</div>
                          <div className="text-sm text-gray-600">Followers</div>
                        </div>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setShowFollowingModal(true)}
                        className="text-center hover:bg-gray-100"
                      >
                        <div>
                          <div className="font-bold text-xl">{userProfile?.following?.length || 0}</div>
                          <div className="text-sm text-gray-600">Following</div>
                        </div>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setShowContactsModal(true)}
                        className="text-center hover:bg-gray-100"
                      >
                        <div className="text-sm text-gray-600">All Contacts</div>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interests Card */}
            {(userProfile?.interests?.length > 0 || true) && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Interests</span>
                    <span className="text-sm font-normal text-gray-600">
                      {userProfile?.interests?.length || 0} interests
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProfile?.interests && userProfile.interests.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {userProfile.interests.map((interest: string, index: number) => (
                        <Badge key={index} variant="secondary" className="group relative pr-8 hover:bg-red-100">
                          {interest}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute right-0 top-0 h-full w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                            onClick={() => removeInterest(interest)}
                            disabled={saving}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 mb-4">No interests added yet. Add some to help others discover you!</p>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a new interest..."
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addInterest()}
                      className="flex-1"
                    />
                    <Button onClick={addInterest} disabled={!newInterest.trim() || saving}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content Tabs */}
            <Tabs defaultValue="posts">
              <TabsList className="mb-6 bg-white">
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
                    <CardContent className="py-12 text-center">
                      <div className="max-w-md mx-auto">
                        <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                        <p className="text-gray-600 mb-6">
                          Share your thoughts and connect with others by creating your first post.
                        </p>
                        <Button onClick={() => router.push("/create-post")} size="lg">
                          Create Your First Post
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              <TabsContent value="activity">
                <UserActivity userId={user.uid} />
              </TabsContent>
            </Tabs>

            {/* Edit Profile Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      placeholder="Your display name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">@</span>
                      <Input
                        id="username"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        placeholder="username"
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={editForm.website}
                      onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={editForm.dateOfBirth}
                      onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleEditSubmit} disabled={saving} className="flex-1">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Avatar Editor Dialog */}
            <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Choose Your Avatar</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Current Avatar */}
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2">Current Avatar</p>
                    <Avatar className="h-20 w-20 mx-auto">
                      <AvatarImage src={userProfile?.photoURL || user?.photoURL || ""} />
                      <AvatarFallback className="text-xl">
                        {userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Avatar Style Selection */}
                  <div>
                    <p className="text-sm font-medium mb-3">Avatar Style</p>
                    <div className="grid grid-cols-4 gap-2">
                      {avatarStyles.map((style) => (
                        <Button
                          key={style}
                          variant={selectedAvatarStyle === style ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedAvatarStyle(style)}
                          className="text-xs capitalize"
                        >
                          {style.replace("-", " ")}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Generate New Options */}
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Choose Avatar</p>
                    <Button variant="outline" size="sm" onClick={generateAvatarOptions}>
                      <Shuffle className="h-4 w-4 mr-2" />
                      Generate New
                    </Button>
                  </div>

                  {/* Avatar Options */}
                  <div className="grid grid-cols-3 gap-4">
                    {avatarOptions.map((avatarUrl, index) => (
                      <Card
                        key={index}
                        className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                          selectedAvatar === avatarUrl ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => setSelectedAvatar(avatarUrl)}
                      >
                        <div className="flex justify-center">
                          <img
                            src={avatarUrl || "/placeholder.svg"}
                            alt={`Avatar option ${index + 1}`}
                            className="w-16 h-16 rounded-full"
                          />
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Selected Avatar Preview */}
                  {selectedAvatar && selectedAvatar !== (userProfile?.photoURL || user?.photoURL) && (
                    <div className="text-center">
                      <p className="text-sm font-medium mb-2">Selected Avatar</p>
                      <img
                        src={selectedAvatar || "/placeholder.svg"}
                        alt="Selected avatar"
                        className="w-20 h-20 rounded-full mx-auto border-2 border-primary"
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowAvatarDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={saveAvatar}
                      disabled={
                        saving || !selectedAvatar || selectedAvatar === (userProfile?.photoURL || user?.photoURL)
                      }
                    >
                      {saving ? "Saving..." : "Save Avatar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userId={user.uid}
        type="followers"
      />
      <FollowingModal isOpen={showFollowingModal} onClose={() => setShowFollowingModal(false)} userId={user.uid} />
      <FollowersModal
        isOpen={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        userId={user.uid}
        type="contacts"
      />
    </>
  )
}
