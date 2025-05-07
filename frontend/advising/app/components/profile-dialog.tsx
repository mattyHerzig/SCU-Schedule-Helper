"use client"

import { useEffect, useState } from "react"
import { X, Check, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Update the UserProfile interface to include courses
interface UserProfile {
  majors: string[]
  minors: string[]
  emphases: string[]
  courses: string[]
}

// Update the ProfileOptions interface to include courses
interface ProfileOptions {
  majors: string[]
  minors: string[]
  emphases: string[]
  courses: string[]
}

// Update the UpdatePayload interface to include courses
interface UpdatePayload {
  majors: {
    add: string[]
    remove: string[]
  }
  minors: {
    add: string[]
    remove: string[]
  }
  emphases: {
    add: string[]
    remove: string[]
  }
  courses: {
    add: string[]
    remove: string[]
  }
}

// Update the initial state for profile and originalProfile to include empty courses array
export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const [profile, setProfile] = useState<UserProfile>({ majors: [], minors: [], emphases: [], courses: [] })
  const [originalProfile, setOriginalProfile] = useState<UserProfile>({
    majors: [],
    minors: [],
    emphases: [],
    courses: [],
  })
  const [options, setOptions] = useState<ProfileOptions>({ majors: [], minors: [], emphases: [], courses: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // For the dropdowns
  const [majorOpen, setMajorOpen] = useState(false)
  const [minorOpen, setMinorOpen] = useState(false)
  const [emphasisOpen, setEmphasisOpen] = useState(false)
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null)
  // Add state for course dropdown
  const [courseOpen, setCourseOpen] = useState(false)

  useEffect(() => {
    if (open) {
      fetchUserProfile()
      fetchProfileOptions()
    }
  }, [open])

  const fetchUserProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch("http://localhost:3000/user")
      if (!response.ok) throw new Error("Failed to fetch user profile")

      const data = await response.json()
      setProfile(data)
      setOriginalProfile(JSON.parse(JSON.stringify(data))) // Deep copy
    } catch (error) {
      console.error("Error fetching user profile:", error)
      setAlert({ type: "error", message: "Failed to load your profile. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const fetchProfileOptions = async () => {
    try {
      const response = await fetch("http://localhost:3000/profile-options")
      if (!response.ok) throw new Error("Failed to fetch profile options")

      const data = await response.json()
      setOptions(data)
    } catch (error) {
      console.error("Error fetching profile options:", error)
    }
  }

  // Update the saveProfile function to include courses in the payload
  const saveProfile = async () => {
    setSaving(true)
    setAlert(null)

    // Calculate differences between original and current profile
    const payload: UpdatePayload = {
      majors: {
        add: profile.majors.filter((m) => !originalProfile.majors.includes(m)),
        remove: originalProfile.majors.filter((m) => !profile.majors.includes(m)),
      },
      minors: {
        add: profile.minors.filter((m) => !originalProfile.minors.includes(m)),
        remove: originalProfile.minors.filter((m) => !profile.minors.includes(m)),
      },
      emphases: {
        add: profile.emphases.filter((e) => !originalProfile.emphases.includes(e)),
        remove: originalProfile.emphases.filter((e) => !profile.emphases.includes(e)),
      },
      courses: {
        add: profile.courses.filter((c) => !originalProfile.courses.includes(c)),
        remove: originalProfile.courses.filter((c) => !profile.courses.includes(c)),
      },
    }

    try {
      const response = await fetch("http://localhost:3000/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setAlert({ type: "success", message: "Profile updated successfully!" })
        setOriginalProfile(JSON.parse(JSON.stringify(profile))) // Update original after successful save
      } else {
        const errorData = await response.json().catch(() => null)
        setAlert({
          type: "error",
          message: errorData?.message || "Failed to update profile. Please try again.",
        })
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      setAlert({ type: "error", message: "An error occurred while saving. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  const addMajor = (major: string) => {
    if (!profile.majors.includes(major)) {
      setProfile((prev) => ({
        ...prev,
        majors: [...prev.majors, major],
      }))
    }
    setMajorOpen(false)
  }

  const removeMajor = (major: string) => {
    setProfile((prev) => ({
      ...prev,
      majors: prev.majors.filter((m) => m !== major),
      // Also remove any emphases associated with this major
      emphases: prev.emphases.filter((e) => !e.startsWith(`M{${major}}E{`)),
    }))
  }

  const addMinor = (minor: string) => {
    if (!profile.minors.includes(minor)) {
      setProfile((prev) => ({
        ...prev,
        minors: [...prev.minors, minor],
      }))
    }
    setMinorOpen(false)
  }

  const removeMinor = (minor: string) => {
    setProfile((prev) => ({
      ...prev,
      minors: prev.minors.filter((m) => m !== minor),
    }))
  }

  const addEmphasis = (emphasis: string) => {
    if (!profile.emphases.includes(emphasis)) {
      setProfile((prev) => ({
        ...prev,
        emphases: [...prev.emphases, emphasis],
      }))
    }
    setEmphasisOpen(false)
    setSelectedMajor(null)
  }

  const removeEmphasis = (emphasis: string) => {
    setProfile((prev) => ({
      ...prev,
      emphases: prev.emphases.filter((e) => e !== emphasis),
    }))
  }

  // Add functions to handle adding and removing courses
  const addCourse = (course: string) => {
    if (!profile.courses.includes(course)) {
      setProfile((prev) => ({
        ...prev,
        courses: [...prev.courses, course],
      }))
    }
    setCourseOpen(false)
  }

  const removeCourse = (course: string) => {
    setProfile((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c !== course),
    }))
  }

  // Get available emphases for a specific major
  const getEmphasisOptionsForMajor = (major: string) => {
    return options.emphases.filter((e) => e.startsWith(`M{${major}}E{`)).filter((e) => !profile.emphases.includes(e))
  }

  // Extract emphasis display name from the format M{major}E{emphasis}
  const getEmphasisDisplayName = (emphasis: string) => {
    const match = emphasis.match(/M\{(.*?)\}E\{(.*?)\}/)
    return match ? match[2] : emphasis
  }

  // Extract major name from the format M{major}E{emphasis}
  const getMajorFromEmphasis = (emphasis: string) => {
    const match = emphasis.match(/M\{(.*?)\}E\{/)
    return match ? match[1] : ""
  }

  // Check if a major has available emphases
  const majorHasEmphases = (major: string) => {
    return options.emphases.some((e) => e.startsWith(`M{${major}}E{`))
  }

  // Get available majors that aren't already selected
  const getAvailableMajors = () => {
    return options.majors.filter((m) => !profile.majors.includes(m))
  }

  // Get available minors that aren't already selected
  const getAvailableMinors = () => {
    return options.minors.filter((m) => !profile.minors.includes(m))
  }

  // Add function to get available courses
  const getAvailableCourses = () => {
    return options.courses.filter((c) => !profile.courses.includes(c))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold" style={{ color: "#802a25" }}>
            Profile Settings
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#802a25" }} />
          </div>
        ) : (
          <>
            {alert && (
              <Alert
                className={cn(
                  "mb-4",
                  alert.type === "success"
                    ? "bg-green-50 text-green-800 border-green-200"
                    : "bg-red-50 text-red-800 border-red-200",
                )}
              >
                <div className="flex items-center gap-2">
                  {alert.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  <AlertTitle>{alert.type === "success" ? "Success" : "Error"}</AlertTitle>
                </div>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            )}

            {/* Update the TabsList to include a Courses tab */}
            <Tabs defaultValue="majors">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="majors">Majors & Emphases</TabsTrigger>
                <TabsTrigger value="minors">Minors</TabsTrigger>
                <TabsTrigger value="courses">Courses</TabsTrigger>
              </TabsList>

              <TabsContent value="majors" className="space-y-4 mt-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Your Majors</h3>
                    <Popover open={majorOpen} onOpenChange={setMajorOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          Add Major
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Search majors..." />
                          <CommandList>
                            <CommandEmpty>No majors found.</CommandEmpty>
                            <CommandGroup>
                              {getAvailableMajors().map((major) => (
                                <CommandItem key={major} onSelect={() => addMajor(major)}>
                                  {major}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    {profile.majors.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No majors added yet</p>
                    ) : (
                      profile.majors.map((major) => (
                        <div key={major} className="border rounded-md p-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{major}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMajor(major)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>

                          {/* Emphases section for this major */}
                          {majorHasEmphases(major) && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-gray-500">Emphases:</span>
                                <Popover
                                  open={emphasisOpen && selectedMajor === major}
                                  onOpenChange={(open) => {
                                    setEmphasisOpen(open)
                                    if (open) setSelectedMajor(major)
                                    else setSelectedMajor(null)
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 text-xs">
                                      Add Emphasis
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Search emphases..." />
                                      <CommandList>
                                        <CommandEmpty>No emphases found.</CommandEmpty>
                                        <CommandGroup>
                                          {getEmphasisOptionsForMajor(major).map((emphasis) => (
                                            <CommandItem key={emphasis} onSelect={() => addEmphasis(emphasis)}>
                                              {getEmphasisDisplayName(emphasis)}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {profile.emphases
                                  .filter((e) => getMajorFromEmphasis(e) === major)
                                  .map((emphasis) => (
                                    <Badge
                                      key={emphasis}
                                      variant="secondary"
                                      className="pl-2 pr-1 py-1 flex items-center gap-1"
                                    >
                                      {getEmphasisDisplayName(emphasis)}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeEmphasis(emphasis)}
                                        className="h-4 w-4 p-0 ml-1"
                                      >
                                        <X className="h-3 w-3" />
                                        <span className="sr-only">Remove</span>
                                      </Button>
                                    </Badge>
                                  ))}
                                {profile.emphases.filter((e) => getMajorFromEmphasis(e) === major).length === 0 && (
                                  <span className="text-xs text-gray-500 italic">No emphases added</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="minors" className="space-y-4 mt-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Your Minors</h3>
                    <Popover open={minorOpen} onOpenChange={setMinorOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          Add Minor
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Search minors..." />
                          <CommandList>
                            <CommandEmpty>No minors found.</CommandEmpty>
                            <CommandGroup>
                              {getAvailableMinors().map((minor) => (
                                <CommandItem key={minor} onSelect={() => addMinor(minor)}>
                                  {minor}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {profile.minors.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No minors added yet</p>
                    ) : (
                      profile.minors.map((minor) => (
                        <Badge key={minor} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                          {minor}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMinor(minor)}
                            className="h-4 w-4 p-0 ml-1"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Add the Courses TabsContent after the Minors tab */}
              <TabsContent value="courses" className="space-y-4 mt-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Your Courses</h3>
                    <Popover open={courseOpen} onOpenChange={setCourseOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          Add Course
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Search courses..." />
                          <CommandList>
                            <CommandEmpty>No courses found.</CommandEmpty>
                            <CommandGroup>
                              {getAvailableCourses().map((course) => (
                                <CommandItem key={course} onSelect={() => addCourse(course)}>
                                  {course}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {profile.courses.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No courses added yet</p>
                    ) : (
                      profile.courses.map((course) => (
                        <Badge key={course} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                          {course}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCourse(course)}
                            className="h-4 w-4 p-0 ml-1"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-4">
              <Button
                onClick={saveProfile}
                disabled={saving || JSON.stringify(profile) === JSON.stringify(originalProfile)}
                style={{ backgroundColor: "#802a25" }}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
