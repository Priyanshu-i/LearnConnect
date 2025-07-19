"use client"

/*

            function removeUndefined(obj: Record<string, any>) {
                return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
            }

            await setDoc(doc(db, "users", userCredential.user.uid), {
                ...removeUndefined(userData),
                uid: userCredential.user.uid,
            });

            
*/
import { useEffect, useState } from "react"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, ThumbsUp, FileText, Clock } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface Activity {
  id: string
  type: "post" | "comment" | "like" | "message"
  targetId: string
  content?: string
  timestamp: number
}

interface UserActivityProps {
  userId: string
}

export function UserActivity({ userId }: UserActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserActivity() {
      try {
        setLoading(true)
        const activitiesQuery = query(
          collection(db, "users", userId, "activity"),
          orderBy("timestamp", "desc"),
          limit(20),
        )

        const querySnapshot = await getDocs(activitiesQuery)
        const activityList: Activity[] = []

        querySnapshot.forEach((doc) => {
          activityList.push({
            id: doc.id,
            ...(doc.data() as Omit<Activity, "id">),
          })
        })

        setActivities(activityList)
      } catch (error) {
        console.error("Error fetching user activity:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserActivity()
  }, [userId])

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    )
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "post":
        return <FileText className="h-5 w-5" />
      case "comment":
        return <MessageSquare className="h-5 w-5" />
      case "like":
        return <ThumbsUp className="h-5 w-5" />
      case "message":
        return <MessageSquare className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case "post":
        return (
          <>
            Created a new post:{" "}
            <Link href={`/post/${activity.targetId}`} className="font-medium hover:underline">
              {activity.content}
            </Link>
          </>
        )
      case "comment":
        return (
          <>
            Commented on a{" "}
            <Link href={`/post/${activity.targetId}`} className="font-medium hover:underline">
              post
            </Link>
          </>
        )
      case "like":
        return (
          <>
            Liked a{" "}
            <Link href={`/post/${activity.targetId}`} className="font-medium hover:underline">
              post
            </Link>
          </>
        )
      case "message":
        return "Sent a message"
      default:
        return "Unknown activity"
    }
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <Card key={activity.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-muted p-2 rounded-full">{getActivityIcon(activity.type)}</div>
              <div className="flex-1">
                <p>{getActivityText(activity)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
