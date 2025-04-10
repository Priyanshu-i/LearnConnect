"use client";

import { useState } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import EditModal from "@/components/EditModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, ThumbsUp, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import type { Post } from "@/lib/types";
import type { User } from "firebase/auth";

interface PostCardProps {
  post: Post;
  currentUser: User | null;
}

export function PostCard({ post, currentUser }: PostCardProps) {
  // Local state for the post data.
  const [postData, setPostData] = useState(post);
  const [likes, setLikes] = useState(post.likes || []);
  const [isLiked, setIsLiked] = useState(currentUser ? likes.includes(currentUser.uid) : false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  // Local state to track deletion status and update the UI immediately.
  const [isDeleted, setIsDeleted] = useState(false);

  const handleLike = async () => {
    if (!currentUser) return;
    try {
      const postRef = doc(db, "posts", postData.id);

      if (isLiked) {
        await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
        setLikes(likes.filter((id) => id !== currentUser.uid));
      } else {
        await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
        setLikes([...likes, currentUser.uid]);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const confirmDelete = async () => {
    try {
      const postRef = doc(db, "posts", postData.id);
      await deleteDoc(postRef);
      // Immediately update the UI by setting isDeleted to true.
      setIsDeleted(true);
      console.log("Post deleted successfully!");
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleDelete = () => {
    if (!currentUser || currentUser.uid !== postData.authorId) return;

    // Use a confirmation dialog for deletion.
    if (window.confirm("Are you sure you want to delete this post?")) {
      confirmDelete();
    }
  };

  const openEditModal = () => {
    if (!currentUser || currentUser.uid !== postData.authorId) return;
    setEditModalOpen(true);
  };

  // After editing, update both Firestore and local state immediately.
  const handleSave = async (updatedPost: { title: string; content: string }) => {
    try {
      const postRef = doc(db, "posts", postData.id);
      await updateDoc(postRef, updatedPost);
      setPostData((prev) => ({ ...prev, ...updatedPost }));
      console.log("Post updated successfully!");
    } catch (error) {
      console.error("Error updating post:", error);
    }
  };

  // If this post has been deleted locally, don't render the card.
  if (isDeleted) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{postData.title}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              {postData.createdAt && (
                <span>
                  {formatDistanceToNow(new Date(postData.createdAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3">{postData.content}</p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex items-center">
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={postData.authorPhotoURL || ""} />
              <AvatarFallback>{postData.authorName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{postData.authorName}</span>
          </div>
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={!currentUser}
              className={isLiked ? "text-purple-500" : ""}
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              <span>{likes.length}</span>
            </Button>
            <Link href={`/post/${postData.id}`}>
              <Button variant="ghost" size="sm">
                <MessageSquare className="h-4 w-4 mr-1" />
                <span>{postData.comments?.length || 0}</span>
              </Button>
            </Link>
            {currentUser?.uid === postData.authorId && (
              <>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500">
                  <Trash2 className="h-4 w-4 mr-1" />
                </Button>
                <Button variant="ghost" size="sm" onClick={openEditModal} className="text-blue-500">
                  <Pencil className="h-4 w-4 mr-1" />
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Edit Modal */}
      <EditModal
        post={postData}
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}