"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash, MoreHorizontal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/hooks/use-auth"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ActivityManagerProps {
  userId: string
  onActivityDeleted?: () => void
}

export function ActivityManager({ userId, onActivityDeleted }: ActivityManagerProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

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
          <p className="text-sm text-muted-foreground"></p>
        </CardContent>
      </Card>
    </>
  )
}
