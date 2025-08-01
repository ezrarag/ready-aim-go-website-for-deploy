"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowRight, Star, Users, Briefcase, TrendingUp, CheckCircle, Zap, Shield, Globe, Play, User } from "lucide-react"
import StickyFloatingHeader from "@/components/ui/sticky-floating-header"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

// Operator Types Data

type OperatorType = {
  title: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  benefits: string[];
};

const operatorTypes: OperatorType[] = [
  {
    title: "Web Dev Operator",
    slug: "web-dev",
    shortDescription: "Help build client websites and internal tools.",
    longDescription: `As a Web Dev Operator, you will build production-grade tools, dashboards, and client-facing apps. You’ll also work with others to support codebases, integrate APIs, and help expand the ReadyAim Go product suite.\n\nYou receive fractional ownership in any system you help build, with paid opportunities introduced as revenue grows.`,
    benefits: [
      "Fractional ownership",
      "Build real apps used by clients",
      "Expand your dev portfolio",
      "Potential for paid compensation"
    ]
  },
  {
    title: "Property Manager",
    slug: "property-mgr",
    shortDescription: "Connect businesses to physical real estate. Manage leases, site access, etc.",
    longDescription: `As a Property Manager Operator, you connect businesses to real estate, manage leases, site access, and more.\n\nGain real estate exposure, possible commissions, and build your network.`,
    benefits: [
      "Real estate exposure",
      "Possible commissions",
      "Network building"
    ]
  },
  {
    title: "Driver / Pilot",
    slug: "driver",
    shortDescription: "Operate physical mobility assets (cars, planes) for high-value delivery.",
    longDescription: `As a Driver or Pilot Operator, you operate mobility assets for high-value delivery.\n\nEnjoy flexible work, income opportunities, and scalable contract operations.`,
    benefits: [
      "Flexible work",
      "Income opportunities",
      "Scalable contract operations"
    ]
  },
  {
    title: "Creative Operator",
    slug: "creative",
    shortDescription: "Assist with content design, branding, and visual identity.",
    longDescription: `As a Creative Operator, you assist with content design, branding, and visual identity.\n\nGrow your portfolio, take on creative leadership, and earn fractional equity in projects.`,
    benefits: [
      "Portfolio growth",
      "Creative leadership opportunities",
      "Fractional equity"
    ]
  },
  {
    title: "Community Builder",
    slug: "community",
    shortDescription: "Grow and manage our ecosystem: onboarding clients, partners, and feedback.",
    longDescription: `As a Community Builder, you grow and manage the ReadyAimGo ecosystem: onboarding clients, partners, and gathering feedback.\n\nEarn social capital, partner equity potential, and take on a leadership role.`,
    benefits: [
      "Social capital",
      "Partner equity potential",
      "Leadership role"
    ]
  },
];

