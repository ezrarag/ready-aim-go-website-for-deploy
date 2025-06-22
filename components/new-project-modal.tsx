"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Upload,
  FileText,
  ImageIcon,
  Music,
  Video,
  Archive,
  Play,
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useNotifications } from "@/contexts/notification-context"

interface NewProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  uploadProgress: number
  status: "uploading" | "completed" | "error"
  supabasePath?: string
}

const projectTypes = [
  {
    id: "audio-mixing",
    title: "Audio Mixing & Mastering",
    description: "Professional mixing and mastering for your tracks",
    icon: Music,
    acceptedFiles: [".wav", ".mp3", ".aiff", ".flac"],
    maxFiles: 10,
    maxSize: "500MB per file",
  },
  {
    id: "video-editing",
    title: "Video Editing & Post-Production",
    description: "Complete video editing, color grading, and post-production",
    icon: Video,
    acceptedFiles: [".mp4", ".mov", ".avi", ".mkv", ".prores"],
    maxFiles: 5,
    maxSize: "2GB per file",
  },
  {
    id: "graphic-design",
    title: "Graphic Design & Branding",
    description: "Logo design, branding, and visual identity creation",
    icon: ImageIcon,
    acceptedFiles: [".psd", ".ai", ".png", ".jpg", ".pdf", ".svg"],
    maxFiles: 20,
    maxSize: "100MB per file",
  },
  {
    id: "content-creation",
    title: "Content Creation & Writing",
    description: "Blog posts, social media content, and copywriting",
    icon: FileText,
    acceptedFiles: [".docx", ".pdf", ".txt", ".md"],
    maxFiles: 15,
    maxSize: "50MB per file",
  },
  {
    id: "web-development",
    title: "Web Development & Design",
    description: "Website development, UI/UX design, and web applications",
    icon: Archive,
    acceptedFiles: [".zip", ".rar", ".psd", ".fig", ".sketch"],
    maxFiles: 10,
    maxSize: "200MB per file",
  },
]

