import type { DemoVideo, VideoCategory } from "./types/videos"

// This will be replaced with Supabase queries later
export const videoCategories: VideoCategory[] = [
  {
    id: "overview",
    name: "Platform Overview",
    description: "Get a comprehensive look at ReadyAimGo's capabilities",
    icon: "Play",
    color: "bg-blue-500",
    videoCount: 3,
  },
  {
    id: "beam-integration",
    name: "BEAM Integration",
    description: "See how our BEAM technology streamlines operations",
    icon: "Zap",
    color: "bg-purple-500",
    videoCount: 4,
  },
  {
    id: "operator-network",
    name: "Operator Network",
    description: "Discover the power of our operator ecosystem",
    icon: "Users",
    color: "bg-green-500",
    videoCount: 3,
  },
  {
    id: "real-estate",
    name: "Real Estate Solutions",
    description: "Specialized tools for property management",
    icon: "MapPin",
    color: "bg-orange-500",
    videoCount: 2,
  },
  {
    id: "analytics",
    name: "Analytics & Reporting",
    description: "Data-driven insights for your business",
    icon: "BarChart3",
    color: "bg-indigo-500",
    videoCount: 3,
  },
  {
    id: "mobile",
    name: "Mobile Experience",
    description: "ReadyAimGo on the go",
    icon: "Smartphone",
    color: "bg-pink-500",
    videoCount: 2,
  },
]

