"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowRight, ChevronLeft, Globe, Briefcase } from "lucide-react"
import StickyFloatingHeader from "@/components/ui/sticky-floating-header"
import { Hero } from "@/components/landing/hero"

type Project = {
  id: string
  title: string
  description: string
  liveUrl?: string
  imageUrl?: string
  tags?: string[]
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showProjectsModal, setShowProjectsModal] = useState(false)
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get story from URL params or localStorage
  const getStoryFromUrl = () => {
    const storyParam = searchParams?.get('story')
    if (storyParam) {
      // Save to localStorage when coming from URL
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastViewedStory', storyParam)
      }
      return storyParam
    }
    return undefined
  }
  
  const initialStory = getStoryFromUrl()

  const handleLogin = useCallback(async () => {
    router.push('/login')
  }, [router])

  const handleVideoPlay = useCallback(() => {
    // Optional: Handle video play if needed
  }, [])

  const handleViewProjects = useCallback(() => {
    // Scroll to projects section or show modal
    const projectsSection = document.getElementById('projects')
    if (projectsSection) {
      projectsSection.scrollIntoView({ behavior: 'smooth' })
    } else {
      setCurrentProjectIndex(0)
      setShowProjectsModal(true)
    }
  }, [])

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projects: Project[] = []

        // Try Vercel API
        try {
          const vercelResponse = await fetch('/api/pulse/vercel')
          if (vercelResponse.ok) {
            const vercelData = await vercelResponse.json()
            if (vercelData.events && Array.isArray(vercelData.events)) {
              vercelData.events.forEach((event: any) => {
                if (event.data && event.data.type === 'deployment' && event.data.url) {
                  const project = {
                    id: event.data.uid || event.data.url,
                    title: event.data.name?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Vercel Deployment',
                    description: event.data.commitMessage || `Deployed ${event.data.target || 'preview'} version`,
                    liveUrl: event.data.url,
                    imageUrl: `https://api.microlink.io/?url=${encodeURIComponent(event.data.url)}&screenshot=true&meta=false&embed=screenshot.url&colorScheme=light`,
                    tags: ['Deployment', event.data.target || 'preview']
                  }
                  projects.push(project)
                }
              })
            }
          }
        } catch (error) {
          console.error('Vercel API error:', error)
        }

        // Fallback projects if none found
        if (projects.length === 0) {
          projects.push(
            {
              id: '1',
              title: 'ReadyAimGo Platform',
              description: 'The main ReadyAimGo platform connecting operators to business opportunities',
              liveUrl: 'https://readyaimgo.com',
              tags: ['Platform', 'React', 'Next.js']
            }
          )
        }

        setProjects(projects)
      } catch (error) {
        console.error('Error fetching projects:', error)
        setProjects([])
      }
    }
    fetchProjects()
  }, [])

  // Keyboard navigation for projects gallery
  useEffect(() => {
    if (!showProjectsModal) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setCurrentProjectIndex((prev) => (prev - 1 + projects.length) % projects.length)
          break
        case 'ArrowRight':
          e.preventDefault()
          setCurrentProjectIndex((prev) => (prev + 1) % projects.length)
          break
        case 'Escape':
          e.preventDefault()
          setShowProjectsModal(false)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showProjectsModal, projects.length])

  return (
    <div className="h-screen overflow-hidden bg-black relative">
      <Hero 
        onWatchDemo={() => {}} 
        onViewProjects={handleViewProjects}
        initialStory={initialStory}
      />
      
      <div className="relative z-40">
        <StickyFloatingHeader 
          pageTitle="Home" 
          onInterested={handleLogin} 
          onVideoPlay={handleVideoPlay} 
        />
      </div>

      {/* Projects Photo Gallery Lightbox Modal */}
      <Dialog open={showProjectsModal} onOpenChange={setShowProjectsModal}>
        <DialogContent className="w-full h-screen max-w-none p-0 bg-black">
          <DialogTitle className="sr-only">Projects Gallery</DialogTitle>
          <div className="relative w-full h-full">
            <div className="absolute inset-0 group">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentProjectIndex((prev) => (prev - 1 + projects.length) % projects.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/70 text-white rounded-full flex items-center justify-center opacity-60 group-hover:opacity-100 transition-all duration-200 hover:bg-black hover:scale-110"
                aria-label="Previous project"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              
              {/* Next Button */}
              <button
                onClick={() => setCurrentProjectIndex((prev) => (prev + 1) % projects.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/70 text-white rounded-full flex items-center justify-center opacity-60 group-hover:opacity-100 transition-all duration-200 hover:bg-black hover:scale-110"
                aria-label="Next project"
              >
                <ArrowRight className="h-6 w-6" />
              </button>
              
              {/* Close Button */}
              <button
                onClick={() => setShowProjectsModal(false)}
                className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/70 text-white rounded-full flex items-center justify-center opacity-60 group-hover:opacity-100 transition-all duration-200 hover:bg-black hover:scale-110"
                aria-label="Close gallery"
              >
                ×
              </button>
              
              {/* Project Counter */}
              <div className="absolute top-4 left-4 z-20 bg-black/70 text-white px-3 py-1 rounded-full text-sm opacity-60 group-hover:opacity-100 transition-all duration-200">
                {currentProjectIndex + 1} / {projects.length}
              </div>
              
              {/* Project Title and Description */}
              <div className="absolute bottom-4 left-4 z-20 bg-black/70 text-white px-4 py-3 rounded-lg opacity-60 group-hover:opacity-100 transition-all duration-200 max-w-md">
                <h3 className="font-semibold text-lg mb-2">{projects[currentProjectIndex]?.title}</h3>
                {projects[currentProjectIndex]?.description && (
                  <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                    {projects[currentProjectIndex].description}
                  </p>
                )}
                
                {/* Website URL Display */}
                {projects[currentProjectIndex]?.liveUrl && (
                  <div className="flex items-center gap-2 text-blue-300 text-sm">
                    <Globe className="h-4 w-4" />
                    <span className="truncate">
                      {projects[currentProjectIndex].liveUrl?.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Live Site Link */}
              {projects[currentProjectIndex]?.liveUrl && (
                <div className="absolute bottom-4 right-4 z-20 opacity-60 group-hover:opacity-100 transition-all duration-200">
                  <a
                    href={projects[currentProjectIndex].liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Visit Live Site →
                  </a>
                </div>
              )}
            </div>
            
            {/* Main Project Image */}
            <div className="w-full h-full flex items-center justify-center">
              {projects.length > 0 ? (
                <div className="relative w-full h-full">
                  {projects[currentProjectIndex]?.liveUrl ? (
                    <img
                      src={`https://api.microlink.io/?url=${encodeURIComponent(projects[currentProjectIndex].liveUrl)}&screenshot=true&meta=false&embed=screenshot.url&colorScheme=light`}
                      alt={projects[currentProjectIndex].title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.jpg'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-white">
                        <Briefcase className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400 text-xl">{projects[currentProjectIndex]?.title}</p>
                        <p className="text-gray-500 text-sm">No preview available</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-white">
                  <Briefcase className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-xl">No projects available</p>
                  <p className="text-gray-400 text-sm">Check back later for new projects</p>
                </div>
              )}
            </div>
            
            {/* Dots Navigation */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {projects.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentProjectIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentProjectIndex 
                      ? 'bg-white scale-125' 
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to project ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
