"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserProfile } from "@/lib/types"

interface UserProfileEditorProps {
  profile: UserProfile
  onSave: (updatedProfile: Partial<UserProfile>) => void
}

export function UserProfileEditor({ profile, onSave }: UserProfileEditorProps) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [photoURL, setPhotoURL] = useState(profile.photoURL || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSave({
        displayName,
        photoURL,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="flex justify-center mb-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={photoURL} />
          <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your display name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="photoURL">Profile Photo URL</Label>
        <Input
          id="photoURL"
          value={photoURL}
          onChange={(e) => setPhotoURL(e.target.value)}
          placeholder="https://example.com/photo.jpg"
        />
        <p className="text-xs text-muted-foreground">
          Enter a URL to your profile photo. Leave empty to use your Google profile photo.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting || !displayName.trim()}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
