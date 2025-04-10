import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { PostFeed } from "@/components/post-feed"
import { LoadingPosts } from "@/components/loading-posts"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Navbar />
      <Hero />
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6 text-center">Latest Learning Posts</h2>
        <Suspense fallback={<LoadingPosts />}>
          <PostFeed />
        </Suspense>
      </div>
    </main>
  )
}
