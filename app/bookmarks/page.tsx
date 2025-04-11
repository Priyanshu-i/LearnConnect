"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { PostCard } from "@/components/post-card"
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Post } from "@/lib/types"
import { BookmarkX } from "lucide-react"

export default function BookmarksPage() {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/")
      return
    }

    async function fetchBookmarkedPosts() {
      try {
        setLoading(true)

        // Get all bookmarks
        if (!user) return;
        const bookmarksQuery = query(collection(db, "users", user.uid, "bookmarks"), orderBy("createdAt", "desc"))

        const bookmarksSnapshot = await getDocs(bookmarksQuery)
        const bookmarks = bookmarksSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Fetch the actual posts
        const posts: Post[] = []

        for (const bookmark of bookmarks) {
          const postRef = doc(db, "posts", bookmark.id)
          const postDoc = await getDoc(postRef)

          if (postDoc.exists()) {
            posts.push({
              id: postDoc.id,
              ...(postDoc.data() as Omit<Post, "id">),
            })
          }
        }

        setBookmarkedPosts(posts)
      } catch (error) {
        console.error("Error fetching bookmarked posts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookmarkedPosts()
  }, [user, router])

  if (!user) {
    return null // Redirecting in useEffect
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Bookmarks</h1>

          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Bookmarks</TabsTrigger>
              <TabsTrigger value="recent">Recently Added</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              ) : bookmarkedPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bookmarkedPosts.map((post) => (
                    <PostCard key={post.id} post={post} currentUser={user} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookmarkX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">No bookmarks yet</h3>
                  <p className="text-muted-foreground mb-6">Save posts to view them later</p>
                  <Button onClick={() => router.push("/")}>Browse Posts</Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="recent">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              ) : bookmarkedPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bookmarkedPosts.slice(0, 10).map((post) => (
                    <PostCard key={post.id} post={post} currentUser={user} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookmarkX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">No bookmarks yet</h3>
                  <p className="text-muted-foreground mb-6">Save posts to view them later</p>
                  <Button onClick={() => router.push("/")}>Browse Posts</Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