function OperatorTypeGrid({ operatorTypes, onSelect }: { operatorTypes: OperatorType[], onSelect: (type: OperatorType) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {operatorTypes.map((type: OperatorType) => (
        <div
          key={type.slug}
          className="relative rounded-2xl overflow-hidden shadow-lg bg-white cursor-pointer group transition-transform border border-gray-200 hover:shadow-xl"
          onClick={() => onSelect(type)}
        >
          <div className="p-6 flex flex-col h-full justify-between">
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                {/* Icon could be dynamic per type if desired */}
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{type.title}</h3>
              <p className="text-gray-600 mb-4">{type.shortDescription}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-auto">
              {type.benefits.slice(0, 2).map((b: string) => (
                <span key={b} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs">{b}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function OperatorTypeModal({ type, open, onClose }: { type: OperatorType | null, open: boolean, onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && type && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-[100] flex flex-col justify-end"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-lg" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl p-8 m-4 flex flex-col mx-auto"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
          >
            <h2 className="text-2xl font-bold mb-2">{type.title}</h2>
            <p className="text-gray-700 mb-4 whitespace-pre-line">{type.longDescription}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {type.benefits.map((b: string) => (
                <span key={b} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">{b}</span>
              ))}
            </div>
            <button
              className="inline-block bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 transition mb-8 self-start"
              onClick={onClose}
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type Project = {
  id: number
  title: string
  description: string
  imageUrl: string
  liveUrl: string
  tags: string[]
}

function ProjectGrid({ projects, onSelect }: { projects: Project[]; onSelect: (project: Project) => void }) {
  if (!projects) return null;
  if (projects.length === 0) return <div className="text-center text-gray-500 py-12">No projects found.</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {projects.map((project: Project) => (
        <div
          key={project.id}
          className="relative rounded-2xl overflow-hidden shadow-lg bg-white cursor-pointer group transition-transform"
          onClick={() => onSelect(project)}
        >
          {/* Website screenshot as card background */}
          <img
            src={`https://api.microlink.io/?url=${encodeURIComponent(project.liveUrl)}&screenshot=true&meta=false&embed=screenshot.url&colorScheme=light`}
            alt={project.title}
            className="absolute inset-0 w-full h-full object-cover z-0"
            onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
          />
          {/* Overlay on hover */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            initial={false}
            animate={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
          >
            <button className="bg-white text-black rounded-2xl px-8 py-4 text-lg font-medium shadow-lg flex items-center gap-2">
              <span className="mr-2">→</span> VOTE NOW
            </button>
          </motion.div>
          {/* Card content (bottom left) */}
          <div className="absolute left-6 bottom-6 flex items-center gap-3 z-20">
            <div className="w-10 h-10 rounded-full bg-black/80 flex items-center justify-center">
              <User className="text-white w-6 h-6" />
            </div>
            <div className="text-white text-lg font-semibold drop-shadow">{project.title}</div>
          </div>
          {/* Bottom right icons (on hover) */}
          <div className="absolute right-6 bottom-6 flex items-center gap-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-white text-2xl">
              ↗
            </a>
            <button className="text-white text-2xl">🔖</button>
          </div>
          {/* Card background (for non-hover state) */}
          <div className="w-full h-[320px]" />
        </div>
      ))}
    </div>
  )
}

// WebsiteScreenshotPreview: Shows a live preview of a website using microlink.io
function WebsiteScreenshotPreview({ url }: { url: string }) {
  if (!url) return null;
  return (
    <div className="w-full flex justify-center my-6">
      <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full max-w-xl rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
        <img
          src={`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url&colorScheme=light`}
          alt="Website preview"
          className="w-full h-64 object-cover bg-gray-100"
          onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
        />
      </a>
    </div>
  );
}

function ProjectModal({ project, open, onClose }: { project: Project | null, open: boolean, onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && project && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-[100] flex flex-col justify-end"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-lg" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-3xl bg-white rounded-t-3xl shadow-2xl p-8 m-4 flex flex-col mx-auto"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
          >
            {/* Only show website screenshot as main visual */}
            <div className="w-full flex justify-center mb-6">
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="block w-full max-w-xl rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
                <img
                  src={`https://api.microlink.io/?url=${encodeURIComponent(project.liveUrl)}&screenshot=true&meta=false&embed=screenshot.url&colorScheme=light`}
                  alt="Website preview"
                  className="w-full h-64 object-cover bg-gray-100"
                  onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
                />
              </a>
            </div>
            <h2 className="text-2xl font-bold mb-2">{project.title}</h2>
            <p className="text-gray-700 mb-4">{project.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {project.tags.map((tag: string) => (
                <span key={tag} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs">{tag}</span>
              ))}
            </div>
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 transition mb-8"
            >
              Get Started
            </a>
            {/* Bottom menu bar */}
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <div className="flex gap-4">
                <button className="text-gray-500 font-medium">Placeholder 1</button>
                <button className="text-gray-500 font-medium">Placeholder 2</button>
              </div>
              <button className="text-2xl font-bold text-gray-700 hover:text-black" onClick={onClose} aria-label="Close">×</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// PlatformFeatureMenu: Custom menu for platform feature modals
function PlatformFeatureMenu({ onClose }: { onClose?: () => void }) {
  return (
    <div className="absolute left-1/2 bottom-8 transform -translate-x-1/2 z-50 max-w-2xl w-full px-4 pointer-events-none">
      <div className="flex items-center bg-neutral-800 rounded-2xl shadow-lg px-2 py-2 gap-2 relative z-10 pointer-events-auto w-full justify-center">
        {/* Logo */}
        <div className="bg-neutral-900 rounded-xl w-16 h-16 flex items-center justify-center text-white text-3xl font-bold mr-2">
          W.
        </div>
        {/* Menu Buttons */}
        <button className="bg-neutral-700 text-white rounded-xl px-6 py-4 text-lg font-medium mx-1">Website</button>
        <button className="bg-neutral-700 text-white rounded-xl px-6 py-4 text-lg font-medium mx-1">Apps</button>
        <button className="bg-neutral-700 text-white rounded-xl px-6 py-4 text-lg font-medium mx-1">SmartTech</button>
        {/* Get Started Button */}
        <a href="#" className="bg-yellow-300 text-black rounded-xl px-8 py-4 text-lg font-semibold ml-2 hover:bg-yellow-200 transition-colors">Start</a>
      </div>
      {/* Close Button (X) */}
      <DialogClose asChild>
        <button
          className="absolute -right-20 top-1/2 -translate-y-1/2 bg-neutral-800 rounded-xl w-16 h-16 flex items-center justify-center text-white text-4xl font-bold shadow-lg hover:bg-neutral-700 transition-colors z-20 pointer-events-auto"
          aria-label="Close"
          onClick={onClose}
        >
          &times;
        </button>
      </DialogClose>
    </div>
  )
}

// Platform features data for cards and modals
const platformFeatures = [
  {
    icon: <Users className="h-6 w-6 text-blue-600" />, bg: "bg-blue-100", title: "Client Dashboard", desc: "Manage projects, track progress, and collaborate with operators in one unified interface.", modal: "Placeholder for Client Dashboard details." },
  {
    icon: <Briefcase className="h-6 w-6 text-green-600" />, bg: "bg-green-100", title: "Operator Marketplace", desc: "Browse and connect with verified creative professionals across all disciplines.", modal: "Placeholder for Operator Marketplace details." },
  {
    icon: <Globe className="h-6 w-6 text-purple-600" />, bg: "bg-purple-100", title: "Website Generator", desc: "Auto-generated websites with integrated storefronts and content management.", modal: "Placeholder for Website Generator details." },
  {
    icon: <Zap className="h-6 w-6 text-yellow-600" />, bg: "bg-yellow-100", title: "BEAM Operations", desc: "Automated workflow management connecting clients and operators seamlessly.", modal: "Placeholder for BEAM Operations details." },
  {
    icon: <TrendingUp className="h-6 w-6 text-red-600" />, bg: "bg-red-100", title: "Analytics & Insights", desc: "Comprehensive analytics to track performance and optimize your creative operations.", modal: "Placeholder for Analytics & Insights details." },
  {
    icon: <Shield className="h-6 w-6 text-indigo-600" />, bg: "bg-indigo-100", title: "Secure & Reliable", desc: "Enterprise-grade security with 99.9% uptime and comprehensive data protection.", modal: "Placeholder for Secure & Reliable details." },
]

// Login Modal Component
function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent('/dashboard/client')}`
        }
      })
      
      if (error) {
        throw error
      }
      
      onClose()
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      setIsGoogleLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl p-8">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl font-bold">ReadyAimGo Access</DialogTitle>
          <DialogDescription>Sign in with your Google account to access the platform</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Connect with our platform to start your journey.
            </p>
          </div>

          <Button
            type="button"
            className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-3 font-semibold shadow-sm h-12"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Signing in with Google...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <g>
                    <path d="M44.5 20H24v8.5h11.7C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 6 .9 8.3 2.7l6.2-6.2C34.2 4.5 29.3 2.5 24 2.5c-6.6 0-12.2 2.7-16.2 7.2z" fill="#FFC107"/>
                    <path d="M6.3 14.7l7 5.1C15.1 17.1 19.2 14 24 14c3.1 0 6 .9 8.3 2.7l6.2-6.2C34.2 4.5 29.3 2.5 24 2.5c-6.6 0-12.2 2.7-16.2 7.2z" fill="#FF3D00"/>
                    <path d="M24 43.5c5.7 0 10.6-1.9 14.5-5.2l-6.7-5.5C29.8 37 24 37 24 37c-5.8 0-10.7-3.1-13.2-7.5l-7 5.4C7.8 40.8 15.3 43.5 24 43.5z" fill="#4CAF50"/>
                    <path d="M44.5 20H24v8.5h11.7c-1.2 3.2-4.2 6.5-11.7 6.5-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 6 .9 8.3 2.7l6.2-6.2C34.2 4.5 29.3 2.5 24 2.5c-6.6 0-12.2 2.7-16.2 7.2z" fill="#1976D2"/>
                  </g>
                </svg>
                Sign in with Google
              </>
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Secure authentication powered by Google.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [projectModal, setProjectModal] = useState<Project | null>(null)
  const [operatorTypeModal, setOperatorTypeModal] = useState<OperatorType | null>(null)
  const [operatorModalOpen, setOperatorModalOpen] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const router = useRouter()

  // Handler for login modal
  const handleLogin = useCallback(async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // User not logged in, open login modal
        setLoginModalOpen(true)
        return
      }

      // User is logged in, redirect directly to client dashboard
      router.push('/dashboard/client')
    } catch (error) {
      console.error('Error checking user status:', error)
      // Fallback to login modal if there's an error
      setLoginModalOpen(true)
    }
  }, [router])

  // Handler for demo video
  const handleShowDemo = useCallback(() => {
    setShowDemo(true)
  }, [])
  const handleHideDemo = useCallback(() => {
    setShowDemo(false)
  }, [])

  const menuGroups = [
    [
      { label: "Menu 1", onClick: () => {}, icon: null },
      { label: "Menu 2", onClick: () => {}, icon: null },
    ],
    [
      { label: "I'm interested", onClick: handleLogin, primary: true },
    ],
  ]

  // Check if user is authenticated and has completed onboarding
  useEffect(() => {
    async function checkAuthAndOnboarding() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('contract_accepted_at, stripe_customer_id, is_demo_client')
          .eq('id', user.id)
          .single()
        if (profile && (profile.contract_accepted_at && (profile.stripe_customer_id || profile.is_demo_client))) {
          router.replace('/dashboard/client')
        }
      }
    }
    checkAuthAndOnboarding()
  }, [router])

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from("projects").select("*")
        if (error) {
          console.error('Error fetching projects:', error)
          setProjects([])
        } else {
          // If tags is a comma-separated string, convert to array
          const normalized = (data || []).map((p: any) => ({
            ...p,
            liveUrl: p.live_url, // ✅ key fix
            imageUrl: p.image_url,
            createdAt: p.created_at,
            tags: Array.isArray(p.tags)
              ? p.tags
              : typeof p.tags === "string"
              ? p.tags.split(",").map((t: string) => t.trim())
              : [],
          }))
          setProjects(normalized)
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
        setProjects([])
      }
      setLoading(false)
    }
    fetchProjects()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 relative">
      <StickyFloatingHeader pageTitle="Home" onInterested={handleLogin} />
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-8 z-10">
        <Card className="bg-white rounded-2xl overflow-hidden shadow-2xl transition-opacity duration-700 border-0">
          <div className={`relative w-full ${showDemo ? 'aspect-video min-h-[400px] p-0' : 'px-8 py-24 lg:py-32 min-h-[400px]' } flex items-center justify-center`}>
            <AnimatePresence>
              {showDemo ? (
                <motion.div
                  key="demo-video"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                  className="absolute inset-0 w-full h-full flex items-center justify-center"
                  style={{ borderRadius: 'inherit', overflow: 'hidden' }}
                >
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                    src="https://fnaasdxpkrhjmotiemog.supabase.co/storage/v1/object/public/bucket/homepage/first-draft.mp4"
                    style={{ pointerEvents: 'auto' }}
                  />
                  <motion.button
                    key="close-demo"
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ duration: 0.5 }}
                    className="absolute top-4 right-4 z-20 bg-black/70 text-white rounded-full p-3 shadow-lg hover:bg-black"
                    onClick={handleHideDemo}
                    aria-label="Close demo video"
                  >
                    ×
                  </motion.button>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {!showDemo && (
              <div className="max-w-4xl w-full">
                {/* Static text without animations */}
                <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                  READY
                  <br />
                  <span className="text-indigo-600">AIM</span>
                  <br />
                  GO
                </h1>
                <p className="text-xl text-gray-700 mb-8 max-w-2xl leading-relaxed">
                  Full Stack Virtual Asset Management
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <Button
                    size="lg"
                    className="bg-black text-white hover:bg-gray-900 rounded-full px-8 py-4 text-lg font-semibold"
                    onClick={handleShowDemo}
                  >
                    <Play className="mr-2 h-5 w-5" />
                    <span className="text-white">Watch Demo</span>
                  </Button>
                </div>
                {/* Stats */}
                <HomeStats />
              </div>
            )}
          </div>

          {/* Floating testimonials */}
          <HomeTestimonials />
        </Card>
      </section>

      {/* Login Modal */}
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  )
}



function HomeStats() {
  const [stats, setStats] = useState({
    projectsComplete: 0,
    activeOperators: 0,
    creatorValue: 0,
    loading: true,
  });
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (!mounted) return;
    
    async function fetchStats() {
      try {
        // Projects Complete
        const { count: projectsComplete } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');
        // Active Operators
        const { data: operatorIds } = await supabase
          .from('projects')
          .select('operator_id')
          .neq('operator_id', null);
        const uniqueOperators = new Set((operatorIds || []).map(p => p.operator_id));
        const activeOperators = uniqueOperators.size;
        // Creator Value
        const { data: completedProjects } = await supabase
          .from('projects')
          .select('budget')
          .eq('status', 'completed');
        const creatorValue = (completedProjects || []).reduce((sum, p) => sum + (p.budget || 0), 0);
        setStats({
          projectsComplete: projectsComplete || 0,
          activeOperators,
          creatorValue,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({
          projectsComplete: 0,
          activeOperators: 0,
          creatorValue: 0,
          loading: false,
        });
      }
    }
    fetchStats();
  }, [mounted]);
  
  // Return static content during SSR to prevent hydration mismatch
  if (!mounted || stats.loading) {
    return (
      <div className="grid grid-cols-3 gap-8">
        <div>
          <div className="text-4xl font-bold text-gray-900 mb-1">0</div>
          <div className="text-gray-500 font-medium">Projects Complete</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900 mb-1">0</div>
          <div className="text-gray-500 font-medium">Active Operators</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900 mb-1">$0</div>
          <div className="text-gray-500 font-medium">Creator Value</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-3 gap-8">
      <div>
        <div className="text-4xl font-bold text-gray-900 mb-1">{stats.projectsComplete}</div>
        <div className="text-gray-500 font-medium">Projects Complete</div>
      </div>
      <div>
        <div className="text-4xl font-bold text-gray-900 mb-1">{stats.activeOperators}</div>
        <div className="text-gray-500 font-medium">Active Operators</div>
      </div>
      <div>
        <div className="text-4xl font-bold text-gray-900 mb-1">${stats.creatorValue.toLocaleString()}</div>
        <div className="text-gray-500 font-medium">Creator Value</div>
      </div>
    </div>
  );
}

function HomeTestimonials() {
  const [testimonials, setTestimonials] = useState<any[] | null>(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (!mounted) return;
    
    async function fetchTestimonials() {
      try {
        // Try to fetch from Supabase
        const { data, error } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          setTestimonials(data);
        } else {
          // Fallback to static testimonials
          setTestimonials([
            { name: "Jane Doe", avatar: "/placeholder.svg", rating: 5, text: "ReadyAimGo made my project a breeze!" },
            { name: "Sam Miller", avatar: "/placeholder.svg", rating: 5, text: "The operator network is top notch." },
            { name: "Alex Lee", avatar: "/placeholder.svg", rating: 5, text: "I love the BEAM platform!" },
          ]);
        }
      } catch (error) {
        console.error('Error fetching testimonials:', error);
        // Fallback to static testimonials
        setTestimonials([
          { name: "Jane Doe", avatar: "/placeholder.svg", rating: 5, text: "ReadyAimGo made my project a breeze!" },
          { name: "Sam Miller", avatar: "/placeholder.svg", rating: 5, text: "The operator network is top notch." },
          { name: "Alex Lee", avatar: "/placeholder.svg", rating: 5, text: "I love the BEAM platform!" },
        ]);
      }
    }
    fetchTestimonials();
  }, [mounted]);
  
  // Return null during SSR to prevent hydration mismatch
  if (!mounted || !testimonials) return null;
  return (
    <div className="absolute bottom-8 right-8 hidden lg:block">
      <Card className="bg-white/10 backdrop-blur-md border-white/20 text-gray-900 p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex -space-x-2">
            {testimonials.map((t, i) => (
              <Avatar key={i} className="w-8 h-8 border-2 border-white">
                <AvatarImage src={t.avatar} />
                <AvatarFallback>{t.name.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="text-sm">
            <div className="flex items-center">
              <span className="font-semibold">{testimonials.length}+ Featured</span>
              <div className="flex ml-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
            <div className="text-xs text-gray-500">5/5 Rating</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
