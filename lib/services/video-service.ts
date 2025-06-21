import type { DemoVideo, VideoCategory } from "../types/videos"

// This interface defines what the Supabase service will implement
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

// Supabase implementation (for future use)
export class SupabaseVideoService implements VideoService {
  // private supabase: SupabaseClient

  constructor(/* supabase: SupabaseClient */) {
    // this.supabase = supabase
  }

  async getCategories(): Promise<VideoCategory[]> {
    // const { data, error } = await this.supabase
    //   .from('video_categories')
    //   .select('*')
    //   .order('name')
    //
    // if (error) throw error
    // return data || []
    throw new Error("Supabase not implemented yet")
  }

  async getVideos(): Promise<DemoVideo[]> {
    // const { data, error } = await this.supabase
    //   .from('demo_videos')
    //   .select('*')
    //   .order('created_at', { ascending: false })
    //
    // if (error) throw error
    // return data || []
    throw new Error("Supabase not implemented yet")
  }

  async getVideosByCategory(categoryId: string): Promise<DemoVideo[]> {
    // const { data, error } = await this.supabase
    //   .from('demo_videos')
    //   .select('*')
    //   .eq('category', categoryId)
    //   .order('created_at', { ascending: false })
    //
    // if (error) throw error
    // return data || []
    throw new Error("Supabase not implemented yet")
  }

  async getFeaturedVideos(): Promise<DemoVideo[]> {
    // const { data, error } = await this.supabase
    //   .from('demo_videos')
    //   .select('*')
    //   .eq('featured', true)
    //   .order('view_count', { ascending: false })
    //
    // if (error) throw error
    // return data || []
    throw new Error("Supabase not implemented yet")
  }

  async searchVideos(query: string): Promise<DemoVideo[]> {
    // const { data, error } = await this.supabase
    //   .from('demo_videos')
    //   .select('*')
    //   .or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    //   .order('view_count', { ascending: false })
    //
    // if (error) throw error
    // return data || []
    throw new Error("Supabase not implemented yet")
  }

  async getVideoById(id: string): Promise<DemoVideo | null> {
    // const { data, error } = await this.supabase
    //   .from('demo_videos')
    //   .select('*')
    //   .eq('id', id)
    //   .single()
    //
    // if (error) {
    //   if (error.code === 'PGRST116') return null
    //   throw error
    // }
    // return data
    throw new Error("Supabase not implemented yet")
  }

  async incrementViewCount(videoId: string): Promise<void> {
    // const { error } = await this.supabase
    //   .rpc('increment_view_count', { video_id: videoId })
    //
    // if (error) throw error
    throw new Error("Supabase not implemented yet")
  }

  async createVideo(videoData: Omit<DemoVideo, "id" | "createdAt" | "viewCount">): Promise<DemoVideo> {
    // const { data, error } = await this.supabase
    //   .from('demo_videos')
    //   .insert([{
    //     ...videoData,
    //     view_count: 0
    //   }])
    //   .select()
    //   .single()
    //
    // if (error) throw error
    // return data
    throw new Error("Supabase not implemented yet")
  }

  async updateVideo(id: string, updates: Partial<DemoVideo>): Promise<DemoVideo> {
    // const { data, error } = await this.supabase
    //   .from('demo_videos')
    //   .update(updates)
    //   .eq('id', id)
    //   .select()
    //   .single()
    //
    // if (error) throw error
    // return data
    throw new Error("Supabase not implemented yet")
  }

  async deleteVideo(id: string): Promise<void> {
    // const { error } = await this.supabase
    //   .from('demo_videos')
    //   .delete()
    //   .eq('id', id)
    //
    // if (error) throw error
    throw new Error("Supabase not implemented yet")
  }
}
