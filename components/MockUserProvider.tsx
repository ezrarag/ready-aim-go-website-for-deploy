import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase, getProfileByEmail } from "@/lib/supabase/client";

interface MockUser {
  id: string;
  email: string;
  name: string;
}

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
  mockUserId: string;
  userData: {
    name: string;
    email: string;
    projects: Project[];
    stats: Stats;
    activity: ActivityItem[];
  } | null;
  toggleUser: () => void;
  users: MockUser[];
  currentUser: MockUser;
  loading: boolean;
}

const users: MockUser[] = [
  { id: "user-1", email: "ezra.haugabrooks@gmail.com", name: "Ezra Haugabrooks" },
  { id: "user-2", email: "ezra@readyaimgo.com", name: "ReadyAimGo" },
];

const MockUserContext = createContext<MockUserContextType | null>(null);

export function MockUserProvider({ children }: { children: React.ReactNode }) {
  const [mockUserId, setMockUserId] = useState<string>(users[0].id);
  const [userData, setUserData] = useState<MockUserContextType["userData"]>(null);
  const [loading, setLoading] = useState(true);

  const currentUser = users.find((u) => u.id === mockUserId)!;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Get profile by email
      const profile = await getProfileByEmail(currentUser.email);
      if (!profile) {
        setUserData(null);
        setLoading(false);
        return;
      }
      // Fetch projects for this user (client_id = profile.id)
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) {
        setUserData(null);
        setLoading(false);
        return;
      }
      // Fetch activity feed for this user (join with projects.title)
      let activity: ActivityItem[] = [];
      try {
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
        }
      } catch (e) {
        activity = [];
      }
      // Derive stats
      const activeProjects = projects.filter((p: Project) => p.status === "active").length;
      const completedProjects = projects.filter((p: Project) => p.status === "completed").length;
      const totalSpent = projects
        .filter((p: Project) => p.status === "completed")
        .reduce((sum: number, p: Project) => sum + (p.budget || 0), 0);
      const averageRating = 4.8; // Mocked for now
      setUserData({
        name: profile.full_name || currentUser.name,
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
      setLoading(false);
    }
    fetchData();
  }, [mockUserId]);

  const toggleUser = () => {
    setMockUserId((prev) => (prev === users[0].id ? users[1].id : users[0].id));
  };

  return (
    <MockUserContext.Provider value={{ mockUserId, userData, toggleUser, users, currentUser, loading }}>
      {children}
    </MockUserContext.Provider>
  );
}

export function useMockUser() {
  const ctx = useContext(MockUserContext);
  if (!ctx) throw new Error("useMockUser must be used within a MockUserProvider");
  return ctx;
} 