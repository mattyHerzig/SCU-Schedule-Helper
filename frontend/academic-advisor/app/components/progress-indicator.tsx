"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface StatusUpdate {
  id: string
  content: string
  timestamp: Date
}

interface ProgressIndicatorProps {
  statusUpdates: StatusUpdate[]
}

export function ProgressIndicator({ statusUpdates }: ProgressIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current && statusUpdates.length > 0) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [statusUpdates])

  if (statusUpdates.length === 0) {
    return null
  }

  return (
    <div ref={containerRef} className="w-64 border-l border-gray-200 bg-gray-50 overflow-y-auto flex flex-col pb-24">
      <div className="p-4">
        <h3 className="font-semibold mb-4" style={{ color: "#802a25" }}>
          Status Updates
        </h3>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Status updates */}
          <div className="space-y-4">
            {statusUpdates.map((update, index) => (
              <div key={update.id} className="relative pl-7">
                {/* Circle marker */}
                <div
                  className={cn(
                    "absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white",
                    index === statusUpdates.length - 1 ? "bg-[#802a25]" : "bg-gray-300",
                  )}
                />

                {/* Status content */}
                <div className="text-sm">
                  <p className="font-medium">{update.content}</p>
                  <p className="text-xs text-gray-500">
                    {update.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
