"use client"

import { useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"

interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
  message?: string
}

export function SignInModal({ isOpen, onClose, message }: SignInModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn()
      onClose()
    } catch (error) {
      console.error("Error signing in:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in required</DialogTitle>
          <DialogDescription>{message || "You need to sign in to access this feature."}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <LogIn className="h-12 w-12 text-primary opacity-80" />
          <p className="text-center text-sm text-muted-foreground">
            Join LearnConnect to connect with others, share knowledge, and access all features.
          </p>
        </div>

        <div className="flex justify-center">
          <Button onClick={handleSignIn} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
