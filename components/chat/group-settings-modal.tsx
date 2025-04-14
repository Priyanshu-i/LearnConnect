"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Ban, LogOut, Plus, Trash, UserPlus, X } from "lucide-react"
import { ref, get, update, remove, child, onValue, off, set } from "firebase/database"
import { rtdb, db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import type { ChatGroup, UserProfile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { GroupAdminManager } from "@/components/chat/group-admin-manager"

interface GroupSettingsModalProps {
  group: ChatGroup | null
  isOpen: boolean
  onClose: () => void
  onGroupUpdated: () => void
}

export function GroupSettingsModal({ group, isOpen, onClose, onGroupUpdated }: GroupSettingsModalProps) {
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [groupMembers, setGroupMembers] = useState<UserProfile[]>([])
  const [nonMembers, setNonMembers] = useState<UserProfile[]>([])
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([])
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [blockedMembers, setBlockedMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [admins, setAdmins] = useState<string[]>([])
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (group) {
      setGroupName(group.name)
      setGroupDescription(group.description || "")
      setBlockedMembers(group.blockedMembers || [])
      fetchGroupData()

      // Listen for admin changes
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
      })

      return () => {
        off(adminsRef)
      }
    }
  }, [group])

  const isUserAdmin = (userId: string): boolean => {
    if (!group) return false

    // Check if user is the creator
    if (group.createdBy === userId) return true

    // Check if user is in admins array
    return admins.includes(userId)
  }

  const fetchGroupData = async () => {
    if (!group || !user) return

    try {
      setLoading(true)

      // Get all users
      const usersCollection = collection(db, "users")
      const usersSnapshot = await getDocs(usersCollection)
      const usersList: UserProfile[] = []

      usersSnapshot.forEach((doc) => {
        const userData = doc.data() as UserProfile
        usersList.push({
          id: doc.id,
          displayName: userData.displayName || "Anonymous User",
          email: userData.email || "",
          photoURL: userData.photoURL || "",
          createdAt: userData.createdAt || Date.now(),
        })
      })

      setAllUsers(usersList)

      // Get group members
      const members = usersList.filter((u) => group.members.includes(u.id))
      setGroupMembers(members)

      // Get non-members
      const nonMembers = usersList.filter((u) => !group.members.includes(u.id) && u.id !== user.uid)
      setNonMembers(nonMembers)

      setLoading(false)
    } catch (error) {
      console.error("Error fetching group data:", error)
      toast({
        title: "Error",
        description: "Failed to load group information",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const handleUpdateGroup = async () => {
    if (!group || !user) return

    // Check if user is admin or creator
    if (!isUserAdmin(user.uid)) {
      toast({
        title: "Permission denied",
        description: "Only group admins can update group information",
        variant: "destructive",
      })
      return
    }

    try {
      const groupRef = ref(rtdb, `chatGroups/${group.id}`)

      await update(groupRef, {
        name: groupName,
        description: groupDescription,
        updatedAt: Date.now(),
        blockedMembers: blockedMembers,
      })

      // Add system message about group update
      const messagesRef = ref(rtdb, `groupChats/${group.id}/messages`)
      const newMessageRef = child(messagesRef, Date.now().toString())
      await update(newMessageRef, {
        content: `${user.displayName} updated the group info`,
        senderId: "system",
        senderName: "System",
        timestamp: Date.now(),
      })

      toast({
        title: "Group updated",
        description: "Group information has been updated successfully.",
      })

      onGroupUpdated()
      onClose()
    } catch (error) {
      console.error("Error updating group:", error)
      toast({
        title: "Error",
        description: "Failed to update group information",
        variant: "destructive",
      })
    }
  }

  const handleAddMembers = async () => {
    if (!group || !user || selectedNewMembers.length === 0) return

    // Check if user is admin
    if (!isUserAdmin(user.uid)) {
      toast({
        title: "Permission denied",
        description: "Only group admins can add members",
        variant: "destructive",
      })
      return
    }

    try {
      const groupRef = ref(rtdb, `chatGroups/${group.id}`)
      const snapshot = await get(groupRef)
      const groupData = snapshot.val()

      if (!groupData) {
        throw new Error("Group not found")
      }

      const currentMembers = Array.isArray(group.members) ? group.members : []
const updatedMembers = [...currentMembers, ...selectedNewMembers]


      await update(groupRef, {
        members: updatedMembers,
        updatedAt: Date.now(),
      })

      // Add system message about new members
      const messagesRef = ref(rtdb, `groupChats/${group.id}/messages`)
      const newMessageRef = child(messagesRef, Date.now().toString())

      const newMemberNames = selectedNewMembers
        .map((id) => {
          const member = allUsers.find((u) => u.id === id)
          return member ? member.displayName : "Unknown user"
        })
        .join(", ")

      await update(newMessageRef, {
        content: `${user.displayName} added ${newMemberNames} to the group`,
        senderId: "system",
        senderName: "System",
        timestamp: Date.now(),
      })

      toast({
        title: "Members added",
        description: `Added ${selectedNewMembers.length} new members to the group`,
      })

      setSelectedNewMembers([])
      setIsAddingMembers(false)
      onGroupUpdated()
      fetchGroupData()
    } catch (error) {
      console.error("Error adding members:", error)
      toast({
        title: "Error",
        description: "Failed to add members to the group",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!group || !user) return

    // Check if user is admin
    if (!isUserAdmin(user.uid)) {
      toast({
        title: "Permission denied",
        description: "Only group admins can remove members",
        variant: "destructive",
      })
      return
    }

    // Prevent admins from removing the creator
    if (memberId === group.createdBy && user.uid !== group.createdBy) {
      toast({
        title: "Permission denied",
        description: "You cannot remove the group creator",
        variant: "destructive",
      })
      return
    }

    // Prevent non-creator admins from removing other admins
    if (admins.includes(memberId) && user.uid !== group.createdBy) {
      toast({
        title: "Permission denied",
        description: "Only the group creator can remove admins",
        variant: "destructive",
      })
      return
    }

    try {
      const groupRef = ref(rtdb, `chatGroups/${group.id}`)
      const updatedMembers = group.members.filter((id) => id !== memberId)

      // Initialize updatedAdmins from group.admins in object format
      let updatedAdmins: Record<string, boolean> = {};
      if (Array.isArray(admins)) {
        for (const id of admins) {
          updatedAdmins[id] = true;
        }
      } else {
        updatedAdmins = {};
      }
      

// Now safely remove the member from updatedAdmins if they exist
if (updatedAdmins[memberId]) {
  delete updatedAdmins[memberId];
}



      await update(groupRef, {
        members: updatedMembers,
        admins: updatedAdmins,
        updatedAt: Date.now(),
      })

      // Add system message about removed member
      const messagesRef = ref(rtdb, `groupChats/${group.id}/messages`)
      const newMessageRef = child(messagesRef, Date.now().toString())

      const removedMember = allUsers.find((u) => u.id === memberId)
      const memberName = removedMember ? removedMember.displayName : "a member"

      await set(newMessageRef, {
        content: `${user.displayName} removed ${memberName} from the group`,
        senderId: "system",
        senderName: "System",
        timestamp: Date.now(),
      })
      

      toast({
        title: "Member removed",
        description: "The member has been removed from the group",
      })

      await fetchGroupData()
      onGroupUpdated()
    } catch (error) {
      console.error("Error removing member:", error)
      toast({
        title: "Error",
        description: "Failed to remove member from the group",
        variant: "destructive",
      })
    }
  }

  const handleExitGroup = async () => {
    if (!group || !user) return

    try {
      const groupRef = ref(rtdb, `chatGroups/${group.id}`)

      // If user is the creator and there are other admins, transfer ownership
      if (group.createdBy === user.uid && group.members.length > 1) {
        // First try to find another admin
        if (admins.length > 0) {
          // Transfer to first admin in the list
          const newCreator = admins[0]

          // Create new admin list without the new creator
          const updatedAdmins = {}

          // Convert admins array to object format, excluding the new creator
          admins.forEach((adminId) => {
            if (adminId !== newCreator) {
              (updatedAdmins as Record<string, boolean>)[adminId] = true
            }
          })

          // Update group with new creator and remove from admins
          await update(groupRef, {
            createdBy: newCreator,
            admins: updatedAdmins,
            members: group.members.filter((id) => id !== user.uid),
            updatedAt: Date.now(),
          })
        } else {
          // No other admins, find any other member
          const newCreator = group.members.find((id) => id !== user.uid)

          if (newCreator) {
            await update(groupRef, {
              createdBy: newCreator,
              members: group.members.filter((id) => id !== user.uid),
              updatedAt: Date.now(),
            })
          }
        }
      } else if (group.createdBy === user.uid && group.members.length <= 1) {
        // If user is the creator and the only member, delete the group
        await remove(groupRef)

        // Also remove group chat
        const groupChatRef = ref(rtdb, `groupChats/${group.id}`)
        await remove(groupChatRef)

        toast({
          title: "Group deleted",
          description: "You were the only member, so the group has been deleted",
        })

        onGroupUpdated()
        onClose()
        return
      } else {
        // User is not the creator, just remove from members and admins if applicable
        const updatedMembers = group.members.filter((id) => id !== user.uid)

        // Handle admins removal
        let updatedAdmins = group.admins ? { ...group.admins } : {}

        if (Array.isArray(updatedAdmins)) {
          updatedAdmins = updatedAdmins
            .filter((id) => id !== user.uid)
            .reduce((acc, id) => ({ ...acc, [id]: true }), {})
        } else {
          if (user.uid in updatedAdmins) {
            delete updatedAdmins[user.uid]
          }
        }

        await update(groupRef, {
          members: updatedMembers,
          admins: updatedAdmins,
          updatedAt: Date.now(),
        })
      }

      // Add system message about user leaving
      const messagesRef = ref(rtdb, `groupChats/${group.id}/messages`)
      const newMessageRef = child(messagesRef, Date.now().toString())

      await update(newMessageRef, {
        content: `${user.displayName} left the group`,
        senderId: "system",
        senderName: "System",
        timestamp: Date.now(),
      })

      toast({
        title: "Left group",
        description: "You have successfully left the group",
      })

      onGroupUpdated()
      onClose()
    } catch (error) {
      console.error("Error exiting group:", error)
      toast({
        title: "Error",
        description: "Failed to leave the group",
        variant: "destructive",
      })
    }
  }

  const handleDeleteGroup = async () => {
    if (!group || !user) return

    // Only the creator can delete the group
    if (group.createdBy !== user.uid) {
      toast({
        title: "Permission denied",
        description: "Only the group creator can delete the group",
        variant: "destructive",
      })
      return
    }

    try {
      // Delete group
      const groupRef = ref(rtdb, `chatGroups/${group.id}`)
      await remove(groupRef)

      // Delete group chat
      const groupChatRef = ref(rtdb, `groupChats/${group.id}`)
      await remove(groupChatRef)

      toast({
        title: "Group deleted",
        description: "The group has been permanently deleted",
      })

      onGroupUpdated()
      onClose()
    } catch (error) {
      console.error("Error deleting group:", error)
      toast({
        title: "Error",
        description: "Failed to delete the group",
        variant: "destructive",
      })
    }
  }

  const handleToggleBlockMember = async (memberId: string) => {
    if (!group || !user) return

    // Check if user is admin
    if (!isUserAdmin(user.uid)) {
      toast({
        title: "Permission denied",
        description: "Only group admins can block members",
        variant: "destructive",
      })
      return
    }

    // Prevent admins from blocking the creator
    if (memberId === group.createdBy && user.uid !== group.createdBy) {
      toast({
        title: "Permission denied",
        description: "You cannot block the group creator",
        variant: "destructive",
      })
      return
    }

    // Prevent non-creator admins from blocking other admins
    if (admins.includes(memberId) && user.uid !== group.createdBy) {
      toast({
        title: "Permission denied",
        description: "Only the group creator can block admins",
        variant: "destructive",
      })
      return
    }

    try {
      const isBlocked = blockedMembers.includes(memberId)
      let updatedBlockedMembers: string[]

      if (isBlocked) {
        // Unblock
        updatedBlockedMembers = blockedMembers.filter((id) => id !== memberId)
      } else {
        // Block
        updatedBlockedMembers = [...blockedMembers, memberId]
      }

      setBlockedMembers(updatedBlockedMembers)

      const groupRef = ref(rtdb, `chatGroups/${group.id}`)
      await update(groupRef, {
        blockedMembers: updatedBlockedMembers,
        updatedAt: Date.now(),
      })

      // Add system message about blocked/unblocked member
      const messagesRef = ref(rtdb, `groupChats/${group.id}/messages`)
      const newMessageRef = child(messagesRef, Date.now().toString())

      const targetMember = allUsers.find((u) => u.id === memberId)
      const memberName = targetMember ? targetMember.displayName : "a member"

      await update(newMessageRef, {
        content: `${user.displayName} ${isBlocked ? "unblocked" : "blocked"} ${memberName}`,
        senderId: "system",
        senderName: "System",
        timestamp: Date.now(),
      })

      toast({
        title: isBlocked ? "Member unblocked" : "Member blocked",
        description: isBlocked
          ? "The member can now send messages in the group"
          : "The member can no longer send messages in the group",
      })
    } catch (error) {
      console.error("Error toggling block status:", error)
      toast({
        title: "Error",
        description: "Failed to update member block status",
        variant: "destructive",
      })
    }
  }

  // Check if current user is an admin
  const isAdmin = user && group ? isUserAdmin(user.uid) : false

  if (!group) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Group Settings</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="members">Members ({groupMembers.length})</TabsTrigger>
              <TabsTrigger value="admins">Admins</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="flex-1 overflow-auto">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="group-name">Group Name</label>
                  <Input
                    id="group-name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="group-description">Group Description</label>
                  <Textarea
                    id="group-description"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Add a group description"
                    rows={3}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <label>Created By</label>
                  {loading ? (
                    <div className="h-10 bg-muted animate-pulse rounded-md"></div>
                  ) : (
                    <div className="flex items-center p-2 border rounded-md">
                      {groupMembers.map((member) => {
                        if (member.id === group.createdBy) {
                          return (
                            <div key={member.id} className="flex items-center">
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={member.photoURL || ""} />
                                <AvatarFallback>{member.displayName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{member.displayName}</span>
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label>Created On</label>
                  <div className="p-2 border rounded-md">{new Date(group.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={handleUpdateGroup} disabled={!isAdmin}>
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="members" className="flex-1 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Group Members</h3>
                <Button size="sm" variant="outline" onClick={() => setIsAddingMembers(true)} disabled={!isAdmin}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Members
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {loading
                    ? Array(3)
                        .fill(0)
                        .map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-md"></div>)
                    : groupMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-2 border rounded-md">
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

                          {isAdmin && member.id !== user?.uid && member.id !== group.createdBy && (
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleToggleBlockMember(member.id)}
                                className={blockedMembers.includes(member.id) ? "text-amber-500" : ""}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}

                          {member.id === group.createdBy && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Creator</span>
                          )}

                          {member.id !== group.createdBy && admins.includes(member.id) && (
                            <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full">Admin</span>
                          )}
                        </div>
                      ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="admins" className="flex-1 overflow-auto">
              <GroupAdminManager group={group} members={groupMembers} onGroupUpdated={onGroupUpdated} />
            </TabsContent>

            <TabsContent value="settings" className="flex-1 overflow-auto">
              <div className="space-y-4 py-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-amber-500"
                  onClick={() => setIsExitDialogOpen(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Exit Group
                </Button>

                {group.createdBy === user?.uid && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-500"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Group
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
      <Dialog open={isAddingMembers} onOpenChange={setIsAddingMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Members</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <ScrollArea className="h-[300px] pr-4">
              {nonMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No users available to add</p>
              ) : (
                nonMembers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedNewMembers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedNewMembers([...selectedNewMembers, user.id])
                        } else {
                          setSelectedNewMembers(selectedNewMembers.filter((id) => id !== user.id))
                        }
                      }}
                    />
                    <label htmlFor={`user-${user.id}`} className="flex items-center cursor-pointer">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={user.photoURL || ""} />
                        <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </label>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddingMembers(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMembers} disabled={selectedNewMembers.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add {selectedNewMembers.length} Members
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Group Confirmation */}
      <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit this group?{" "}
              {group.createdBy === user?.uid && "As the creator, if you leave, another member will become the admin."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExitGroup}>Exit Group</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This action cannot be undone and all group messages will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-red-500 hover:bg-red-600">
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
