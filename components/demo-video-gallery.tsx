"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Play,
  Search,
  Clock,
  Eye,
  Star,
  Zap,
  Users,
  MapPin,
  BarChart3,
  Smartphone,
  X,
  ExternalLink,
} from "lucide-react"
import { videoCategories, demoVideos, searchVideos, incrementViewCount } from "@/lib/demo-videos"
import type { DemoVideo } from "@/lib/types/videos"

interface VideoPlayerProps {
  video: DemoVideo
  onClose: () => void
}

function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  useEffect(() => {
    // Increment view count when video is played
    incrementViewCount(video.id)
  }, [video.id])

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{video.title}</DialogTitle>
              <DialogDescription className="mt-1">{video.description}</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Player Placeholder */}
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Play className="h-16 w-16 mx-auto mb-4 opacity-80" />
                <p className="text-lg font-medium">Video Player</p>
                <p className="text-sm opacity-80">Duration: {video.duration}</p>
                <p className="text-xs opacity-60 mt-2">Video URL: {video.videoUrl}</p>
              </div>
            </div>
            {/* This will be replaced with actual video player */}
            <div className="absolute top-4 right-4">
              <Button variant="secondary" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </div>

          {/* Video Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">{video.category.replace("-", " ")}</Badge>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                {video.duration}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Eye className="h-4 w-4 mr-1" />
                {video.viewCount.toLocaleString()} views
              </div>
            </div>
            {video.featured && (
              <Badge variant="default" className="bg-yellow-500">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {video.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface VideoCardProps {
  video: DemoVideo
  onPlay: (video: DemoVideo) => void
}

function VideoCard({ video, onPlay }: VideoCardProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "overview":
        return <Play className="h-4 w-4" />
      case "beam-integration":
        return <Zap className="h-4 w-4" />
      case "operator-network":
        return <Users className="h-4 w-4" />
      case "real-estate":
        return <MapPin className="h-4 w-4" />
      case "analytics":
        return <BarChart3 className="h-4 w-4" />
      case "mobile":
        return <Smartphone className="h-4 w-4" />
      default:
        return <Play className="h-4 w-4" />
    }
  }

  return (
    <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => onPlay(video)}>
      <div className="relative">
        <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
          <img
            src={video.thumbnailUrl || "/placeholder.svg"}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-200" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-white/90 rounded-full p-3">
              <Play className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
        {video.featured && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-yellow-500">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="text-xs">
            {video.duration}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {video.title}
          </h3>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{video.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getCategoryIcon(video.category)}
            <span className="text-xs text-gray-500 capitalize">{video.category.replace("-", " ")}</span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Eye className="h-3 w-3 mr-1" />
            {video.viewCount.toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface DemoVideoGalleryProps {
  trigger?: React.ReactNode
}

export function DemoVideoGallery({ trigger }: DemoVideoGalleryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<DemoVideo | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")

  const getFilteredVideos = () => {
    let videos = demoVideos

    // Apply search filter
    if (searchQuery.trim()) {
      videos = searchVideos(searchQuery)
    }

    // Apply category filter
    if (activeCategory !== "all" && activeCategory !== "featured") {
      videos = videos.filter((video) => video.category === activeCategory)
    } else if (activeCategory === "featured") {
      videos = videos.filter((video) => video.featured)
    }

    return videos
  }

  const filteredVideos = getFilteredVideos()

  const handleVideoPlay = (video: DemoVideo) => {
    setSelectedVideo(video)
  }

  const handleClosePlayer = () => {
    setSelectedVideo(null)
  }

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case "overview":
        return <Play className="h-4 w-4" />
      case "beam-integration":
        return <Zap className="h-4 w-4" />
      case "operator-network":
        return <Users className="h-4 w-4" />
      case "real-estate":
        return <MapPin className="h-4 w-4" />
      case "analytics":
        return <BarChart3 className="h-4 w-4" />
      case "mobile":
        return <Smartphone className="h-4 w-4" />
      default:
        return <Play className="h-4 w-4" />
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="lg">
              <Play className="h-4 w-4 mr-2" />
              Watch Demo
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-6xl w-full h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">ReadyAimGo Demo Gallery</DialogTitle>
            <DialogDescription>Explore our comprehensive video library to see ReadyAimGo in action</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="h-full flex flex-col">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Tabs */}
              <TabsList className="grid grid-cols-7 mb-4">
                <TabsTrigger value="all" className="text-xs">
                  All ({demoVideos.length})
                </TabsTrigger>
                <TabsTrigger value="featured" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </TabsTrigger>
                {videoCategories.slice(0, 5).map((category) => (
                  <TabsTrigger key={category.id} value={category.id} className="text-xs">
                    {getCategoryIcon(category.id)}
                    <span className="ml-1 hidden sm:inline">{category.name.split(" ")[0]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Video Grid */}
              <TabsContent value={activeCategory} className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {filteredVideos.length === 0 ? (
                    <div className="text-center py-12">
                      <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
                      <p className="text-gray-600">
                        {searchQuery ? `No videos match "${searchQuery}"` : "No videos available in this category"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                      {filteredVideos.map((video) => (
                        <VideoCard key={video.id} video={video} onPlay={handleVideoPlay} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Category Info */}
          {activeCategory !== "all" && activeCategory !== "featured" && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              {(() => {
                const category = videoCategories.find((c) => c.id === activeCategory)
                return category ? (
                  <div className="flex items-center">
                    {getCategoryIcon(category.id)}
                    <div className="ml-3">
                      <h4 className="font-medium">{category.name}</h4>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>
                ) : null
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Player Modal */}
      {selectedVideo && <VideoPlayer video={selectedVideo} onClose={handleClosePlayer} />}
    </>
  )
}
