"use client"

import { useState } from "react"
import { User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfileDialog } from "./profile-dialog"

export function ProfileButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="rounded-full"
        aria-label="Open profile settings"
      >
        <User className="h-5 w-5" />
      </Button>
      <ProfileDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
