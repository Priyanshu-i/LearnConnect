"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash, MoreHorizontal, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { collection, getDocs, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/hooks/use-auth"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ActivityManagerProps {
  userId: string
  onActivityDeleted?: () => void
}

export function ActivityManager({ userId, onActivityDeleted }: ActivityManagerProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [activitiesPrivate, setActivitiesPrivate] = useState(false)
  const [isPrivacyLoading, setIsPrivacyLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    // Fetch user's privacy settings
    const fetchPrivacySettings = async () => {
      if (!user || user.uid !== userId) return

      try {
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setActivitiesPrivate(userData.activitiesPrivate || false)
        }
      } catch (error) {
        console.error("Error fetching privacy settings:", error)
      }
    }

    fetchPrivacySettings()
  }, [user, userId])

  const handleDeleteActivity = async (activityId: string) => {
    if (!user || user.uid !== userId) {
      toast({
        title: "Permission denied",
        description: "You can only delete your own activities.",
        variant: "destructive",
      })
      return
    }

    setSelectedActivityId(activityId)
    setIsConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedActivityId || !user) return

    setIsDeleting(true)

    try {
      // Delete the activity document
      await deleteDoc(doc(db, "users", userId, "activity", selectedActivityId))

      toast({
        title: "Activity deleted",
        description: "The activity has been removed from your profile.",
      })

      if (onActivityDeleted) {
        onActivityDeleted()
      }
    } catch (error) {
      console.error("Error deleting activity:", error)
      toast({
        title: "Error",
        description: "Failed to delete activity. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsConfirmOpen(false)
      setSelectedActivityId(null)
    }
  }

  const handleClearAllActivities = async () => {
    if (!user || user.uid !== userId) {
      toast({
        title: "Permission denied",
        description: "You can only clear your own activities.",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)

    try {
      // Get all activities for the user
      const activitiesRef = collection(db, "users", userId, "activity")
      const activitiesSnapshot = await getDocs(activitiesRef)

      // Delete each activity document
      const deletePromises = activitiesSnapshot.docs.map((doc) => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      toast({
        title: "Activities cleared",
        description: "All activities have been removed from your profile.",
      })

      if (onActivityDeleted) {
        onActivityDeleted()
      }
    } catch (error) {
      console.error("Error clearing activities:", error)
      toast({
        title: "Error",
        description: "Failed to clear activities. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTogglePrivacy = async () => {
    if (!user || user.uid !== userId) {
      toast({
        title: "Permission denied",
        description: "You can only change your own privacy settings.",
        variant: "destructive",
      })
      return
    }

    setIsPrivacyLoading(true)

    try {
      const newPrivacySetting = !activitiesPrivate

      // Update user document with new privacy setting
      await updateDoc(doc(db, "users", userId), {
        activitiesPrivate: newPrivacySetting,
      })

      setActivitiesPrivate(newPrivacySetting)

      toast({
        title: newPrivacySetting ? "Activities are now private" : "Activities are now public",
        description: newPrivacySetting
          ? "Only you can see your activities"
          : "Your activities are now visible to others",
      })
    } catch (error) {
      console.error("Error updating privacy settings:", error)
      toast({
        title: "Error",
        description: "Failed to update privacy settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPrivacyLoading(false)
    }
  }

  // Only show the manager if the user is viewing their own profile
  if (!user || user.uid !== userId) {
    return null
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between py-2">
          <CardTitle className="text-md">Activity Management</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClearAllActivities}>
                <Trash className="h-4 w-4 mr-2" />
                Clear All Activities
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="privacy-toggle">Activity Privacy</Label>
              <p className="text-xs text-muted-foreground">
                {activitiesPrivate
                  ? "Your activities are private and only visible to you"
                  : "Your activities are public and visible to others"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {activitiesPrivate ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <Switch
                id="privacy-toggle"
                checked={activitiesPrivate}
                onCheckedChange={handleTogglePrivacy}
                disabled={isPrivacyLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
