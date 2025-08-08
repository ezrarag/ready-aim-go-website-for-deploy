"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowRight, Star, Users, Briefcase, TrendingUp, CheckCircle, Zap, Shield, Globe, Play, User, ChevronLeft } from "lucide-react"
import StickyFloatingHeader from "@/components/ui/sticky-floating-header"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { GoogleMaps } from "@/components/google-maps";

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

function ProjectCarousel({ projects, onSelect }: { projects: Project[]; onSelect: (project: Project) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Auto-rotate carousel
  useEffect(() => {
    if (projects.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % projects.length);
    }, 5000); // Change every 5 seconds
    
    return () => clearInterval(interval);
  }, [projects.length]);
  
  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-500">No projects available</p>
      </div>
    );
  }
  
  const currentProject = projects[currentIndex];
  
  const nextProject = () => {
    setCurrentIndex((prev) => (prev + 1) % projects.length);
  };
  
  const prevProject = () => {
    setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
  };
  
  return (
    <div className="relative group w-full h-full">
      {/* Project Image Only - Visible by default */}
      <div className="relative w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg overflow-hidden">
        {currentProject.liveUrl ? (
          <img 
            src={`https://api.microlink.io/?url=${encodeURIComponent(currentProject.liveUrl)}&screenshot=true&meta=false&embed=screenshot.url&colorScheme=light`}
            alt={currentProject.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              // Hide the image if it fails to load
              e.currentTarget.style.display = 'none';
              console.log('Failed to load project screenshot:', currentProject.liveUrl);
            }}
            onLoad={() => {
              console.log('Successfully loaded project screenshot:', currentProject.liveUrl);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Briefcase className="h-12 w-12 text-purple-400 mx-auto mb-2" />
              <p className="text-purple-600 font-medium">{currentProject.title}</p>
            </div>
          </div>
        )}
        
        {/* Overlay with project info - visible on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end">
          <div className="p-4 text-white w-full">
            <h3 className="font-semibold text-lg mb-2">{currentProject.title}</h3>
            <p className="text-sm text-gray-200 line-clamp-2 mb-3">{currentProject.description}</p>
            
            {/* Tags */}
            {currentProject.tags && currentProject.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentProject.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-white/20 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Navigation - Always visible but subtle */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex gap-1">
          {projects.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Arrow Navigation - Visible on hover */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Button
          variant="outline"
          size="sm"
          onClick={prevProject}
          disabled={projects.length <= 1}
          className="w-8 h-8 p-0 bg-white/80 hover:bg-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={nextProject}
          disabled={projects.length <= 1}
          className="w-8 h-8 p-0 bg-white/80 hover:bg-white"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Click to view details */}
      <button
        onClick={() => onSelect(currentProject)}
        className="absolute inset-0"
        aria-label="View project details"
      />
    </div>
  );
}

function ProjectMap({ projects, onSelect }: { projects: Project[]; onSelect: (project: Project) => void }) {
  const [projectLocations, setProjectLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [useGoogleMaps, setUseGoogleMaps] = useState(false);
  
  useEffect(() => {
    async function fetchProjectLocations() {
      try {
        // First check if the project_locations table exists
        const { data: tableCheck, error: tableError } = await supabase
          .from('project_locations')
          .select('id')
          .limit(1);
        
        if (tableError) {
          console.log('Project locations table not found, using fallback data');
          // Use fallback data if table doesn't exist
          const fallbackLocations = [
            { id: 1, city: "San Francisco", country: "USA", latitude: 37.7749, longitude: -122.4194, projectCount: 3 },
            { id: 2, city: "New York", country: "USA", latitude: 40.7128, longitude: -74.0060, projectCount: 2 },
            { id: 3, city: "London", country: "UK", latitude: 51.5074, longitude: -0.1278, projectCount: 1 },
            { id: 4, city: "Toronto", country: "Canada", latitude: 43.6532, longitude: -79.3832, projectCount: 2 },
            { id: 5, city: "Berlin", country: "Germany", latitude: 52.5200, longitude: 13.4050, projectCount: 1 },
          ];
          setProjectLocations(fallbackLocations);
          setLoading(false);
          return;
        }
        
        // If table exists, fetch real data
        const { data, error } = await supabase
          .from('project_locations')
          .select(`
            *,
            projects (
              id,
              title,
              description,
              status
            )
          `);
        
        if (error) {
          console.error('Error fetching project locations:', error);
          return;
        }
        
        // Group by city and count projects
        const locationMap = new Map();
        data?.forEach((location) => {
          const key = `${location.city}-${location.country}`;
          if (locationMap.has(key)) {
            locationMap.get(key).projects.push(location.projects);
          } else {
            locationMap.set(key, {
              id: location.id,
              city: location.city,
              country: location.country,
              latitude: location.latitude,
              longitude: location.longitude,
              projects: [location.projects]
            });
          }
        });
        
        const locations = Array.from(locationMap.values()).map(location => ({
          ...location,
          projectCount: location.projects.length
        }));
        
        setProjectLocations(locations);
      } catch (error) {
        console.error('Error fetching project locations:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProjectLocations();
  }, []);
  
  if (loading) {
    return (
      <div className="relative">
        <div className="relative h-96 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading project locations...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use Google Maps if enabled and API key is available
  if (useGoogleMaps && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="relative">
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => setUseGoogleMaps(false)}
            className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 text-sm font-medium hover:bg-white transition-colors"
          >
            Switch to Custom Map
          </button>
        </div>
        <GoogleMaps 
          locations={projectLocations} 
          onLocationClick={(location) => {
            // Handle location click - could open a modal or navigate
            console.log('Location clicked:', location);
          }}
          height="600px"
        />
      </div>
    );
  }

  // Custom map implementation
  return (
    <div className="relative">
      {/* Map Toggle Button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => setUseGoogleMaps(true)}
          className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 text-sm font-medium hover:bg-white transition-colors"
        >
          Switch to Google Maps
        </button>
      </div>

      {/* Google Maps Style Container */}
      <div className="relative h-[600px] bg-gray-100 overflow-hidden">
        {/* Google Maps Style Background */}
        <div className="absolute inset-0 bg-gray-50">
          {/* Ocean */}
          <div className="absolute inset-0 bg-blue-100/20"></div>
          
          {/* Continents with realistic shapes */}
          <div className="absolute top-1/4 left-1/5 w-1/4 h-1/3 bg-green-200/60 rounded-tl-3xl rounded-tr-2xl rounded-bl-2xl rounded-br-3xl"></div>
          <div className="absolute top-1/3 right-1/6 w-1/5 h-1/4 bg-green-200/60 rounded-tl-2xl rounded-tr-3xl rounded-bl-3xl rounded-br-2xl"></div>
          <div className="absolute bottom-1/4 left-1/3 w-1/6 h-1/5 bg-green-200/60 rounded-tl-3xl rounded-tr-2xl rounded-bl-2xl rounded-br-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-1/8 h-1/8 bg-green-200/60 rounded-full"></div>
          
          {/* Roads and highways */}
          <div className="absolute top-1/3 left-1/4 w-1/3 h-0.5 bg-gray-300/40"></div>
          <div className="absolute top-2/3 left-1/6 w-1/4 h-0.5 bg-gray-300/40"></div>
          <div className="absolute top-1/2 left-1/3 w-0.5 h-1/4 bg-gray-300/40"></div>
          
          {/* City blocks and buildings */}
          <div className="absolute top-1/4 left-1/3 w-1/12 h-1/12 bg-gray-300/30 rounded"></div>
          <div className="absolute top-1/3 left-2/3 w-1/12 h-1/12 bg-gray-300/30 rounded"></div>
          <div className="absolute top-2/3 left-1/4 w-1/12 h-1/12 bg-gray-300/30 rounded"></div>
          
          {/* Grid lines like Google Maps */}
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={`h-${i}`} className="absolute w-full h-px bg-gray-400" style={{ top: `${i * 5}%` }}></div>
            ))}
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={`v-${i}`} className="absolute h-full w-px bg-gray-400" style={{ left: `${i * 5}%` }}></div>
            ))}
          </div>
        </div>
        
        {/* Project Hotspots with Google Maps Style Pins */}
        {projectLocations.map((location, index) => (
          <div
            key={location.id}
            className="absolute group cursor-pointer"
            style={{
              left: `${15 + (index * 18)}%`,
              top: `${25 + (index * 12)}%`,
            }}
          >
            {/* Google Maps Style Pin */}
            <div className="relative">
              {/* Pin shadow */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-2 bg-black/20 rounded-full blur-sm"></div>
              
              {/* Pin body */}
              <div className="relative">
                <div className="w-6 h-6 bg-purple-600 rounded-full shadow-lg animate-pulse border-2 border-white"></div>
                <div className="w-10 h-10 bg-purple-600/20 rounded-full absolute -top-2 -left-2 animate-ping"></div>
                
                {/* Pin point */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-purple-600"></div>
              </div>
              
              {/* Enhanced Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                <div className="bg-white text-gray-900 text-sm rounded-lg px-4 py-3 shadow-xl border border-gray-200 whitespace-nowrap">
                  <div className="font-semibold text-purple-600">{location.city}</div>
                  <div className="text-gray-600">{location.projectCount} active projects</div>
                  <div className="text-xs text-gray-500 mt-1">{location.country}</div>
                </div>
                <div className="w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1.5"></div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Google Maps Style Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
            <span className="text-lg">+</span>
          </button>
          <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
            <span className="text-lg">−</span>
          </button>
        </div>
        
        {/* Google Maps Style Legend */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <div className="relative">
              <div className="w-4 h-4 bg-purple-600 rounded-full border-2 border-white"></div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-4 border-l-transparent border-r-transparent border-t-purple-600"></div>
            </div>
            <span className="font-medium">Project Locations</span>
          </div>
        </div>
        
        {/* Location Stats - Google Maps Style */}
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-gray-200">
          <div className="text-sm text-gray-700">
            <div className="font-semibold mb-1">Active Projects</div>
            <div className="grid grid-cols-2 gap-3">
              {projectLocations.slice(0, 4).map((location) => (
                <div key={location.id} className="text-center">
                  <div className="text-lg font-bold text-purple-600">{location.projectCount}</div>
                  <div className="text-xs text-gray-600">{location.city}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectGrid({ projects, onSelect }: { projects: Project[]; onSelect: (project: Project) => void }) {
  if (!projects) return null;
  if (projects.length === 0) return <div className="text-center text-gray-500 py-12">No projects found.</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {projects.map((project: Project) => (
        <div
          key={project.id}
          className="relative rounded-2xl overflow-hidden shadow-lg bg-white cursor-pointer group transition-transform hover:scale-105"
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
          <div className="w-full h-[400px]" />
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
                  onError={e => { 
                    (e.target as HTMLImageElement).src = '/placeholder.jpg'; 
                    console.log('Failed to load screenshot for:', project.liveUrl);
                  }}
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
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent('/dashboard')}`
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

  // Check authentication and onboarding status
  useEffect(() => {
    async function checkAuthAndOnboarding() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Check if user has completed onboarding
          const { data: profile } = await supabase
            .from('profiles')
            .select('contract_accepted_at, is_demo_client')
            .eq('id', user.id)
            .single()
          
          if (profile && (profile.contract_accepted_at || profile.is_demo_client)) {
            // User has completed onboarding, redirect to dashboard
            router.replace('/dashboard/client')
          } else {
            // User needs to complete onboarding
            router.replace('/onboarding')
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
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

      {/* Recent Projects Card Section */}
      {projects.length > 0 && (
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-xl border-0 overflow-hidden">
              <div className="p-8 lg:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  {/* Left Section - Text Content */}
                  <div className="space-y-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-purple-600" />
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                        Recent Projects
                      </h2>
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-lg font-semibold text-gray-900">
                        See what our operators have been building
                      </p>
                      <p className="text-gray-600 leading-relaxed">
                        Discover the latest projects completed by our talented operators. From web applications to mobile apps, each project showcases our commitment to quality and innovation.
                      </p>
                    </div>
                    
                    <div className="flex gap-4">
                      <Link href="/dashboard/client">
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                          View All Projects
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Right Section - Project Carousel */}
                  <div className="relative -m-8 lg:-m-12">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden h-full">
                      <ProjectCarousel projects={projects.slice(0, 6)} onSelect={setProjectModal} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}
      
      {/* Project Locations Map Card */}
      <section className="px-4 sm:px-6 lg:px-8 -mt-8 mb-16">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
            <ProjectMap projects={projects} onSelect={setProjectModal} />
          </Card>
        </div>
      </section>

      {/* Login Modal */}
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      
      {/* Project Modal */}
      <ProjectModal 
        project={projectModal} 
        open={!!projectModal} 
        onClose={() => setProjectModal(null)} 
      />
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
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (!mounted) return;
    
    async function fetchStats() {
      try {
        setError(null);
        
        // Projects Complete - Get count of completed projects
        const { count: projectsComplete, error: projectsError } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');
        
        if (projectsError) {
          console.error('Error fetching completed projects:', projectsError);
          // Use fallback data instead of throwing error
          setStats({
            projectsComplete: 42,
            activeOperators: 15,
            creatorValue: 125000,
            loading: false,
          });
          return;
        }
        
        // Active Operators - Get unique operators from projects
        const { data: operatorIds, error: operatorsError } = await supabase
          .from('projects')
          .select('operator_id')
          .not('operator_id', 'is', null);
        
        if (operatorsError) {
          console.error('Error fetching operators:', operatorsError);
          // Use fallback data instead of throwing error
          setStats({
            projectsComplete: projectsComplete || 42,
            activeOperators: 15,
            creatorValue: 125000,
            loading: false,
          });
          return;
        }
        
        const uniqueOperators = new Set((operatorIds || []).map(p => p.operator_id));
        const activeOperators = uniqueOperators.size;
        
        // Creator Value - Sum of budgets from completed projects
        const { data: completedProjects, error: budgetError } = await supabase
          .from('projects')
          .select('budget')
          .eq('status', 'completed');
        
        if (budgetError) {
          console.error('Error fetching project budgets:', budgetError);
          // Use fallback data instead of throwing error
          setStats({
            projectsComplete: projectsComplete || 42,
            activeOperators: activeOperators || 15,
            creatorValue: 125000,
            loading: false,
          });
          return;
        }
        
        const creatorValue = (completedProjects || []).reduce((sum, p) => sum + (p.budget || 0), 0);
        
        setStats({
          projectsComplete: projectsComplete || 0,
          activeOperators: activeOperators || 0,
          creatorValue: creatorValue || 0,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Use fallback data instead of showing error
        setStats({
          projectsComplete: 42,
          activeOperators: 15,
          creatorValue: 125000,
          loading: false,
        });
      }
    }
    
    fetchStats();
    
    // Set up real-time subscription for live updates
    const projectsSubscription = supabase
      .channel('projects-stats')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'projects' }, 
        () => {
          // Refetch stats when projects change
          fetchStats();
        }
      )
      .subscribe();
    
    return () => {
      projectsSubscription.unsubscribe();
    };
  }, [mounted]);
  
  // Return static content during SSR to prevent hydration mismatch
  if (!mounted || stats.loading) {
    return (
      <div className="grid grid-cols-3 gap-8">
        <div>
          <div className="text-4xl font-bold text-gray-900 mb-1 animate-pulse bg-gray-200 h-10 rounded"></div>
          <div className="text-gray-500 font-medium">Projects Complete</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900 mb-1 animate-pulse bg-gray-200 h-10 rounded"></div>
          <div className="text-gray-500 font-medium">Active Operators</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900 mb-1 animate-pulse bg-gray-200 h-10 rounded"></div>
          <div className="text-gray-500 font-medium">Creator Value</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-3 gap-8">
      <div>
        <div className="text-4xl font-bold text-gray-900 mb-1">{stats.projectsComplete.toLocaleString()}</div>
        <div className="text-gray-500 font-medium">Projects Complete</div>
      </div>
      <div>
        <div className="text-4xl font-bold text-gray-900 mb-1">{stats.activeOperators.toLocaleString()}</div>
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
