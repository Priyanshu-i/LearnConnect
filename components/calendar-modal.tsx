import { useState, useEffect } from "react"
import { format, addDays, subDays, isSameDay, isBefore, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CustomCalendarModalProps {
  selectedDate: Date | null
  onSelect: (date: Date | null) => void
  disabled?: (date: Date) => boolean
}

export function CustomCalendarModal({
    selectedDate,
    onSelect,
    disabled,
  }: CustomCalendarModalProps) {
    const [currentMonth, setCurrentMonth] = useState(
      selectedDate ? new Date(selectedDate) : new Date()
    );
    const [isOpen, setIsOpen] = useState(false);
  
    // Reset current month when modal opens
    useEffect(() => {
      if (isOpen && selectedDate) {
        setCurrentMonth(new Date(selectedDate));
      }
    }, [isOpen, selectedDate]);
  
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
    // Get days to display (including padding for complete weeks)
    const firstDayOfWeek = monthStart.getDay();
    const paddingDaysStart = Array.from({ length: firstDayOfWeek }, (_, i) =>
      subDays(monthStart, firstDayOfWeek - i)
    );
    const allDays = [...paddingDaysStart, ...days];
  
    const goToPreviousMonth = () => {
      setCurrentMonth(subDays(currentMonth, 30));
    };
  
    const goToNextMonth = () => {
      setCurrentMonth(addDays(currentMonth, 30));
    };
  
    const handleDateClick = (day: Date) => {
      if (disabled && disabled(day)) return;
      onSelect(day);
      setIsOpen(false);
    };
  
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <svg
            className="mr-2 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 4h-1V2m0 20v-2h1M5 4h1V2m0 20v-2H5m14-2H5V7h14M9 2v4M15 2v4" />
          </svg>
          {selectedDate ? format(selectedDate, "PPP") : "Select date"}
        </button>
  
        {isOpen && (
          <div
            className="absolute z-50 w-72 rounded-md border border-border bg-background shadow-lg"
            style={{
              bottom: "100%", // Ensure the modal opens above the button
              left: "50%", // Center horizontally with respect to the button
              transform: "translate(-50%, -10px)", // Adjust spacing above the button
              maxWidth: "90vw", // Make it fully visible on mobile devices
              overflow: "auto", // Ensure content doesn't overflow the screen
            }}
          >
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="rounded-full p-1 hover:bg-accent"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm font-medium">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="rounded-full p-1 hover:bg-accent"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
  
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
  
              <div className="mt-2 grid grid-cols-7 gap-1">
                {allDays.map((day) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isDisabled = disabled
                    ? disabled(day)
                    : isBefore(day, new Date()) && !isSameDay(day, new Date());
                  const isOutsideMonth =
                    day < monthStart || day > monthEnd;
  
                  return (
                    <button
                      key={day.toString()}
                      type="button"
                      onClick={() => handleDateClick(day)}
                      disabled={isDisabled}
                      className={cn(
                        "rounded-full p-2 text-sm",
                        isSelected &&
                          "bg-primary text-primary-foreground",
                        isDisabled && "cursor-not-allowed opacity-50",
                        !isSelected &&
                          !isDisabled &&
                          "hover:bg-accent",
                        isOutsideMonth && "text-muted-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
  
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md px-3 py-1 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }