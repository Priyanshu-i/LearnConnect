"use client"

import { Button } from "@/components/ui/button"

interface ReactionSelectorProps {
  onSelectReaction: (reaction: string) => void
  onRemoveReaction: () => void
  currentReaction?: string
}

export function ReactionSelector({ onSelectReaction, onRemoveReaction, currentReaction }: ReactionSelectorProps) {
  const reactions = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"]

  return (
    <div className="flex flex-wrap gap-1 max-w-[200px]">
      {reactions.map((reaction) => (
        <Button
          key={reaction}
          variant={currentReaction === reaction ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            if (currentReaction === reaction) {
              onRemoveReaction()
            } else {
              onSelectReaction(reaction)
            }
          }}
        >
          {reaction}
        </Button>
      ))}
    </div>
  )
}
