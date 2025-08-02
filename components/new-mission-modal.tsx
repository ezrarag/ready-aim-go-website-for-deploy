"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { missionCategories, MissionCategory } from "@/lib/config/mission-categories"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

interface NewMissionModalProps {
  open: boolean
  onClose: () => void
  onMissionCreated?: () => void
  preSelectedCategory?: string
}

export function NewMissionModal({ open, onClose, onMissionCreated, preSelectedCategory }: NewMissionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<MissionCategory | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'category' | 'form'>(preSelectedCategory ? 'form' : 'category')

  // Handle pre-selected category
  useEffect(() => {
    if (preSelectedCategory) {
      const category = missionCategories.find(cat => cat.id === preSelectedCategory)
      if (category) {
        setSelectedCategory(category)
        setFormData({ category: preSelectedCategory })
        setStep('form')
      }
    }
  }, [preSelectedCategory])

  const handleCategorySelect = (categoryId: string) => {
    const category = missionCategories.find(cat => cat.id === categoryId)
    if (category) {
      setSelectedCategory(category)
      setStep('form')
      setFormData({ category: categoryId })
    }
  }

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCategory) return

    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("You must be logged in to create a mission")
        return
      }

      // Validate required fields
      const requiredFields = selectedCategory.fields.filter(field => field.required)
      const missingFields = requiredFields.filter(field => !formData[field.name])
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`)
        return
      }

      // Create mission in database
      const { data, error } = await supabase
        .from('missions')
        .insert({
          client_id: user.id,
          title: formData.title,
          description: formData.description,
          category: selectedCategory.id,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          due_date: formData.due_date || null,
          status: 'pending',
          priority: 'medium',
          metadata: {
            ...formData,
            category_name: selectedCategory.name
          }
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating mission:', error)
        toast.error("Failed to create mission")
        return
      }

      toast.success("Mission created successfully!")
      onMissionCreated?.()
      handleClose()
    } catch (error) {
      console.error('Error creating mission:', error)
      toast.error("Failed to create mission")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedCategory(null)
    setFormData({})
    setStep('category')
    setLoading(false)
    onClose()
  }

  const renderField = (field: any) => {
    const value = formData[field.name] || ''
    const isRequired = field.required

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className="min-h-[100px]"
              required={isRequired}
            />
          </div>
        )

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Select value={value} onValueChange={(val) => handleInputChange(field.name, val)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'date':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.name}
              type="date"
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              required={isRequired}
            />
          </div>
        )

      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              min={field.validation?.min}
              max={field.validation?.max}
              required={isRequired}
            />
          </div>
        )

      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              required={isRequired}
            />
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {step === 'category' ? 'Select Mission Category' : `Create ${selectedCategory?.name} Mission`}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            {step === 'category' 
              ? 'Choose the type of mission you want to create'
              : `Fill in the details for your ${selectedCategory?.name.toLowerCase()} mission`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'category' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {missionCategories.map((category) => (
              <Card
                key={category.id}
                className="bg-neutral-800 border-neutral-700 hover:border-orange-500/50 transition-colors cursor-pointer"
                onClick={() => handleCategorySelect(category.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <category.icon className={`w-6 h-6 ${category.color}`} />
                    <div>
                      <CardTitle className="text-white text-lg">{category.name}</CardTitle>
                      <CardDescription className="text-neutral-400 text-sm">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="flex items-center gap-3 p-3 bg-neutral-800 rounded border border-neutral-700">
              <selectedCategory.icon className={`w-5 h-5 ${selectedCategory.color}`} />
              <div>
                <div className="text-white font-medium">{selectedCategory.name}</div>
                <div className="text-neutral-400 text-sm">{selectedCategory.description}</div>
              </div>
            </div>

            <div className="space-y-4">
              {selectedCategory.fields.map(renderField)}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('category')}
                className="flex-1"
              >
                Back to Categories
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {loading ? 'Creating Mission...' : 'Create Mission'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
} 