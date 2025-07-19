"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, MapPin, Globe } from "lucide-react"
import type { UserData } from "@/components/registeration-stepper"

interface PersonalDetailsStepProps {
  userData: UserData
  updateUserData: (data: Partial<UserData>) => void
}

export function PersonalDetailsStep({ userData, updateUserData }: PersonalDetailsStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Tell us about yourself</h2>
        <p className="text-muted-foreground">Help others get to know you better</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="dateOfBirth"
              type="date"
              value={userData.dateOfBirth}
              onChange={(e) => updateUserData({ dateOfBirth: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us a bit about yourself..."
            value={userData.bio}
            onChange={(e) => updateUserData({ bio: e.target.value })}
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              placeholder="City, Country"
              value={userData.location}
              onChange={(e) => updateUserData({ location: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="website"
              type="url"
              placeholder="https://yourwebsite.com"
              value={userData.website}
              onChange={(e) => updateUserData({ website: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
