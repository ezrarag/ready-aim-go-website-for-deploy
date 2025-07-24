export interface DemoVideo {
  id: string
  title: string
  description: string
  category: string
  duration: string
  thumbnailUrl: string
  videoUrl: string
  featured: boolean
  tags: string[]
  createdAt: Date
  viewCount: number
}

export interface VideoCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  videoCount: number
}
