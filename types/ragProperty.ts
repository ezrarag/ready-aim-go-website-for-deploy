export type RAGPropertyClass =
  | "commercial-space"
  | "hotel-established"
  | "hotel-remake"
  | "mixed-use-civic"
  | "distressed"
  | "residential-portfolio"

export type RAGPropertyStatus =
  | "prospecting"
  | "under-contract"
  | "active"
  | "in-renovation"
  | "stabilized"
  | "exited"

export type RAGPropertyNGOLink = {
  ngoId: string
  ngoName: string
  ngoSubdomain: string
  relationshipType:
    | "anchor-site"
    | "service-site"
    | "cohort-project"
    | "training-site"
  linkedAt: string
  linkedBy: string
}

export type RAGProperty = {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
  propertyClass: RAGPropertyClass
  status: RAGPropertyStatus
  node: string
  clientId?: string
  clientName?: string
  ngoLinks: RAGPropertyNGOLink[]
  beamGroundsPropertyId?: string
  publicName: string
  publicSummary: string
  publicImageUrl?: string
  isPublic: boolean
  hotelDetails?: {
    roomCount?: number
    starRating?: number
    brandAffiliation?: string
    renovationBudget?: number
    targetCompletion?: string
  }
  notes?: string
  squareFootage?: number
  purchasePrice?: number
  currentValue?: number
  createdAt: string
  updatedAt: string
  createdBy: string
}
