export interface BeamRole {
  id: string
  clientId: string
  title: string
  description: string
  category: "Web Dev" | "Design" | "Admin" | "Logistics" | "Product Prep" | "Retail" | "Events" | "Finance"
  skills: string[]
  payRange: string
  deadline: string
  location?: string
  workstream: "Creative" | "Operations" | "Media" | "Transport" | "Retail" | "Events" | "Admin"
  visibility: "Public" | "BEAM Members"
  tags: string[]
  mediaUrl?: string
  status: "Draft" | "Live" | "Filled"
  createdAt: Date
  updatedAt: Date
}

export interface CreateRoleRequest {
  title: string
  description: string
  category: BeamRole["category"]
  skills: string[]
  payRange: string
  deadline: string
  location?: string
  workstream: BeamRole["workstream"]
  visibility: BeamRole["visibility"]
  tags: string[]
  mediaUrl?: string
  status: BeamRole["status"]
}

export interface BeamJobPayload {
  title: string
  description: string
  category: string
  skills: string[]
  pay: string
  deadline: string
  workstream: string
  tags: string[]
  mediaUrl?: string
  clientName: string
  location?: string
}
