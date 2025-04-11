"use client"

export function DateSeparator({ date }: { date: Date }) {
  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }
  }

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">{formatDate(date)}</div>
    </div>
  )
}
