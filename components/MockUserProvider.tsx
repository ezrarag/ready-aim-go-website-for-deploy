import React, { createContext, useContext, useState, useEffect } from "react";
// TODO: Implement Firebase authentication

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
        const projects: Project[] = [];
        const activity: ActivityItem[] = [];
        setUserData({
          name: CLIENT_NAME,
          email: CLIENT_EMAIL,
          projects,
          stats: {
            activeProjects: 0,
            completedProjects: 0,
            totalSpent: 0,
            averageRating: 0,
          },
          activity,
        });
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