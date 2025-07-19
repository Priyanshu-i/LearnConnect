"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LogOut, Mail, MapPin, Globe, Calendar, Edit2, Save, X, Plus, Trash2, Shuffle, Earth } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface EditableField {
  field: string
  isEditing: boolean
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [editingFields, setEditingFields] = useState<EditableField[]>([])
  const [tempData, setTempData] = useState<any>({})
  const [newInterest, setNewInterest] = useState("")
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState("adventurer")
  const [avatarOptions, setAvatarOptions] = useState<string[]>([])
  const [selectedAvatar, setSelectedAvatar] = useState("")
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user)
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData(data)
          setTempData(data)
        }
      } else {
        router.push("/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (showAvatarDialog) {
      generateAvatarOptions()
    }
  }, [selectedAvatarStyle, showAvatarDialog])

  const startEditing = (field: string) => {
    setEditingFields((prev) => [...prev.filter((f) => f.field !== field), { field, isEditing: true }])
  }

  const stopEditing = (field: string) => {
    setEditingFields((prev) => prev.filter((f) => f.field !== field))
    // Reset temp data for this field
    setTempData((prev) => ({ ...prev, [field]: userData[field] }))
  }

  const isEditing = (field: string) => {
    return editingFields.some((f) => f.field === field && f.isEditing)
  }

  const updateTempData = (field: string, value: any) => {
    setTempData((prev) => ({ ...prev, [field]: value }))
  }

  const saveField = async (field: string) => {
    if (!user || !userData) return

    setSaving(true)
    try {
      const updateData = { [field]: tempData[field] }

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), updateData)

      // Update local state
      setUserData((prev) => ({ ...prev, ...updateData }))

      // Stop editing
      setEditingFields((prev) => prev.filter((f) => f.field !== field))

      setMessage("Profile updated successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (error: any) {
      setMessage("Failed to update profile. Please try again.")
      console.error("Error updating profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const addInterest = async () => {
    if (!newInterest.trim() || !user || !userData) return

    const currentInterests = userData.interests || []
    if (currentInterests.includes(newInterest.trim())) {
      setMessage("Interest already exists!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    setSaving(true)
    try {
      const updatedInterests = [...currentInterests, newInterest.trim()]
      await updateDoc(doc(db, "users", user.uid), { interests: updatedInterests })

      setUserData((prev) => ({ ...prev, interests: updatedInterests }))
      setTempData((prev) => ({ ...prev, interests: updatedInterests }))
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
    if (!user || !userData) return

    setSaving(true)
    try {
      const updatedInterests = userData.interests.filter((interest: string) => interest !== interestToRemove)
      await updateDoc(doc(db, "users", user.uid), { interests: updatedInterests })

      setUserData((prev) => ({ ...prev, interests: updatedInterests }))
      setTempData((prev) => ({ ...prev, interests: updatedInterests }))

      setMessage("Interest removed successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (error: any) {
      setMessage("Failed to remove interest. Please try again.")
      console.error("Error removing interest:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    router.replace("/")
    /*     try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    } */
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
      userData?.username || "default",
      `${userData?.displayName}`,
      `user${Math.random().toString(36).substr(2, 9)}`,
      `avatar${Math.random().toString(36).substr(2, 9)}`,
      `${selectedAvatarStyle}${Math.random().toString(36).substr(2, 9)}`,
      `random${Math.random().toString(36).substr(2, 9)}`,
    ]

    const options = seeds.map((s) => `https://api.dicebear.com/7.x/${selectedAvatarStyle}/svg?seed=${s}&size=120`)
    setAvatarOptions(options)
  }

  const openAvatarEditor = () => {
    setSelectedAvatar(userData?.photoURL || "")
    generateAvatarOptions()
    setShowAvatarDialog(true)
  }

  const saveAvatar = async () => {
    if (!user || !selectedAvatar) return

    setSaving(true)
    try {
      await updateDoc(doc(db, "users", user.uid), { photoURL: selectedAvatar })
      setUserData((prev) => ({ ...prev, photoURL: selectedAvatar }))
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Welcome to your Dashboard</h1>
          <Button onClick={handleSignOut} variant="outline">
            <Earth className="h-4 w-4 mr-2" />
            Get Explore!
          </Button>
        </div>

        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={userData?.photoURL || user?.photoURL} />
                    <AvatarFallback>{userData?.displayName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 bg-transparent"
                    onClick={openAvatarEditor}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  {/* Display Name */}
                  <div className="flex items-center space-x-2 mb-2">
                    {isEditing("displayName") ? (
                      <div className="flex items-center space-x-2 flex-1">
                        <Input
                          value={tempData.displayName || ""}
                          onChange={(e) => updateTempData("displayName", e.target.value)}
                          className="text-lg font-semibold"
                          placeholder="Display Name"
                        />
                        <Button size="sm" onClick={() => saveField("displayName")} disabled={saving}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => stopEditing("displayName")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="text-xl font-semibold">{userData?.displayName}</span>
                        <Button size="sm" variant="ghost" onClick={() => startEditing("displayName")}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Username */}
                  <div className="flex items-center space-x-2">
                    {isEditing("username") ? (
                      <div className="flex items-center space-x-2 flex-1">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2 text-muted-foreground">@</span>
                          <Input
                            value={tempData.username || ""}
                            onChange={(e) => updateTempData("username", e.target.value)}
                            className="pl-8"
                            placeholder="username"
                          />
                        </div>
                        <Button size="sm" onClick={() => saveField("username")} disabled={saving}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => stopEditing("username")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <p className="text-muted-foreground">@{userData?.username}</p>
                        <Button size="sm" variant="ghost" onClick={() => startEditing("username")}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user?.email}</span>
                  {user?.emailVerified && (
                    <Badge variant="secondary" className="text-xs">
                      Verified
                    </Badge>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {isEditing("location") ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        value={tempData.location || ""}
                        onChange={(e) => updateTempData("location", e.target.value)}
                        placeholder="City, Country"
                        className="text-sm"
                      />
                      <Button size="sm" onClick={() => saveField("location")} disabled={saving}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => stopEditing("location")}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="text-sm">{userData?.location || "Add location"}</span>
                      <Button size="sm" variant="ghost" onClick={() => startEditing("location")}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Website */}
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {isEditing("website") ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        value={tempData.website || ""}
                        onChange={(e) => updateTempData("website", e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="text-sm"
                        type="url"
                      />
                      <Button size="sm" onClick={() => saveField("website")} disabled={saving}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => stopEditing("website")}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 flex-1">
                      {userData?.website ? (
                        <a
                          href={userData.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {userData.website}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">Add website</span>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => startEditing("website")}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {isEditing("dateOfBirth") ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        type="date"
                        value={tempData.dateOfBirth || ""}
                        onChange={(e) => updateTempData("dateOfBirth", e.target.value)}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={() => saveField("dateOfBirth")} disabled={saving}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => stopEditing("dateOfBirth")}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="text-sm">
                        {userData?.dateOfBirth
                          ? `Born ${new Date(userData.dateOfBirth).toLocaleDateString()}`
                          : "Add date of birth"}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => startEditing("dateOfBirth")}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Bio</h4>
                  {!isEditing("bio") && (
                    <Button size="sm" variant="ghost" onClick={() => startEditing("bio")}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isEditing("bio") ? (
                  <div className="space-y-2">
                    <Textarea
                      value={tempData.bio || ""}
                      onChange={(e) => updateTempData("bio", e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="min-h-[80px]"
                    />
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => saveField("bio")} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => stopEditing("bio")}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {userData?.bio || "Add a bio to tell others about yourself"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Interests</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {userData?.interests && userData.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userData.interests.map((interest: string, index: number) => (
                    <Badge key={index} variant="outline" className="group relative pr-8">
                      {interest}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute right-0 top-0 h-full w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeInterest(interest)}
                        disabled={saving}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No interests added yet.</p>
              )}

              <div className="flex space-x-2">
                <Input
                  placeholder="Add new interest..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addInterest()}
                />
                <Button onClick={addInterest} disabled={!newInterest.trim() || saving} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Account Created:</span>
                <p className="text-muted-foreground">
                  {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div>
                <span className="font-medium">Sign-in Method:</span>
                <p className="text-muted-foreground">{userData?.provider === "google" ? "Google" : "Email/Password"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Choose Your Avatar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 sm:space-y-6">
              {/* Current Avatar */}
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Current Avatar</p>
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 mx-auto">
                  <AvatarImage src={userData?.photoURL || user?.photoURL} />
                  <AvatarFallback>{userData?.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              </div>

              {/* Avatar Style Selection */}
              <div>
                <p className="text-sm font-medium mb-3">Avatar Style</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {avatarStyles.map((style) => (
                    <Button
                      key={style}
                      variant={selectedAvatarStyle === style ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAvatarStyle(style)}
                      className="text-xs capitalize h-8 sm:h-9 px-2 sm:px-3"
                    >
                      {style.replace("-", " ")}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Generate New Options */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <p className="text-sm font-medium">Choose Avatar</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAvatarOptions}
                  className="w-full sm:w-auto bg-transparent"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Generate New
                </Button>
              </div>

              {/* Avatar Options */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {avatarOptions.map((avatarUrl, index) => (
                  <Card
                    key={index}
                    className={`p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedAvatar === avatarUrl ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedAvatar(avatarUrl)}
                  >
                    <div className="flex justify-center">
                      <img
                        src={avatarUrl || "/placeholder.svg"}
                        alt={`Avatar option ${index + 1}`}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full"
                      />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Selected Avatar Preview */}
              {selectedAvatar && selectedAvatar !== userData?.photoURL && (
                <div className="text-center">
                  <p className="text-sm font-medium mb-2">Selected Avatar</p>
                  <img
                    src={selectedAvatar || "/placeholder.svg"}
                    alt="Selected avatar"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto border-2 border-primary"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 sm:space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowAvatarDialog(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveAvatar}
                  disabled={saving || !selectedAvatar || selectedAvatar === userData?.photoURL}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  {saving ? "Saving..." : "Save Avatar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
