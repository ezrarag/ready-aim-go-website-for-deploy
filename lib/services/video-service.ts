import type { DemoVideo, VideoCategory } from "../types/videos"

// Persistence implementation for demo videos (e.g. Firestore) can implement this interface.
export interface VideoService {
  getCategories(): Promise<VideoCategory[]>
  getVideos(): Promise<DemoVideo[]>
  getVideosByCategory(categoryId: string): Promise<DemoVideo[]>
  getFeaturedVideos(): Promise<DemoVideo[]>
  searchVideos(query: string): Promise<DemoVideo[]>
  getVideoById(id: string): Promise<DemoVideo | null>
  incrementViewCount(videoId: string): Promise<void>
  createVideo(video: Omit<DemoVideo, "id" | "createdAt" | "viewCount">): Promise<DemoVideo>
  updateVideo(id: string, updates: Partial<DemoVideo>): Promise<DemoVideo>
  deleteVideo(id: string): Promise<void>
}

// Mock implementation (current)
export class MockVideoService implements VideoService {
  private videos: DemoVideo[] = []
  private categories: VideoCategory[] = []

  constructor(videos: DemoVideo[], categories: VideoCategory[]) {
    this.videos = videos
    this.categories = categories
  }

  async getCategories(): Promise<VideoCategory[]> {
    return this.categories
  }

  async getVideos(): Promise<DemoVideo[]> {
    return this.videos
  }

  async getVideosByCategory(categoryId: string): Promise<DemoVideo[]> {
    return this.videos.filter((video) => video.category === categoryId)
  }

  async getFeaturedVideos(): Promise<DemoVideo[]> {
    return this.videos.filter((video) => video.featured)
  }

  async searchVideos(query: string): Promise<DemoVideo[]> {
    const lowercaseQuery = query.toLowerCase()
    return this.videos.filter(
      (video) =>
        video.title.toLowerCase().includes(lowercaseQuery) ||
        video.description.toLowerCase().includes(lowercaseQuery) ||
        video.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)),
    )
  }

  async getVideoById(id: string): Promise<DemoVideo | null> {
    return this.videos.find((video) => video.id === id) || null
  }

  async incrementViewCount(videoId: string): Promise<void> {
    const video = this.videos.find((v) => v.id === videoId)
    if (video) {
      video.viewCount += 1
    }
  }

  async createVideo(videoData: Omit<DemoVideo, "id" | "createdAt" | "viewCount">): Promise<DemoVideo> {
    const video: DemoVideo = {
      ...videoData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      viewCount: 0,
    }
    this.videos.push(video)
    return video
  }

  async updateVideo(id: string, updates: Partial<DemoVideo>): Promise<DemoVideo> {
    const index = this.videos.findIndex((v) => v.id === id)
    if (index === -1) {
      throw new Error("Video not found")
    }
    this.videos[index] = { ...this.videos[index], ...updates }
    return this.videos[index]
  }

  async deleteVideo(id: string): Promise<void> {
    const index = this.videos.findIndex((v) => v.id === id)
    if (index !== -1) {
      this.videos.splice(index, 1)
    }
  }
}
