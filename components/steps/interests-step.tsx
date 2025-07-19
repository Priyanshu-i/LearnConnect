"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"
import type { UserData } from "@/components/registration-stepper"

interface InterestsStepProps {
  userData: UserData
  updateUserData: (data: Partial<UserData>) => void
}

const popularInterests = [
  "Technology",
  "Music",
  "Art",
  "Sports",
  "Travel",
  "Food",
  "Photography",
  "Gaming",
  "Books",
  "Movies",
  "Fitness",
  "Fashion",
  "Science",
  "Nature",
  "Business",
  "Design",
  "Cooking",
  "Dancing",
  "Writing",
  "Programming",
]

export function InterestsStep({ userData, updateUserData }: InterestsStepProps) {
  const [customInterest, setCustomInterest] = useState("")

  const toggleInterest = (interest: string) => {
    const currentInterests = userData.interests || []
    const updatedInterests = currentInterests.includes(interest)
      ? currentInterests.filter((i) => i !== interest)
      : [...currentInterests, interest]

    updateUserData({ interests: updatedInterests })
  }

  const addCustomInterest = () => {
    if (customInterest.trim() && !userData.interests.includes(customInterest.trim())) {
      updateUserData({ interests: [...userData.interests, customInterest.trim()] })
      setCustomInterest("")
    }
  }

  const removeInterest = (interest: string) => {
    updateUserData({ interests: userData.interests.filter((i) => i !== interest) })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">What are you interested in?</h2>
        <p className="text-muted-foreground">Select topics you'd like to see and discuss</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Popular Interests</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {popularInterests.map((interest) => (
              <Badge
                key={interest}
                variant={userData.interests.includes(interest) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customInterest">Add Custom Interest</Label>
          <div className="flex gap-2">
            <Input
              id="customInterest"
              placeholder="Type your interest..."
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addCustomInterest()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addCustomInterest}
              disabled={!customInterest.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {userData.interests.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Your Selected Interests</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {userData.interests.map((interest) => (
                <Badge key={interest} variant="default" className="pr-1">
                  {interest}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 ml-1 hover:bg-transparent"
                    onClick={() => removeInterest(interest)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
