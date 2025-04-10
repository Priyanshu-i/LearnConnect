"use client"

import { useEffect, useState } from "react"
import { PostCard } from "@/components/post-card"
import { useAuth } from "@/lib/hooks/use-auth"
import { collection, getDocs, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Post } from "@/lib/types"

export function PostFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    async function fetchPosts() {
      try {
        const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"))

        const querySnapshot = await getDocs(postsQuery)
        const fetchedPosts: Post[] = []

        querySnapshot.forEach((doc) => {
          fetchedPosts.push({
            id: doc.id,
            ...(doc.data() as Omit<Post, "id">),
          })
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

  if (loading) return null // Using Suspense fallback instead

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium mb-2">No posts yet</h3>
        <p className="text-muted-foreground">Be the first to share your knowledge!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUser={user} />
      ))}
    </div>
  )
}
