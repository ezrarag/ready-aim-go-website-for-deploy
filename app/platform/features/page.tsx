"use client"

import { Card } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Users, Briefcase, Globe, Zap, TrendingUp, Shield, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const platformFeatures = [
  {
    icon: <Users className="h-6 w-6 text-blue-600" />, bg: "bg-blue-100", title: "Client Dashboard", desc: "Manage projects, track progress, and collaborate with operators in one unified interface.", modal: "Placeholder for Client Dashboard details." },
  {
    icon: <Briefcase className="h-6 w-6 text-green-600" />, bg: "bg-green-100", title: "Operator Marketplace", desc: "Browse and connect with verified creative professionals across all disciplines.", modal: "Placeholder for Operator Marketplace details." },
  {
    icon: <Globe className="h-6 w-6 text-purple-600" />, bg: "bg-purple-100", title: "Website Generator", desc: "Auto-generated websites with integrated storefronts and content management.", modal: "showcase" },
  {
    icon: <Zap className="h-6 w-6 text-yellow-600" />, bg: "bg-yellow-100", title: "BEAM Operations", desc: "Automated workflow management connecting clients and operators seamlessly.", modal: "Placeholder for BEAM Operations details." },
  {
    icon: <TrendingUp className="h-6 w-6 text-red-600" />, bg: "bg-red-100", title: "Analytics & Insights", desc: "Comprehensive analytics to track performance and optimize your creative operations.", modal: "Placeholder for Analytics & Insights details." },
  {
    icon: <Shield className="h-6 w-6 text-indigo-600" />, bg: "bg-indigo-100", title: "Secure & Reliable", desc: "Enterprise-grade security with 99.9% uptime and comprehensive data protection.", modal: "Placeholder for Secure & Reliable details." },
];

type Project = {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  liveUrl: string;
  tags: string[];
};

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
          <img
            src={`https://api.microlink.io/?url=${encodeURIComponent(project.liveUrl)}&screenshot=true&meta=false&embed=screenshot.url&colorScheme=light`}
            alt={project.title}
            className="absolute inset-0 w-full h-full object-cover z-0"
            onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
          />
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
          <div className="absolute left-6 bottom-6 flex items-center gap-3 z-20">
            <div className="w-10 h-10 rounded-full bg-black/80 flex items-center justify-center">
              <User className="text-white w-6 h-6" />
            </div>
            <div className="text-white text-lg font-semibold drop-shadow">{project.title}</div>
          </div>
          <div className="absolute right-6 bottom-6 flex items-center gap-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-white text-2xl">
              ↗
            </a>
            <button className="text-white text-2xl">🔖</button>
          </div>
          <div className="w-full h-[320px]" />
        </div>
      ))}
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
  );
}

export default function PlatformFeaturesPage() {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectModal, setProjectModal] = useState<Project | null>(null);

  useEffect(() => {
    if (openModal === "Website Generator") {
      setLoading(true);
      supabase.from("projects").select("*").then(({ data, error }) => {
        if (error) {
          setProjects([]);
        } else {
          const normalized = (data || []).map((p: any) => ({
            ...p,
            liveUrl: p.live_url,
            imageUrl: p.image_url,
            createdAt: p.created_at,
            tags: Array.isArray(p.tags)
              ? p.tags
              : typeof p.tags === "string"
              ? p.tags.split(",").map((t: string) => t.trim())
              : [],
          }));
          setProjects(normalized);
        }
        setLoading(false);
      });
    }
  }, [openModal]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12">
      <Card className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl w-full">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Platform Features</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to manage creative projects and connect with top operators
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {platformFeatures.map((feature) => (
            <Dialog key={feature.title} open={openModal === feature.title} onOpenChange={(open) => setOpenModal(open ? feature.title : null)}>
              <DialogTrigger asChild>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className={`w-12 h-12 ${feature.bg} rounded-lg flex items-center justify-center mb-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600 mb-4">{feature.desc}</p>
                </Card>
              </DialogTrigger>
              <DialogContent fullscreen>
                <div className="relative min-h-[400px] flex flex-col justify-start h-full">
                  <DialogHeader>
                    <DialogTitle>{feature.title}</DialogTitle>
                    <DialogDescription>
                      {feature.modal === "showcase" ? (
                        <>
                          <div className="mb-6">Explore our best work below.</div>
                          {loading ? (
                            <div className="text-center text-gray-500 py-12">Loading projects...</div>
                          ) : (
                            <ProjectGrid projects={projects} onSelect={setProjectModal} />
                          )}
                          <ProjectModal project={projectModal} open={!!projectModal} onClose={() => setProjectModal(null)} />
                        </>
                      ) : (
                        feature.modal
                      )}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </Card>
    </div>
  );
} 