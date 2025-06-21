export interface RealEstateListing {
  id: string
  title: string
  description: string
  type: PropertyType
  location: string
  address: string
  coordinates?: {
    lat: number
    lng: number
  }
  price: number
  priceUnit: PriceUnit
  capacity: number
  size: number // square feet
  availability: AvailabilityStatus
  amenities: string[]
  images: string[]
  features: PropertyFeature[]
  contact: ContactInfo
  rating: number
  reviews: number
  createdAt: Date
  updatedAt: Date
  operatorId?: string
  isVerified: boolean
  tags: string[]
}

export type PropertyType =
  | "office"
  | "studio"
  | "meeting-room"
  | "event-space"
  | "warehouse"
  | "retail"
  | "co-working"
  | "residential"

export type PriceUnit = "hour" | "day" | "week" | "month" | "year"

export type AvailabilityStatus = "available" | "booked" | "maintenance" | "pending"

export interface PropertyFeature {
  name: string
  icon: string
  description?: string
}

export interface ContactInfo {
  name: string
  phone: string
  email: string
  company?: string
}

export interface PropertyFilters {
  type: PropertyType | "all"
  location: string | "all"
  capacity: CapacityRange | "any"
  priceRange: PriceRange
  amenities: string[]
  availability: AvailabilityStatus | "all"
  minRating: number
}

export type CapacityRange = "1-4" | "5-10" | "11-20" | "21-50" | "50+"

export interface PriceRange {
  min: number
  max: number
}

export interface PropertyBooking {
  id: string
  propertyId: string
  userId: string
  startDate: Date
  endDate: Date
  totalPrice: number
  status: BookingStatus
  notes?: string
  createdAt: Date
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed"
