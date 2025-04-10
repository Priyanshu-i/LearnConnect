"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { Navbar } from "@/components/navbar"
import { ChatInterface } from "@/components/chat/chat-interface"

export default function ChatPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/")
    }
  }, [user, router])

  if (!user) {
    return null // Redirecting in useEffect
  }

  return (
    <>
      <Navbar />
      <ChatInterface />
    </>
  )
}
