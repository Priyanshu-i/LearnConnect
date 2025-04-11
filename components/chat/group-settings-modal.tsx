"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { ref, get, update, remove, child } from "firebase/database"
import { rtdb, db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import type { ChatGroup, UserProfile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

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
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (group) {
      setGroupName(group.name)
      setGroupDescription(group.description || "")
      setBlockedMembers(group.blockedMembers || [])
      fetchGroupData()
    }
  }, [group])

  const fetchGroupData = async () => {
    if (!group || !user) return

    try {
      setLoading(true)

      // Fetch all users
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
        description: "Group information has been updated successfully",
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

    try {
      const groupRef = ref(rtdb, `chatGroups/${group.id}`)
      const snapshot = await get(groupRef)
      const groupData = snapshot.val()

      if (!groupData) {
        throw new Error("Group not found")
      }

      const updatedMembers = [...group.members, ...selectedNewMembers]

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

    // Check if user is admin (creator)
    if (group.createdBy !== user.uid) {
      toast({
        title: "Permission denied",
        description: "Only the group creator can remove members",
        variant: "destructive",
      })
      return
    }

    try {
      const groupRef = ref(rtdb, `chatGroups/${group.id}`)
      const updatedMembers = group.members.filter((id) => id !== memberId)

      await update(groupRef, {
        members: updatedMembers,
        updatedAt: Date.now(),
      })

      // Add system message about removed member
      const messagesRef = ref(rtdb, `groupChats/${group.id}/messages`)
      const newMessageRef = child(messagesRef, Date.now().toString())

      const removedMember = allUsers.find((u) => u.id === memberId)
      const memberName = removedMember ? removedMember.displayName : "a member"

      await update(newMessageRef, {
        content: `${user.displayName} removed ${memberName} from the group`,
        senderId: "system",
        senderName: "System",
        timestamp: Date.now(),
      })

      toast({
        title: "Member removed",
        description: "The member has been removed from the group",
      })

      onGroupUpdated()
      fetchGroupData()
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

      // If user is the creator and there are other members, transfer ownership
      if (group.createdBy === user.uid && group.members.length > 1) {
        const newCreator = group.members.find((id) => id !== user.uid)

        if (newCreator) {
          await update(groupRef, {
            createdBy: newCreator,
            members: group.members.filter((id) => id !== user.uid),
            updatedAt: Date.now(),
          })
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
        // User is not the creator, just remove from members
        await update(groupRef, {
          members: group.members.filter((id) => id !== user.uid),
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

    // Check if user is admin (creator)
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

    // Check if user is admin (creator)
    if (group.createdBy !== user.uid) {
      toast({
        title: "Permission denied",
        description: "Only the group creator can block members",
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

  if (!group) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Group Settings</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="members">Members ({groupMembers.length})</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="flex-1 overflow-auto">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group-description">Group Description</Label>
                  <Textarea
                    id="group-description"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Add a group description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Created By</Label>
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
                  <Label>Created On</Label>
                  <div className="p-2 border rounded-md">{new Date(group.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={handleUpdateGroup}>Save Changes</Button>
              </div>
            </TabsContent>

            <TabsContent value="members" className="flex-1 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Group Members</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingMembers(true)}
                  disabled={group.createdBy !== user?.uid}
                >
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

                          {group.createdBy === user?.uid && member.id !== user?.uid && (
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
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Admin</span>
                          )}
                        </div>
                      ))}
                </div>
              </ScrollArea>
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
                    <Label htmlFor={`user-${user.id}`} className="flex items-center cursor-pointer">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={user.photoURL || ""} />
                        <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </Label>
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
