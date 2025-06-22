"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/contexts/notification-context"

interface NewOperationFormProps {
  onClose?: () => void
  onSuccess?: (operation: any) => void
}

export function NewOperationForm({ onClose, onSuccess }: NewOperationFormProps) {
  const { addNotification } = useNotifications()
  const [isLoading, setIsLoading] = useState(false)
  const [date, setDate] = useState<Date>()
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")
  const [deliverables, setDeliverables] = useState<string[]>([])
  const [currentDeliverable, setCurrentDeliverable] = useState("")

  const [formData, setFormData] = useState({
    type: "",
    title: "",
    description: "",
    priority: "medium",
    budget: "",
  })

  const operationTypes = [
    { value: "design", label: "Design" },
    { value: "development", label: "Development" },
    { value: "marketing", label: "Marketing" },
    { value: "content", label: "Content Creation" },
    { value: "audio", label: "Audio Production" },
    { value: "video", label: "Video Production" },
    { value: "consulting", label: "Consulting" },
    { value: "other", label: "Other" },
  ]

  const priorities = [
    { value: "low", label: "Low", color: "bg-gray-100 text-gray-800" },
    { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-800" },
    { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
    { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // In a real app, this would call your API
      const operationData = {
        ...formData,
        budget: formData.budget ? Number.parseFloat(formData.budget) : null,
        deadline: date?.toISOString(),
        tags,
        deliverables,
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      addNotification({
        title: "Operation Created!",
        description: `Your ${formData.type} operation "${formData.title}" has been posted to the BEAM network.`,
        type: "success",
        category: "operations",
      })

      onSuccess?.(operationData)
      onClose?.()
    } catch (error) {
      addNotification({
        title: "Error Creating Operation",
        description: "There was an error creating your operation. Please try again.",
        type: "error",
        category: "operations",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const addDeliverable = () => {
    if (currentDeliverable.trim() && !deliverables.includes(currentDeliverable.trim())) {
      setDeliverables([...deliverables, currentDeliverable.trim()])
      setCurrentDeliverable("")
    }
  }

  const removeDeliverable = (deliverableToRemove: string) => {
    setDeliverables(deliverables.filter((d) => d !== deliverableToRemove))
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Operation</CardTitle>
        <CardDescription>Post a new task to the BEAM network and connect with skilled operators</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Operation Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operation type" />
                </SelectTrigger>
                <SelectContent>
                  {operationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <Badge className={priority.color}>{priority.label}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Operation Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Logo design for tech startup"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Provide detailed requirements, style preferences, and any specific instructions..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">Budget (USD)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData((prev) => ({ ...prev, budget: e.target.value }))}
                placeholder="1000"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <Label>Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
          </div>

          <div>
            <Label>Deliverables</Label>
            <div className="space-y-2 mb-2">
              {deliverables.map((deliverable) => (
                <div key={deliverable} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{deliverable}</span>
                  <X className="h-4 w-4 cursor-pointer text-gray-500" onClick={() => removeDeliverable(deliverable)} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={currentDeliverable}
                onChange={(e) => setCurrentDeliverable(e.target.value)}
                placeholder="e.g., 3 logo concepts, source files..."
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addDeliverable())}
              />
              <Button type="button" onClick={addDeliverable} variant="outline">
                Add
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Operation"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
