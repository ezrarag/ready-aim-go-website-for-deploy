"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Edit, Trash2, Send, Copy } from "lucide-react"
import { useNotifications } from "@/contexts/notification-context"
import type { NotificationTemplate } from "@/lib/types/notification-templates"

interface TemplateFormProps {
  template?: NotificationTemplate
  onSave: (template: Omit<NotificationTemplate, "id" | "createdAt" | "usageCount">) => void
  onCancel: () => void
}

function TemplateForm({ template, onSave, onCancel }: TemplateFormProps) {
  const [formData, setFormData] = useState({
    name: template?.name || "",
    category: template?.category || "general",
    type: template?.type || "info",
    title: template?.title || "",
    description: template?.description || "",
    actionLabel: template?.actionLabel || "",
    actionUrl: template?.actionUrl || "",
    tags: template?.tags.join(", ") || "",
    variables: template?.variables.join(", ") || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name: formData.name,
      category: formData.category as any,
      type: formData.type as any,
      title: formData.title,
      description: formData.description,
      actionLabel: formData.actionLabel || undefined,
      actionUrl: formData.actionUrl || undefined,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      variables: formData.variables
        .split(",")
        .map((variable) => variable.trim())
        .filter(Boolean),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="job">Job</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="network">Network</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Use {variable} for dynamic content"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Use {variable} for dynamic content"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="actionLabel">Action Label (Optional)</Label>
          <Input
            id="actionLabel"
            value={formData.actionLabel}
            onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
            placeholder="View Details"
          />
        </div>

        <div>
          <Label htmlFor="actionUrl">Action URL (Optional)</Label>
          <Input
            id="actionUrl"
            value={formData.actionUrl}
            onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
            placeholder="/jobs/{jobId}"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="variables">Variables (comma-separated)</Label>
        <Input
          id="variables"
          value={formData.variables}
          onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
          placeholder="jobId, amount, location"
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="urgent, payment, work"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{template ? "Update" : "Create"} Template</Button>
      </DialogFooter>
    </form>
  )
}

interface SendTemplateDialogProps {
  template: NotificationTemplate
  onSend: (variables: Record<string, string>) => void
  onCancel: () => void
}

function SendTemplateDialog({ template, onSend, onCancel }: SendTemplateDialogProps) {
  const [variables, setVariables] = useState<Record<string, string>>(
    template.variables.reduce((acc, variable) => ({ ...acc, [variable]: "" }), {}),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSend(variables)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <h4 className="font-medium">Template Variables</h4>
        {template.variables.map((variable) => (
          <div key={variable}>
            <Label htmlFor={variable}>{variable}</Label>
            <Input
              id={variable}
              value={variables[variable]}
              onChange={(e) => setVariables({ ...variables, [variable]: e.target.value })}
              placeholder={`Enter ${variable}`}
              required
            />
          </div>
        ))}
      </div>

      <div className="bg-gray-50 p-3 rounded-md">
        <h5 className="font-medium mb-2">Preview</h5>
        <p className="text-sm">
          <strong>Title:</strong> {template.title.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match)}
        </p>
        <p className="text-sm mt-1">
          <strong>Description:</strong>{" "}
          {template.description.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match)}
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <Send className="h-4 w-4 mr-2" />
          Send Notification
        </Button>
      </DialogFooter>
    </form>
  )
}

export function NotificationTemplates() {
  const { templates, addTemplate, updateTemplate, deleteTemplate, sendFromTemplate } = useNotifications()
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)
  const [sendingTemplate, setSendingTemplate] = useState<NotificationTemplate | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const handleSaveTemplate = (templateData: Omit<NotificationTemplate, "id" | "createdAt" | "usageCount">) => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, templateData)
      setEditingTemplate(null)
    } else {
      addTemplate(templateData)
      setIsCreateDialogOpen(false)
    }
  }

  const handleSendTemplate = (variables: Record<string, string>) => {
    if (sendingTemplate) {
      sendFromTemplate(sendingTemplate.id, variables)
      setSendingTemplate(null)
    }
  }

  const copyTemplate = (template: NotificationTemplate) => {
    const newTemplate = {
      ...template,
      name: `${template.name} (Copy)`,
    }
    delete (newTemplate as any).id
    delete (newTemplate as any).createdAt
    delete (newTemplate as any).usageCount
    addTemplate(newTemplate)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Notification Templates</h3>
          <p className="text-sm text-gray-600">Create and manage reusable notification templates</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>Create a reusable notification template with dynamic variables.</DialogDescription>
            </DialogHeader>
            <TemplateForm onSave={handleSaveTemplate} onCancel={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="mt-1">{template.title}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{template.category}</Badge>
                    <Badge variant={template.type === "error" ? "destructive" : "default"}>{template.type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                {template.variables.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs font-medium text-gray-500">Variables: </span>
                    {template.variables.map((variable) => (
                      <Badge key={variable} variant="secondary" className="mr-1 text-xs">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>Used {template.usageCount} times</span>
                    <span>•</span>
                    <span>{template.tags.join(", ")}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Send Notification</DialogTitle>
                          <DialogDescription>
                            Fill in the template variables to send this notification.
                          </DialogDescription>
                        </DialogHeader>
                        <SendTemplateDialog
                          template={template}
                          onSend={handleSendTemplate}
                          onCancel={() => setSendingTemplate(null)}
                        />
                      </DialogContent>
                    </Dialog>

                    <Button size="sm" variant="outline" onClick={() => copyTemplate(template)}>
                      <Copy className="h-4 w-4" />
                    </Button>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Template</DialogTitle>
                          <DialogDescription>Update the notification template.</DialogDescription>
                        </DialogHeader>
                        <TemplateForm
                          template={template}
                          onSave={handleSaveTemplate}
                          onCancel={() => setEditingTemplate(null)}
                        />
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTemplate(template.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