export const demoVideos: DemoVideo[] = [
  // Platform Overview
  {
    id: "overview-intro",
    title: "ReadyAimGo Platform Introduction",
    description: "A comprehensive 5-minute overview of the ReadyAimGo platform and its core features.",
    category: "overview",
    duration: "5:24",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/overview-intro",
    featured: true,
    tags: ["introduction", "overview", "getting-started"],
    createdAt: new Date("2024-01-15"),
    viewCount: 1250,
  },
  {
    id: "overview-benefits",
    title: "Key Benefits for Operators",
    description: "Learn how ReadyAimGo transforms operator workflows and increases profitability.",
    category: "overview",
    duration: "3:45",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/overview-benefits",
    featured: false,
    tags: ["benefits", "roi", "efficiency"],
    createdAt: new Date("2024-01-20"),
    viewCount: 890,
  },
  {
    id: "overview-success",
    title: "Customer Success Stories",
    description: "Real operators share their success stories with ReadyAimGo.",
    category: "overview",
    duration: "4:12",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/overview-success",
    featured: false,
    tags: ["testimonials", "success", "case-studies"],
    createdAt: new Date("2024-01-25"),
    viewCount: 675,
  },

  // BEAM Integration
  {
    id: "beam-intro",
    title: "BEAM Technology Overview",
    description: "Discover how BEAM technology powers the ReadyAimGo ecosystem.",
    category: "beam-integration",
    duration: "6:30",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/beam-intro",
    featured: true,
    tags: ["beam", "technology", "integration"],
    createdAt: new Date("2024-01-10"),
    viewCount: 1450,
  },
  {
    id: "beam-setup",
    title: "Setting Up BEAM Integration",
    description: "Step-by-step guide to connecting your systems with BEAM.",
    category: "beam-integration",
    duration: "8:15",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/beam-setup",
    featured: false,
    tags: ["setup", "configuration", "tutorial"],
    createdAt: new Date("2024-01-12"),
    viewCount: 980,
  },
  {
    id: "beam-sync",
    title: "Real-time Data Synchronization",
    description: "See how BEAM keeps all your data synchronized across platforms.",
    category: "beam-integration",
    duration: "4:45",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/beam-sync",
    featured: false,
    tags: ["sync", "real-time", "data"],
    createdAt: new Date("2024-01-18"),
    viewCount: 720,
  },
  {
    id: "beam-troubleshooting",
    title: "BEAM Troubleshooting Guide",
    description: "Common issues and solutions for BEAM integration.",
    category: "beam-integration",
    duration: "5:20",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/beam-troubleshooting",
    featured: false,
    tags: ["troubleshooting", "support", "help"],
    createdAt: new Date("2024-01-22"),
    viewCount: 540,
  },

  // Operator Network
  {
    id: "network-overview",
    title: "Operator Network Introduction",
    description: "Learn how to leverage the ReadyAimGo operator network for growth.",
    category: "operator-network",
    duration: "4:30",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/network-overview",
    featured: true,
    tags: ["network", "connections", "growth"],
    createdAt: new Date("2024-01-14"),
    viewCount: 1100,
  },
  {
    id: "network-matching",
    title: "Smart Job Matching",
    description: "How our AI matches operators with the perfect jobs.",
    category: "operator-network",
    duration: "3:55",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/network-matching",
    featured: false,
    tags: ["matching", "ai", "jobs"],
    createdAt: new Date("2024-01-16"),
    viewCount: 825,
  },
  {
    id: "network-collaboration",
    title: "Operator Collaboration Tools",
    description: "Collaborate effectively with other operators in your network.",
    category: "operator-network",
    duration: "5:10",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/network-collaboration",
    featured: false,
    tags: ["collaboration", "tools", "teamwork"],
    createdAt: new Date("2024-01-19"),
    viewCount: 650,
  },

  // Real Estate
  {
    id: "realestate-overview",
    title: "Real Estate Solutions Overview",
    description: "Specialized features for real estate professionals and property managers.",
    category: "real-estate",
    duration: "6:00",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/realestate-overview",
    featured: true,
    tags: ["real-estate", "property-management", "solutions"],
    createdAt: new Date("2024-01-11"),
    viewCount: 950,
  },
  {
    id: "realestate-maintenance",
    title: "Maintenance Request Workflow",
    description: "Streamline maintenance requests from tenants to completion.",
    category: "real-estate",
    duration: "4:25",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/realestate-maintenance",
    featured: false,
    tags: ["maintenance", "workflow", "automation"],
    createdAt: new Date("2024-01-17"),
    viewCount: 780,
  },

  // Analytics
  {
    id: "analytics-dashboard",
    title: "Analytics Dashboard Tour",
    description: "Explore the comprehensive analytics and reporting features.",
    category: "analytics",
    duration: "5:45",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/analytics-dashboard",
    featured: true,
    tags: ["analytics", "dashboard", "reporting"],
    createdAt: new Date("2024-01-13"),
    viewCount: 1050,
  },
  {
    id: "analytics-kpis",
    title: "Key Performance Indicators",
    description: "Track the metrics that matter most to your business.",
    category: "analytics",
    duration: "3:30",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/analytics-kpis",
    featured: false,
    tags: ["kpis", "metrics", "performance"],
    createdAt: new Date("2024-01-21"),
    viewCount: 690,
  },
  {
    id: "analytics-reports",
    title: "Custom Report Builder",
    description: "Create custom reports tailored to your business needs.",
    category: "analytics",
    duration: "4:15",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/analytics-reports",
    featured: false,
    tags: ["reports", "custom", "builder"],
    createdAt: new Date("2024-01-23"),
    viewCount: 580,
  },

  // Mobile
  {
    id: "mobile-app",
    title: "ReadyAimGo Mobile App",
    description: "Take ReadyAimGo with you wherever your business takes you.",
    category: "mobile",
    duration: "3:20",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/mobile-app",
    featured: false,
    tags: ["mobile", "app", "ios", "android"],
    createdAt: new Date("2024-01-24"),
    viewCount: 760,
  },
  {
    id: "mobile-features",
    title: "Mobile-First Features",
    description: "Features designed specifically for mobile operators.",
    category: "mobile",
    duration: "4:05",
    thumbnailUrl: "/placeholder.svg?height=200&width=350",
    videoUrl: "https://placeholder-video.com/mobile-features",
    featured: false,
    tags: ["mobile", "features", "gps", "offline"],
    createdAt: new Date("2024-01-26"),
    viewCount: 620,
  },
]

// Helper functions that will work with Supabase later
export const getVideosByCategory = (categoryId: string): DemoVideo[] => {
  return demoVideos.filter((video) => video.category === categoryId)
}

export const getFeaturedVideos = (): DemoVideo[] => {
  return demoVideos.filter((video) => video.featured)
}

export const searchVideos = (query: string): DemoVideo[] => {
  const lowercaseQuery = query.toLowerCase()
  return demoVideos.filter(
    (video) =>
      video.title.toLowerCase().includes(lowercaseQuery) ||
      video.description.toLowerCase().includes(lowercaseQuery) ||
      video.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)),
  )
}

export const getVideoById = (id: string): DemoVideo | undefined => {
  return demoVideos.find((video) => video.id === id)
}

export const incrementViewCount = (videoId: string): void => {
  // This will be replaced with Supabase update later
  const video = demoVideos.find((v) => v.id === videoId)
  if (video) {
    video.viewCount += 1
  }
}
