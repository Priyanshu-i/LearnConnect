"use client"

import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function Hero() {
  const { user, signIn } = useAuth()

  return (
    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Connect, Learn, and Grow Together</h1>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Join our community of learners, share your knowledge, and engage in real-time discussions.
        </p>
        <div className="flex justify-center gap-4">
          {user ? (
            <Link href="/create-post">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                Create a Post
              </Button>
            </Link>
          ) : (
            <Button size="lg" onClick={signIn} className="bg-white text-purple-600 hover:bg-gray-100">
              Get Started
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