export function NewProjectModal({ open, onOpenChange }: NewProjectModalProps) {
  const { addNotification } = useNotifications()
  const [selectedType, setSelectedType] = useState<string>("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [projectDetails, setProjectDetails] = useState({
    title: "",
    description: "",
    deadline: "",
    budget: "",
    priority: "medium",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedProjectType = projectTypes.find((type) => type.id === selectedType)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setIsUploading(true)

    for (const file of files) {
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadProgress: 0,
        status: "uploading",
      }

      setUploadedFiles((prev) => [...prev, newFile])

      try {
        // Create file path in Supabase Storage
        const fileExt = file.name.split(".").pop()
        const fileName = `${fileId}.${fileExt}`
        const filePath = `projects/${selectedType}/${fileName}`

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage.from("project-files").upload(filePath, file, {
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100
            setUploadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, uploadProgress: percentage } : f)))
          },
        })

        if (error) throw error

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("project-files").getPublicUrl(filePath)

        // Update file status
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "completed",
                  uploadProgress: 100,
                  url: publicUrl,
                  supabasePath: filePath,
                }
              : f,
          ),
        )

        addNotification({
          title: "File Uploaded",
          description: `${file.name} has been uploaded successfully`,
          type: "success",
          category: "uploads",
        })
      } catch (error) {
        console.error("Upload error:", error)
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: "error", uploadProgress: 0 } : f)),
        )

        addNotification({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}`,
          type: "error",
          category: "uploads",
        })
      }
    }

    setIsUploading(false)
  }

  const removeFile = async (fileId: string) => {
    const file = uploadedFiles.find((f) => f.id === fileId)
    if (file?.supabasePath) {
      try {
        await supabase.storage.from("project-files").remove([file.supabasePath])
      } catch (error) {
        console.error("Error removing file:", error)
      }
    }
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (type.startsWith("video/")) return <Video className="h-4 w-4" />
    if (type.startsWith("audio/")) return <Music className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const handleSubmitProject = async () => {
    if (!selectedType || !projectDetails.title || uploadedFiles.length === 0) {
      addNotification({
        title: "Missing Information",
        description: "Please select a project type, add a title, and upload at least one file",
        type: "error",
        category: "validation",
      })
      return
    }

    try {
      // Create project in database
      const projectData = {
        type: selectedType,
        title: projectDetails.title,
        description: projectDetails.description,
        deadline: projectDetails.deadline,
        budget: projectDetails.budget ? Number.parseFloat(projectDetails.budget) : null,
        priority: projectDetails.priority,
        files: uploadedFiles.filter((f) => f.status === "completed"),
        status: "open",
      }

      // In production, this would call your API
      console.log("Creating project:", projectData)

      addNotification({
        title: "Project Created!",
        description: `Your ${selectedProjectType?.title} project has been submitted to the BEAM network`,
        type: "success",
        category: "projects",
      })

      // Reset form and close modal
      setSelectedType("")
      setUploadedFiles([])
      setProjectDetails({
        title: "",
        description: "",
        deadline: "",
        budget: "",
        priority: "medium",
      })
      onOpenChange(false)
    } catch (error) {
      addNotification({
        title: "Error Creating Project",
        description: "There was an error creating your project. Please try again.",
        type: "error",
        category: "projects",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Choose your project type, upload files, and connect with skilled operators through the BEAM network
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="type" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="type">Project Type</TabsTrigger>
            <TabsTrigger value="details" disabled={!selectedType}>
              Details
            </TabsTrigger>
            <TabsTrigger value="files" disabled={!selectedType}>
              Files
            </TabsTrigger>
            <TabsTrigger value="review" disabled={!selectedType || uploadedFiles.length === 0}>
              Review
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            <TabsContent value="type" className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">What type of project do you need help with?</h3>
                <p className="text-sm text-gray-600">
                  Select the category that best matches your creative needs. Each type has specialized operators ready
                  to help.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <Card
                      key={type.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedType === type.id ? "ring-2 ring-blue-500 bg-blue-50" : ""
                      }`}
                      onClick={() => setSelectedType(type.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Icon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{type.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-gray-500">Accepts: {type.acceptedFiles.join(", ")}</p>
                              <p className="text-xs text-gray-500">
                                Max {type.maxFiles} files, {type.maxSize}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Demo Video Section */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Play className="h-5 w-5" />
                    <span>How ReadyAimGo Works</span>
                  </CardTitle>
                  <CardDescription>Watch this quick overview of our BEAM network and project workflow</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Play className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Demo video would be embedded here</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Shows: Project submission → Operator matching → Delivery process
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    value={projectDetails.title}
                    onChange={(e) => setProjectDetails((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Mix and master my latest single"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Project Description</Label>
                  <Textarea
                    id="description"
                    value={projectDetails.description}
                    onChange={(e) => setProjectDetails((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide detailed requirements, style preferences, and any specific instructions..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Budget (USD)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={projectDetails.budget}
                      onChange={(e) => setProjectDetails((prev) => ({ ...prev, budget: e.target.value }))}
                      placeholder="1000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={projectDetails.deadline}
                      onChange={(e) => setProjectDetails((prev) => ({ ...prev, deadline: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={projectDetails.priority}
                    onValueChange={(value) => setProjectDetails((prev) => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="files" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Your Files</h3>
                <p className="text-gray-600 mb-4">
                  {selectedProjectType
                    ? `Accepts: ${selectedProjectType.acceptedFiles.join(", ")}`
                    : "Select a project type first"}
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedType || isUploading}
                  className="mb-2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
                <p className="text-sm text-gray-500">
                  Max {selectedProjectType?.maxFiles} files, {selectedProjectType?.maxSize}
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept={selectedProjectType?.acceptedFiles.join(",")}
                onChange={handleFileSelect}
              />

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Uploaded Files ({uploadedFiles.length})</h4>
                  {uploadedFiles.map((file) => (
                    <Card key={file.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          {getFileIcon(file.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            {file.status === "uploading" && (
                              <Progress value={file.uploadProgress} className="h-1 mt-1" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {file.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {file.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                          {file.url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={file.url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="review" className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Review Your Project</h3>
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center space-x-3">
                        {selectedProjectType && (
                          <>
                            <selectedProjectType.icon className="h-5 w-5 text-blue-600" />
                            <span className="font-medium">{selectedProjectType.title}</span>
                          </>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{projectDetails.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{projectDetails.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Budget:</span>{" "}
                          {projectDetails.budget ? `$${projectDetails.budget}` : "Not specified"}
                        </div>
                        <div>
                          <span className="text-gray-500">Deadline:</span> {projectDetails.deadline || "Not specified"}
                        </div>
                      </div>
                      <div>
                        <Badge
                          className={
                            projectDetails.priority === "urgent"
                              ? "bg-red-100 text-red-800"
                              : projectDetails.priority === "high"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                          }
                        >
                          {projectDetails.priority} priority
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium mb-2">
                    Files ({uploadedFiles.filter((f) => f.status === "completed").length})
                  </h4>
                  <div className="space-y-2">
                    {uploadedFiles
                      .filter((f) => f.status === "completed")
                      .map((file) => (
                        <div key={file.id} className="flex items-center space-x-2 text-sm">
                          {getFileIcon(file.type)}
                          <span>{file.name}</span>
                          <span className="text-gray-500">({formatFileSize(file.size)})</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitProject}>Submit Project to BEAM Network</Button>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
