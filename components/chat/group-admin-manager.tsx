"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react"
import { ref, update, child, onValue, off } from "firebase/database"
import { rtdb } from "@/lib/firebase"
import type { ChatGroup, UserProfile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface GroupAdminManagerProps {
  group: ChatGroup
  members: UserProfile[]
  onGroupUpdated: () => void
}

export function GroupAdminManager({ group, members, onGroupUpdated }: GroupAdminManagerProps) {
  const [admins, setAdmins] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!group?.id) return
    const adminsRef = ref(rtdb, `chatGroups/${group.id}/admins`)
    onValue(adminsRef, (snapshot) => {
      const adminData = snapshot.val() || {}
      let adminList: string[] = []

      // Handle both array and object formats for admins
      if (Array.isArray(adminData)) {
        adminList = adminData
      } else {
        // Convert object format { "uid": true } to ["uid"]
        adminList = Object.keys(adminData).filter((key) => adminData[key] === true)
      }

      setAdmins(adminList)
      setLoading(false)
    })
    return () => off(adminsRef)
  }, [group?.id])

  if (authLoading || !user) {
    return <div>Loading user data...</div>
  }

  if (!group || !group.id) {
    return <div>Loading group data...</div>
  }

  // Update isCurrentUserAdmin check to use Object.keys
  const isCurrentUserAdmin = group.createdBy === user.uid || admins.includes(user.uid)
  const isCurrentUserCreator = group.createdBy === user.uid

  // Update the handleToggleAdmin function to allow any admin to add new admins
  const handleToggleAdmin = async (memberId: string) => {
    if (!isCurrentUserAdmin) {
      toast({
        title: "Permission denied",
        description: "Only admins can manage other admins",
        variant: "destructive",
      })
      return
    }

    if (memberId === group.createdBy) {
      toast({
        title: "Cannot modify creator",
        description: "The group creator is always an admin",
        variant: "destructive",
      })
      return
    }

    // Check if we're trying to add or remove an admin
    const isAdmin = admins.includes(memberId)

    // Only creator can remove admins, but any admin can add new admins
    if (isAdmin && !isCurrentUserCreator) {
      toast({
        title: "Permission denied",
        description: "Only the group creator can remove admins",
        variant: "destructive",
      })
      return
    }

    try {
      const groupRef = ref(rtdb, `chatGroups/${group.id}`)

      let updatedAdmins: string[] = [...admins]

      if (isAdmin) {
        updatedAdmins = updatedAdmins.filter((adminId) => adminId !== memberId)
      } else {
        updatedAdmins = [...updatedAdmins, memberId]
      }

      await update(groupRef, {
        admins: updatedAdmins,
        updatedAt: Date.now(),
      })

      // Add system message
      const messagesRef = ref(rtdb, `groupChats/${group.id}/messages`)
      const newMessageRef = child(messagesRef, Date.now().toString())
      const targetMember = members.find((m) => m.id === memberId)
      const memberName = targetMember ? targetMember.displayName : "Unknown Member"

      await update(newMessageRef, {
        content: `${user.displayName} ${isAdmin ? "removed" : "added"} ${memberName} ${isAdmin ? "from" : "as"} admin`,
        senderId: "system",
        senderName: "System",
        timestamp: Date.now(),
      })

      toast({
        title: isAdmin ? "Admin removed" : "Admin added",
        description: isAdmin ? `${memberName} is no longer an admin` : `${memberName} is now an admin`,
      })

      onGroupUpdated()
    } catch (error: any) {
      console.error("Error updating admin status:", error.message)
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-md"></div>
          ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Group Admins</h3>
        {!isCurrentUserAdmin && (
          <div className="text-xs text-muted-foreground">Only admins can manage other admins</div>
        )}
      </div>

      <ScrollArea className="h-[300px] pr-4">
        {members.map((member) => {
          const isAdmin = member.id === group.createdBy || admins.includes(member.id)
          const isCreator = member.id === group.createdBy

          return (
            <div key={member.id} className="flex items-center justify-between p-2 border rounded-md mb-2">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={member.photoURL || ""} />
                  <AvatarFallback>{member.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.displayName}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isCreator ? (
                  <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    <ShieldAlert className="h-3 w-3" />
                    Creator
                  </div>
                ) : isAdmin ? (
                  <>
                    <div className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full">
                      <ShieldCheck className="h-3 w-3" />
                      Admin
                    </div>
                    {isCurrentUserCreator && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleAdmin(member.id)}
                        disabled={!isCurrentUserAdmin}
                      >
                        <ShieldX className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleAdmin(member.id)}
                    disabled={!isCurrentUserAdmin}
                  >
                    <Shield className="h-4 w-4 text-blue-500" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </ScrollArea>
    </div>
  )
}