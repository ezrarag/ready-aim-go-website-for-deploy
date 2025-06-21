"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface ToastDemoProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function ToastDemo({
  title = "Toast Notification",
  description = "This is a toast notification example.",
  variant = "default",
}: ToastDemoProps) {
  const { toast } = useToast()

  const showToast = () => {
    toast({
      title,
      description,
      variant,
    })
  }

  return (
    <Button onClick={showToast} variant={variant === "destructive" ? "destructive" : "default"}>
      Show Toast
    </Button>
  )
}
