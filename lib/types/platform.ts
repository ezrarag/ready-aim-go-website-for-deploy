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
  client_id: string
  title: string
  description: string
  price: number
  category_id: string
  images: string[]
  tags: string[]
  is_active: boolean
  verified: boolean
  rating: number
  reviews_count: number
  views_count: number
  created_at: string
  updated_at: string
}

export interface MarketplaceCategory {
  id: string
  name: string
  description: string
  slug: string
  created_at: string
}

export interface MarketplaceInteraction {
  id: string
  listing_id: string
  user_id: string
  interaction_type: 'view' | 'inquiry' | 'bookmark'
  created_at: string
}

export interface MarketplaceBookmark {
  id: string
  listing_id: string
  user_id: string
  created_at: string
}

export interface MarketplaceTransaction {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  amount: number
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  stripe_payment_intent_id?: string
  created_at: string
  updated_at: string
}

export type MarketplaceAccess = 'none' | 'view_only' | 'listing_only' | 'full_access'
