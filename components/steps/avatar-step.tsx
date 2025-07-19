"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Shuffle } from "lucide-react"
import type { UserData } from "@/components/registeration-stepper"

interface AvatarStepProps {
  userData: UserData
  updateUserData: (data: Partial<UserData>) => void
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

export function AvatarStep({ userData, updateUserData }: AvatarStepProps) {
  const [selectedStyle, setSelectedStyle] = useState("adventurer")
  const [seed, setSeed] = useState(userData.username || "default")
  const [avatarOptions, setAvatarOptions] = useState<string[]>([])

  useEffect(() => {
    generateAvatarOptions()
  }, [selectedStyle, userData.username])

  const generateAvatarOptions = () => {
    const seeds = [
      userData.username || "default",
      `${userData.firstName}${userData.lastName}`,
      `user${Math.random().toString(36).substr(2, 9)}`,
      `avatar${Math.random().toString(36).substr(2, 9)}`,
      `${selectedStyle}${Math.random().toString(36).substr(2, 9)}`,
      `random${Math.random().toString(36).substr(2, 9)}`,
    ]

    const options = seeds.map((s) => `https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${s}&size=120`)
    setAvatarOptions(options)
  }

  const selectAvatar = (avatarUrl: string) => {
    updateUserData({ photoURL: avatarUrl })
  }

  const generateNewOptions = () => {
    generateAvatarOptions()
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Choose your avatar</h2>
        <p className="text-muted-foreground">Pick an avatar that represents you</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Avatar Style</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {avatarStyles.map((style) => (
              <Button
                key={style}
                variant={selectedStyle === style ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStyle(style)}
                className="text-xs capitalize"
              >
                {style.replace("-", " ")}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Choose Avatar</Label>
          <Button variant="outline" size="sm" onClick={generateNewOptions}>
            <Shuffle className="h-4 w-4 mr-2" />
            Generate New
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {avatarOptions.map((avatarUrl, index) => (
            <Card
              key={index}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                userData.photoURL === avatarUrl ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => selectAvatar(avatarUrl)}
            >
              <div className="flex justify-center">
                <img
                  src={avatarUrl || "/placeholder.svg"}
                  alt={`Avatar option ${index + 1}`}
                  className="w-20 h-20 rounded-full"
                />
              </div>
            </Card>
          ))}
        </div>

        {userData.photoURL && (
          <div className="text-center">
            <Label className="text-sm font-medium">Selected Avatar</Label>
            <div className="flex justify-center mt-2">
              <img
                src={userData.photoURL || "/placeholder.svg"}
                alt="Selected avatar"
                className="w-24 h-24 rounded-full border-2 border-primary"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
