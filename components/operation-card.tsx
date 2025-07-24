"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Clock, DollarSign, User, Calendar, Tag, CheckCircle, AlertCircle, MessageSquare } from "lucide-react"

interface Operation {
  id: string
  client_id: string
  operator_id?: string
  type: string
  title: string
  description: string
  status: "open" | "claimed" | "in-progress" | "review" | "completed"
  priority: "low" | "medium" | "high" | "urgent"
  budget?: number
  deadline?: string
  tags: string[]
  deliverables: string[]
  created_at: string
  client?: {
    full_name: string
    avatar_url?: string
  }
  operator?: {
    full_name: string
    avatar_url?: string
  }
}

interface OperationCardProps {
  operation: Operation
  currentUserId: string
  onClaim: (operationId: string) => Promise<void>
  onComplete: (operationId: string, notes?: string) => Promise<void>
  onStatusUpdate: (operationId: string, status: string) => Promise<void>
}

export function OperationCard({ operation, currentUserId, onClaim, onComplete, onStatusUpdate }: OperationCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [notes, setNotes] = useState("")
  const [showNotes, setShowNotes] = useState(false)
  const { toast } = useToast()

  const isMyTask = operation.operator_id === currentUserId
  const canClaim = operation.status === "open" && !operation.operator_id
  const canComplete = isMyTask && operation.status === "in-progress"

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "claimed":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "in-progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "review":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "mixing":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "mastering":
        return "bg-indigo-100 text-indigo-800 border-indigo-200"
      case "editing":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "design":
        return "bg-pink-100 text-pink-800 border-pink-200"
      case "video":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleClaim = async () => {
    setIsLoading(true)
    try {
      await onClaim(operation.id)
      toast({
        title: "Task Claimed!",
        description: `You've successfully claimed "${operation.title}"`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      await onComplete(operation.id, notes)
      toast({
        title: "Task Completed!",
        description: `"${operation.title}" has been marked as complete`,
      })
      setShowNotes(false)
      setNotes("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    try {
      await onStatusUpdate(operation.id, newStatus)
      toast({
        title: "Status Updated",
        description: `Task status changed to ${newStatus}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} days overdue`, urgent: true }
    } else if (diffDays === 0) {
      return { text: "Due today", urgent: true }
    } else if (diffDays === 1) {
      return { text: "Due tomorrow", urgent: true }
    } else if (diffDays <= 7) {
      return { text: `${diffDays} days left`, urgent: false }
    } else {
      return { text: date.toLocaleDateString(), urgent: false }
    }
  }

  const deadlineInfo = operation.deadline ? formatDeadline(operation.deadline) : null

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">{operation.title}</CardTitle>
            <div className="flex items-center space-x-2 mb-2">
              <Badge className={getTypeColor(operation.type)}>{operation.type}</Badge>
              <Badge className={getStatusColor(operation.status)}>{operation.status}</Badge>
              <Badge className={getPriorityColor(operation.priority)}>{operation.priority}</Badge>
            </div>
          </div>
          {operation.budget && (
            <div className="flex items-center text-green-600 font-semibold">
              <DollarSign className="h-4 w-4 mr-1" />${operation.budget}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-1" />
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={operation.client?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback>{operation.client?.full_name?.charAt(0) || "C"}</AvatarFallback>
            </Avatar>
            {operation.client?.full_name || "Client"}
          </div>
          {deadlineInfo && (
            <div className={`flex items-center ${deadlineInfo.urgent ? "text-red-600" : ""}`}>
              <Calendar className="h-4 w-4 mr-1" />
              {deadlineInfo.text}
              {deadlineInfo.urgent && <AlertCircle className="h-4 w-4 ml-1" />}
            </div>
          )}
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {new Date(operation.created_at).toLocaleDateString()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-gray-700 mb-4 line-clamp-3">{operation.description}</p>

        {operation.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {operation.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {operation.deliverables.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Deliverables:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {operation.deliverables.map((deliverable, index) => (
                <li key={index} className="flex items-center">
                  <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                  {deliverable}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex space-x-2">
            {canClaim && (
              <Button onClick={handleClaim} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? "Claiming..." : "Claim Task"}
              </Button>
            )}

            {isMyTask && operation.status === "claimed" && (
              <Button onClick={() => handleStatusChange("in-progress")} disabled={isLoading} variant="outline">
                Start Work
              </Button>
            )}

            {canComplete && (
              <Button onClick={() => setShowNotes(!showNotes)} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}

            {isMyTask && operation.status === "review" && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">Under Review</Badge>
            )}
          </div>

          {isMyTask && (
            <div className="flex items-center text-sm text-gray-500">
              <MessageSquare className="h-4 w-4 mr-1" />
              My Task
            </div>
          )}
        </div>

        {showNotes && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Completion Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the completed work..."
              className="mb-3"
            />
            <div className="flex space-x-2">
              <Button onClick={handleComplete} disabled={isLoading} size="sm">
                {isLoading ? "Completing..." : "Mark Complete"}
              </Button>
              <Button onClick={() => setShowNotes(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
