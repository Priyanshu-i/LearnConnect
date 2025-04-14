"use client"

import { useEffect, useState } from "react"
import { PostCard } from "@/components/post-card"
import { useAuth } from "@/lib/hooks/use-auth"
import { collection, getDocs, orderBy, query, where, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Post } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { LoadingPosts } from "@/components/loading-posts"

export function PostFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [postsPerPage, setPostsPerPage] = useState(6)
  const { user } = useAuth()

  useEffect(() => {
    async function fetchPosts() {
      try {
        const now = Timestamp.now()

        // Query posts with either expiresAt == null OR expiresAt > now
        const postsQuery = query(
          collection(db, "posts"),
          // Use a single where clause with an OR condition if needed, or fetch all and filter
          orderBy("createdAt", "desc")
        )

        const querySnapshot = await getDocs(postsQuery)
        const fetchedPosts: Post[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Post, "id">
          // Filter posts that are either not expired or have no expiration
          if (!data.expiresAt || data.expiresAt > now) {
            fetchedPosts.push({
              id: doc.id,
              ...data,
            })
          }
        })

        setPosts(fetchedPosts)
      } catch (error) {
        console.error("Error fetching posts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  useEffect(() => {
    // Update displayed posts when total posts or postsPerPage changes
    setDisplayedPosts(posts.slice(0, postsPerPage))
  }, [posts, postsPerPage])

  const handleLoadMore = () => {
    setPostsPerPage((prev) => prev + 3)
  }

  if (loading) return <LoadingPosts />

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium mb-2">No posts yet</h3>
        <p className="text-muted-foreground">Be the first to share your knowledge!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedPosts.map((post) => (
          <PostCard key={post.id} post={post} currentUser={user} />
        ))}
      </div>

      {posts.length > displayedPosts.length && (
        <div className="flex justify-center mt-6">
          <Button onClick={handleLoadMore} variant="outline" className="gap-2">
            <ChevronDown className="h-4 w-4" />
            View More
          </Button>
        </div>
      )}
    </div>
  )
}