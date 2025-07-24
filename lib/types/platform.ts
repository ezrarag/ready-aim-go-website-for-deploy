export interface Client {
  id: string
  name: string
  email: string
  company?: string
  industry: string
  avatar?: string
  website?: string
  createdAt: Date
  isActive: boolean
  subscription: SubscriptionTier
  stats: ClientStats
}

export interface ClientStats {
  totalProjects: number
  activeOperators: number
  completedTasks: number
  totalSpent: number
  averageRating: number
}

export interface Operator {
  id: string
  name: string
  email: string
  avatar?: string
  skills: string[]
  specialties: string[]
  rating: number
  completedOps: number
  isVerified: boolean
  isAvailable: boolean
  hourlyRate?: number
  location?: string
  createdAt: Date
  portfolio: PortfolioItem[]
}

export interface PortfolioItem {
  id: string
  title: string
  description: string
  images: string[]
  clientId?: string
  tags: string[]
  completedAt: Date
}

export interface Operation {
  id: string
  clientId: string
  operatorId?: string
  type: OperationType
  title: string
  description: string
  status: OperationStatus
  priority: Priority
  budget?: number
  deadline?: Date
  deliverables: string[]
  attachments: string[]
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  feedback?: OperationFeedback
}

export type OperationType =
  | "design"
  | "development"
  | "marketing"
  | "content"
  | "audio"
  | "video"
  | "consulting"
  | "other"

export type OperationStatus = "open" | "claimed" | "in-progress" | "review" | "completed" | "cancelled"

export type Priority = "low" | "medium" | "high" | "urgent"

export type SubscriptionTier = "free" | "pro" | "enterprise"

export interface OperationFeedback {
  rating: number
  comment: string
  createdAt: Date
}

export interface MarketplaceItem {
  id: string
  clientId: string
  title: string
  description: string
  price: number
  category: string
  images: string[]
  isActive: boolean
  sales: number
  rating: number
  reviews: number
}
