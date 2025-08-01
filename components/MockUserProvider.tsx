import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase, getProfileByEmail } from "@/lib/supabase/client";

interface Project {
  id: string;
  client_id: string;
  title: string;
  status: string;
  progress: number;
  deadline: string;
  budget: number;
  [key: string]: any;
}

interface Stats {
  activeProjects: number;
  completedProjects: number;
  totalSpent: number;
  averageRating: number;
}

interface ActivityItem {
  id: string;
  client_id: string;
  project_id: string;
  action: string;
  details: string;
  created_at: string;
  project_title?: string;
}

interface MockUserContextType {
  userData: {
    name: string;
    email: string;
    projects: Project[];
    stats: Stats;
    activity: ActivityItem[];
  } | null;
  loading: boolean;
  error: string | null;
}

const CLIENT_EMAIL = "ezra.haugabrooks@gmail.com";
const CLIENT_NAME = "Ezra Haugabrooks";

const MockUserContext = createContext<MockUserContextType | null>(null);

export function MockUserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<MockUserContextType["userData"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        console.log("🔍 Fetching profile for:", CLIENT_EMAIL);
        
        // Get profile by email
        const profile = await getProfileByEmail(CLIENT_EMAIL);
        if (!profile) {
          console.log("❌ No profile found for:", CLIENT_EMAIL);
          setError("Profile not found. Please ensure the user exists in the database.");
          setLoading(false);
          return;
        }
        
        console.log("✅ Profile found:", profile);
        
        // Fetch projects for this user (client_id = profile.id)
        console.log("🔍 Fetching projects for client_id:", profile.id);
        const { data: projects, error: projectsError } = await supabase
          .from("projects")
          .select("*")
          .eq("client_id", profile.id)
          .order("created_at", { ascending: false });
          
        if (projectsError) {
          console.error("❌ Error fetching projects:", projectsError);
          setError("Failed to load projects. Please check your database connection.");
          setLoading(false);
          return;
        }
        
        console.log("✅ Projects loaded:", projects?.length || 0, "projects");
        
        // Fetch activity feed for this user (join with projects.title)
        let activity: ActivityItem[] = [];
        try {
          console.log("🔍 Fetching activity for client_id:", profile.id);
          const { data: activityData, error: activityError } = await supabase
            .from("client_activity")
            .select("*, projects:title")
            .eq("client_id", profile.id)
            .order("created_at", { ascending: false });
            
          if (!activityError && activityData) {
            activity = activityData.map((item: any) => ({
              ...item,
              project_title: item.projects?.title || undefined,
            }));
            console.log("✅ Activity loaded:", activity.length, "items");
          } else if (activityError) {
            console.warn("⚠️ Activity fetch error (non-critical):", activityError);
          }
        } catch (e) {
          console.warn("⚠️ Activity fetch failed (non-critical):", e);
          activity = [];
        }
        
        // Derive stats from real project data
        const activeProjects = projects.filter((p: Project) => p.status === "active" || p.status === "in-progress").length;
        const completedProjects = projects.filter((p: Project) => p.status === "completed").length;
        const totalSpent = projects
          .filter((p: Project) => p.status === "completed")
          .reduce((sum: number, p: Project) => sum + (p.budget || 0), 0);
        const averageRating = 4.8; // Mocked for now - will be replaced with real ratings
        
        console.log("📊 Stats calculated:", {
          activeProjects,
          completedProjects,
          totalSpent,
          averageRating
        });
        
        setUserData({
          name: profile.full_name || CLIENT_NAME,
          email: profile.email,
          projects,
          stats: {
            activeProjects,
            completedProjects,
            totalSpent,
            averageRating,
          },
          activity,
        });
        
        console.log("✅ User data set successfully");
        
      } catch (error) {
        console.error("❌ Error in fetchData:", error);
        setError("Failed to load user data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  return (
    <MockUserContext.Provider value={{ userData, loading, error }}>
      {children}
    </MockUserContext.Provider>
  );
}

export function useMockUser() {
  const ctx = useContext(MockUserContext);
  if (!ctx) throw new Error("useMockUser must be used within a MockUserProvider");
  return ctx;
} 