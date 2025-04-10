"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MoreHorizontal, Reply, Pin, Copy, Trash, Smile } from "lucide-react"
import type { ChatMessage } from "@/lib/types"
import { ReactionSelector } from "./reaction-selector"

interface MessageActionsProps {
  message: ChatMessage
  isPinned: boolean
  userReaction?: string
  onReply: () => void
  onPin: () => void
  onCopy: () => void
  onDelete: () => void
  onReact: (reaction: string) => void
  onRemoveReaction: () => void
}

export function MessageActions({
  message,
  isPinned,
  userReaction,
  onReply,
  onPin,
  onCopy,
  onDelete,
  onReact,
  onRemoveReaction,
}: MessageActionsProps) {
  return (
    <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReply}>
        <Reply className="h-3.5 w-3.5" />
      </Button>

      <Button variant={isPinned ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={onPin}>
        <Pin className="h-3.5 w-3.5" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant={userReaction ? "default" : "ghost"} size="icon" className="h-7 w-7">
            <Smile className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="center">
          <ReactionSelector
            onSelectReaction={onReact}
            onRemoveReaction={onRemoveReaction}
            currentReaction={userReaction}
          />
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-red-500">
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
