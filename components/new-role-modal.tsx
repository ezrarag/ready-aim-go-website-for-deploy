"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Plus, Palette, Truck, ShoppingBag, Calendar, FileText } from "lucide-react"
import type { BeamRole, CreateRoleRequest } from "@/lib/types/roles"

interface NewRoleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoleCreated?: (role: BeamRole) => void
}

const CATEGORIES = [
  { value: "Web Dev", label: "Web Development", icon: FileText },
  { value: "Design", label: "Design", icon: Palette },
  { value: "Admin", label: "Administration", icon: FileText },
  { value: "Logistics", label: "Logistics", icon: Truck },
  { value: "Product Prep", label: "Product Prep", icon: ShoppingBag },
  { value: "Retail", label: "Retail", icon: ShoppingBag },
  { value: "Events", label: "Events", icon: Calendar },
  { value: "Finance", label: "Finance", icon: FileText },
]

const WORKSTREAMS = [
  { value: "Creative", label: "Creative", color: "bg-purple-100 text-purple-800" },
  { value: "Operations", label: "Operations", color: "bg-blue-100 text-blue-800" },
  { value: "Media", label: "Media", color: "bg-pink-100 text-pink-800" },
  { value: "Transport", label: "Transport", color: "bg-green-100 text-green-800" },
  { value: "Retail", label: "Retail", color: "bg-orange-100 text-orange-800" },
  { value: "Events", label: "Events", color: "bg-yellow-100 text-yellow-800" },
  { value: "Admin", label: "Admin", color: "bg-gray-100 text-gray-800" },
]

export function NewRoleModal({ open, onOpenChange, onRoleCreated }: NewRoleModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<CreateRoleRequest>>({
    title: "",
    description: "",
    category: undefined,
    skills: [],
    payRange: "",
    deadline: "",
    location: "",
    workstream: undefined,
    visibility: "Public",
    tags: [],
    status: "Draft",
  })
  const [newSkill, setNewSkill] = useState("")
  const [newTag, setNewTag] = useState("")

  const handleInputChange = (field: keyof CreateRoleRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills?.includes(newSkill.trim())) {
      handleInputChange("skills", [...(formData.skills || []), newSkill.trim()])
      setNewSkill("")
    }
  }

  const removeSkill = (skill: string) => {
    handleInputChange("skills", formData.skills?.filter((s) => s !== skill) || [])
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      handleInputChange("tags", [...(formData.tags || []), newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    handleInputChange("tags", formData.tags?.filter((t) => t !== tag) || [])
  }

  const handleSubmit = async (status: "Draft" | "Live") => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        status,
        clientId: "current-user-id", // TODO: Get from auth context
      }

      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const { role } = await response.json()
        onRoleCreated?.(role)
        onOpenChange(false)
        resetForm()
      } else {
        console.error("Failed to create role")
      }
    } catch (error) {
      console.error("Error creating role:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setFormData({
      title: "",
      description: "",
      category: undefined,
      skills: [],
      payRange: "",
      deadline: "",
      location: "",
      workstream: undefined,
      visibility: "Public",
      tags: [],
      status: "Draft",
    })
    setNewSkill("")
    setNewTag("")
  }

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.category && formData.workstream
      case 2:
        return formData.title && formData.description
      case 3:
        return formData.payRange && formData.deadline && (formData.skills?.length || 0) > 0
      default:
        return true
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Define a role that will be posted to the BEAM platform for operators to claim.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={`step-${currentStep}`} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="step-1" disabled={currentStep < 1}>
              Category
            </TabsTrigger>
            <TabsTrigger value="step-2" disabled={currentStep < 2}>
              Details
            </TabsTrigger>
            <TabsTrigger value="step-3" disabled={currentStep < 3}>
              Requirements
            </TabsTrigger>
            <TabsTrigger value="step-4" disabled={currentStep < 4}>
              Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="step-1" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Category & Workstream</CardTitle>
                <CardDescription>Choose the type of work and which workstream it belongs to</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium mb-4 block">Category</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {CATEGORIES.map((category) => {
                      const Icon = category.icon
                      return (
                        <Card
                          key={category.value}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            formData.category === category.value
                              ? "ring-2 ring-blue-500 bg-blue-50"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => handleInputChange("category", category.value)}
                        >
                          <CardContent className="p-4 text-center">
                            <Icon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                            <p className="text-sm font-medium">{category.label}</p>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium mb-4 block">Workstream</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {WORKSTREAMS.map((workstream) => (
                      <Card
                        key={workstream.value}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          formData.workstream === workstream.value
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => handleInputChange("workstream", workstream.value)}
                      >
                        <CardContent className="p-4 text-center">
                          <Badge className={`${workstream.color} mb-2`}>{workstream.label}</Badge>
                          <p className="text-xs text-gray-600">
                            {workstream.value === "Creative" && "Design, content, and creative work"}
                            {workstream.value === "Operations" && "Business operations and management"}
                            {workstream.value === "Media" && "Video, audio, and media production"}
                            {workstream.value === "Transport" && "Logistics and transportation"}
                            {workstream.value === "Retail" && "Sales and customer service"}
                            {workstream.value === "Events" && "Event planning and coordination"}
                            {workstream.value === "Admin" && "Administrative and support tasks"}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="step-2" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Details</CardTitle>
                <CardDescription>Provide the basic information about this role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Role Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., Social Media Content Creator"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe what this role involves, responsibilities, and what you're looking for..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="e.g., Remote, Atlanta, GA, or Hybrid"
                  />
                </div>

                <div>
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={formData.visibility} onValueChange={(value) => handleInputChange("visibility", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public - Anyone can see this role</SelectItem>
                      <SelectItem value="BEAM Members">BEAM Members Only - Only verified BEAM operators</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="step-3" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Requirements & Compensation</CardTitle>
                <CardDescription>Define the skills needed and compensation details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="payRange">Pay Range</Label>
                  <Input
                    id="payRange"
                    value={formData.payRange}
                    onChange={(e) => handleInputChange("payRange", e.target.value)}
                    placeholder="e.g., $25-35/hour, $2000-3500, $50/event"
                  />
                </div>

                <div>
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => handleInputChange("deadline", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Required Skills</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill..."
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" onClick={addSkill} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills?.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Tags (Optional)</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="flex items-center gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="step-4" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Role</CardTitle>
                <CardDescription>Review your role details before publishing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Category</Label>
                    <p className="font-medium">{formData.category}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Workstream</Label>
                    <Badge className={WORKSTREAMS.find((w) => w.value === formData.workstream)?.color}>
                      {formData.workstream}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Title</Label>
                  <p className="font-medium">{formData.title}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Description</Label>
                  <p className="text-sm text-gray-700">{formData.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Pay Range</Label>
                    <p className="font-medium">{formData.payRange}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Deadline</Label>
                    <p className="font-medium">{formData.deadline}</p>
                  </div>
                </div>

                {formData.location && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Location</Label>
                    <p className="font-medium">{formData.location}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-500">Required Skills</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {formData.skills?.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {formData.tags && formData.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-6 border-t">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStep < 4 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!isStepValid(currentStep)}>
                Next
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleSubmit("Draft")} disabled={isSubmitting}>
                  Save as Draft
                </Button>
                <Button onClick={() => handleSubmit("Live")} disabled={isSubmitting}>
                  Publish Live
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
