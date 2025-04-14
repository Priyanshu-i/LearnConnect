"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/hooks/use-auth";
import { Navbar } from "@/components/navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ArrowLeft, Pencil } from "lucide-react";
import { BookmarkButton } from "@/components/bookmark-button";
import { PostReplyButton } from "@/components/post-reply-button";
import { MediaViewer } from "@/components/media-viewer";
import { PostEditModal } from "@/components/post-edit-modal";
import type { Comment, Post } from "@/lib/types";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const isLiked = user && post?.likes.includes(user.uid);

  useEffect(() => {
    async function fetchPost() {
      try {
        const postDoc = await getDoc(doc(db, "posts", id as string));

        if (postDoc.exists()) {
          const postData = postDoc.data();
          setPost({
            id: postDoc.id,
            ...postData,
            createdAt: postData.createdAt?.toDate
              ? postData.createdAt.toDate().getTime()
              : Date.now(), // Fallback to current time
            comments: postData.comments?.map((c: any) => ({
              ...c,
              createdAt: c.createdAt?.toDate
                ? c.createdAt.toDate().getTime()
                : Date.now(),
            })) || [],
          } as Post);
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, [id, router]);

  const handleLike = async () => {
    if (!user || !post) return;

    try {
      const postRef = doc(db, "posts", post.id);

      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid),
        });
        setPost({
          ...post,
          likes: post.likes.filter((id) => id !== user.uid),
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid),
        });
        setPost({
          ...post,
          likes: [...post.likes, user.uid],
        });
      }
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !post || !comment.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const newComment: Comment = {
        id: Date.now().toString(),
        content: comment.trim(),
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        authorPhotoURL: user.photoURL || undefined,
        createdAt: Date.now(),
      };

      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, {
        comments: arrayUnion({
          ...newComment,
          createdAt: Timestamp.fromMillis(newComment.createdAt),
        }),
      });

      setPost({
        ...post,
        comments: [...(post.comments || []), newComment],
      });

      setComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMediaType = (url: string | undefined): "image" | "video" | "pdf" | "gif" | null => {
    if (!url) return null;

    const extension = url.split(".").pop()?.toLowerCase();

    if (extension === "pdf") return "pdf";
    if (extension === "gif") return "gif";
    if (["mp4", "webm", "mov"].includes(extension || "")) return "video";
    if (["jpg", "jpeg", "png", "webp"].includes(extension || "")) return "image";

    return null;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-8"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-8"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Post not found</h2>
          <Button onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </>
    );
  }

  const mediaType = getMediaType(post.mediaURL);
  const handleViewProfile = () => {
    router.push(`/profile/${post.authorId}`);
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" className="mb-4" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="bg-card rounded-lg shadow-sm p-6 mb-8">
            <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
            <div className="flex items-center mb-6">
              <div className="flex items-center gap-2 cursor-pointer" onClick={handleViewProfile}>
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={post.authorPhotoURL || ""} />
                  <AvatarFallback>{post.authorName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              </div>
              <div>
                <p className="text-sm font-medium">{post.authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {typeof post.createdAt === "number" && !isNaN(post.createdAt)
                    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
                    : "Unknown date"}
                </p>
              </div>
            </div>

            <div className="prose dark:prose-invert max-w-none mb-6">
              <p>{post.content}</p>
            </div>

            {post.mediaURL && mediaType && (
              <div className="mb-6">
                <div className="cursor-pointer rounded-md overflow-hidden" onClick={() => setIsMediaViewerOpen(true)}>
                  {mediaType === "image" || mediaType === "gif" ? (
                    <img
                      src={post.mediaURL}
                      alt={post.title}
                      className="w-full max-h-96 object-contain bg-muted"
                    />
                  ) : mediaType === "video" ? (
                    <video src={post.mediaURL} controls className="w-full max-h-96" />
                  ) : mediaType === "pdf" ? (
                    <div className="flex items-center justify-center bg-muted p-8 rounded-md">
                      <div className="text-center">
                        <p className="font-medium mb-2">PDF Document</p>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMediaViewerOpen(true);
                          }}
                        >
                          View PDF
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={!user}
                  className={isLiked ? "text-purple-500" : ""}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  <span>{post.likes.length} likes</span>
                </Button>
                <PostReplyButton post={post} />
              </div>
              <div className="flex items-center gap-2">
                {user?.uid === post.authorId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditModalOpen(true)}
                    title="Edit post"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <BookmarkButton postId={post.id} />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Comments ({post.comments?.length || 0})</h2>

            {user ? (
              <form onSubmit={handleAddComment} className="mb-6">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="mb-2"
                />
                <Button type="submit" disabled={isSubmitting || !comment.trim() || !user}>
                  {isSubmitting ? "Posting..." : "Post Comment"}
                </Button>
              </form>
            ) : (
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <p className="text-center">Please sign in to add a comment.</p>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <Button onClick={() => router.push("/")}>Sign In</Button>
                </CardFooter>
              </Card>
            )}

            {post.comments && post.comments.length > 0 ? (
              <div className="space-y-4">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={comment.authorPhotoURL || ""} />
                        <AvatarFallback>{comment.authorName?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{comment.authorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeof comment.createdAt === "number" && !isNaN(comment.createdAt)
                            ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
                            : "Unknown date"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No comments yet. Be the first to comment!</p>
            )}
          </div>
        </div>
      </div>

      {mediaType && (
        <MediaViewer
          isOpen={isMediaViewerOpen}
          onClose={() => setIsMediaViewerOpen(false)}
          mediaUrl={post.mediaURL || ""}
          mediaType={mediaType}
          title={post.title}
        />
      )}

      <PostEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        post={post}
      />
    </>
  );
}