import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface FollowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const FollowingModal: React.FC<FollowingModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchFollowing() {
      if (!isOpen) return;
      setLoading(true);
      try {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const followingIds = userData.following || [];

          const followingData: User[] = [];
          for (const id of followingIds) {
            const followingDocRef = doc(db, "users", id);
            const followingDoc = await getDoc(followingDocRef);
            if (followingDoc.exists()) {
              followingData.push({
                uid: id,
                ...(followingDoc.data() as Omit<User, "uid">),
              });
            }
          }
          setFollowingUsers(followingData);
        }
      } catch (error) {
        console.error("Error fetching following users:", error);
        toast({
          title: "Error",
          description: "Failed to load following list",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchFollowing();
  }, [isOpen, userId, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Following</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p>Loading...</p>
        ) : followingUsers.length > 0 ? (
          <div className="space-y-4">
            {followingUsers.map((user) => (
              <div key={user.uid} className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback>
                    {user.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No users followed yet.</p>
        )}
        <Button onClick={onClose} className="mt-4">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};