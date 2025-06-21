"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NotificationBell } from "@/components/notification-bell"
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  DollarSign,
  Star,
  TrendingUp,
  Users,
  Briefcase,
  Eye,
  MessageSquare,
  Calendar,
  Zap,
} from "lucide-react"

export default function OperatorDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  // Mock data
  const stats = {
    activeProjects: 5,
    completedProjects: 47,
    totalEarnings: 28750,
    averageRating: 4.9,
    responseRate: 98,
  }

  const availableGigs = [
    {
      id: "1",
      title: "Music Album Cover Design",
      client: "Indie Artist Co.",
      type: "design",
      budget: 800,
      deadline: "2024-02-20",
      description: "Looking for a creative album cover design for an indie rock album...",
      tags: ["design", "music", "creative"],
      postedAt: "2 hours ago",
    },
    {
      id: "2",
      title: "Website Development",
      client: "Local Business",
      type: "development",
      budget: 3500,
      deadline: "2024-03-01",
      description: "Need a modern, responsive website for a local restaurant...",
      tags: ["web", "react", "responsive"],
      postedAt: "4 hours ago",
    },
    {
      id: "3",
      title: "Social Media Strategy",
      client: "Fashion Brand",
      type: "marketing",
      budget: 1200,
      deadline: "2024-02-25",
      description: "Develop a comprehensive social media strategy for fashion brand...",
      tags: ["marketing", "social", "strategy"],
      postedAt: "1 day ago",
    },
  ]

  const activeProjects = [
    {
      id: "1",
      title: "Brand Identity Package",
      client: "Tech Startup",
      progress: 75,
      deadline: "2024-02-18",
      budget: 2500,
      status: "in-progress",
    },
    {
      id: "2",
      title: "Product Photography",
      client: "E-commerce Store",
      progress: 90,
      deadline: "2024-02-15",
      budget: 1800,
      status: "review",
    },
  ]

  const getTypeColor = (type: string) => {
    switch (type) {
      case "design":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "development":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "marketing":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "audio":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "video":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Alert Banner */}
      <div className="bg-green-900/20 border-b border-green-800/30 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-300 text-sm">
              <strong>Great work!</strong> You've maintained a 4.9-star rating this month.
            </span>
          </div>
          <Button variant="link" size="sm" className="text-green-300 hover:text-green-200">
            View Profile
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                  <Zap className="h-4 w-4 text-black" />
                </div>
                <span className="text-sm text-gray-400">John's workspace</span>
                <Badge variant="outline" className="border-gray-600 text-gray-400">
                  Pro
                </Badge>
              </div>
              <div className="text-gray-600">•</div>
              <span className="text-sm text-gray-300">readyaimgo-operator-hub</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-400">Available</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                Feedback
              </Button>
              <NotificationBell />
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Available
              </Badge>
              <Avatar>
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">readyaimgo-operator-hub</h1>
            <Badge variant="outline" className="border-gray-600 text-gray-400">
              OPERATOR
            </Badge>
          </div>
          <div className="flex items-center space-x-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.activeProjects}</div>
              <div className="text-sm text-gray-400">Active Projects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.completedProjects}</div>
              <div className="text-sm text-gray-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <div className="text-2xl font-bold text-white">{stats.averageRating}</div>
              </div>
              <div className="text-sm text-gray-400">Rating</div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-400">Status</span>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-4 mb-8">
          <Select defaultValue="24h">
            <SelectTrigger className="w-40 bg-gray-900 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-400">Statistics for last 24 hours</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Active Projects</p>
                  <p className="text-3xl font-bold text-white">{stats.activeProjects}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Completed</p>
                  <p className="text-3xl font-bold text-white">{stats.completedProjects}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Earnings</p>
                  <p className="text-3xl font-bold text-white">${stats.totalEarnings.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Rating</p>
                  <p className="text-3xl font-bold text-white">{stats.averageRating}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Response Rate</p>
                  <p className="text-3xl font-bold text-white">{stats.responseRate}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-gray-900 border-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="gigs" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Available Gigs
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              My Projects
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Available Gigs Preview */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">New Opportunities</CardTitle>
                  <CardDescription className="text-gray-400">Latest gigs matching your skills</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {availableGigs.slice(0, 3).map((gig) => (
                      <div
                        key={gig.id}
                        className="p-4 border border-gray-800 rounded-lg bg-gray-800/50 hover:bg-gray-800 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white">{gig.title}</h4>
                          <Badge className={getTypeColor(gig.type)}>{gig.type}</Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{gig.client}</p>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{gig.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-lg font-semibold text-green-400">${gig.budget}</span>
                            <span className="text-sm text-gray-500">Due {gig.deadline}</span>
                          </div>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Projects */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Active Projects</CardTitle>
                  <CardDescription className="text-gray-400">Your current work in progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeProjects.map((project) => (
                      <div key={project.id} className="p-4 border border-gray-800 rounded-lg bg-gray-800/50">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white">{project.title}</h4>
                          <Badge
                            className={
                              project.status === "review"
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            }
                          >
                            {project.status === "review" ? (
                              <Eye className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {project.status.replace("-", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{project.client}</p>
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${project.progress}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">{project.progress}% complete</span>
                            <span className="text-sm text-gray-500">Due {project.deadline}</span>
                          </div>
                          <span className="text-lg font-semibold text-white">${project.budget}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
                <CardDescription className="text-gray-400">Latest updates and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">
                        You received a 5-star review from <span className="font-medium text-white">Tech Startup</span>{" "}
                        for Brand Identity Package
                      </p>
                      <p className="text-xs text-gray-500">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">
                        New message from <span className="font-medium text-white">E-commerce Store</span> about Product
                        Photography project
                      </p>
                      <p className="text-xs text-gray-500">3 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">
                        New gig posted: <span className="font-medium text-white">Music Album Cover Design</span> - $800
                        budget
                      </p>
                      <p className="text-xs text-gray-500">5 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gigs">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Available Gigs</CardTitle>
                <CardDescription className="text-gray-400">Browse and apply for new opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search gigs..."
                        className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {availableGigs.map((gig) => (
                    <div
                      key={gig.id}
                      className="p-6 border border-gray-800 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{gig.title}</h3>
                            <Badge className={getTypeColor(gig.type)}>{gig.type}</Badge>
                          </div>
                          <p className="text-gray-400 mb-2">{gig.client}</p>
                          <p className="text-gray-500 mb-4">{gig.description}</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {gig.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs border-gray-600 text-gray-400">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <span className="text-2xl font-bold text-green-400">${gig.budget}</span>
                              <span className="text-sm text-gray-500">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                Due {gig.deadline}
                              </span>
                              <span className="text-sm text-gray-500">{gig.postedAt}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Message
                              </Button>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                Apply Now
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">My Projects</CardTitle>
                <CardDescription className="text-gray-400">
                  Track and manage your active and completed projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>Project management interface would be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Operator Profile</CardTitle>
                <CardDescription className="text-gray-400">Manage your profile, skills, and portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>Profile management interface would be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
