"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NotificationBell } from "@/components/notification-bell"
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  DollarSign,
  Star,
  Upload,
  Eye,
  Globe,
  AlertTriangle,
  Zap,
} from "lucide-react"

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  // Mock data
  const stats = {
    activeProjects: 8,
    completedProjects: 24,
    activeOperators: 12,
    totalSpent: 15420,
    averageRating: 4.8,
  }

  const recentProjects = [
    {
      id: "1",
      title: "Brand Identity Design",
      type: "design",
      status: "in-progress",
      operator: { name: "Sarah Chen", avatar: "/placeholder.svg" },
      progress: 75,
      deadline: "2024-02-15",
      budget: 2500,
    },
    {
      id: "2",
      title: "Website Development",
      type: "development",
      status: "review",
      operator: { name: "Mike Rodriguez", avatar: "/placeholder.svg" },
      progress: 90,
      deadline: "2024-02-20",
      budget: 5000,
    },
    {
      id: "3",
      title: "Social Media Campaign",
      type: "marketing",
      status: "open",
      operator: null,
      progress: 0,
      deadline: "2024-02-25",
      budget: 1500,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "in-progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "review":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "open":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "in-progress":
        return <Clock className="h-4 w-4" />
      case "review":
        return <Eye className="h-4 w-4" />
      case "open":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Alert Banner */}
      <div className="bg-blue-900/20 border-b border-blue-800/30 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-blue-400" />
            <span className="text-blue-300 text-sm">
              <strong>New Feature:</strong> BEAM operations pipeline is now live for all projects.
            </span>
          </div>
          <Button variant="link" size="sm" className="text-blue-300 hover:text-blue-200">
            Learn More
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
                <span className="text-sm text-gray-400">Britney's projects</span>
                <Badge variant="outline" className="border-gray-600 text-gray-400">
                  Pro
                </Badge>
              </div>
              <div className="text-gray-600">•</div>
              <span className="text-sm text-gray-300">readyaimgo-creative-hub</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                Feedback
              </Button>
              <NotificationBell />
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
              <Avatar>
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>BC</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">readyaimgo-creative-hub</h1>
            <Badge variant="outline" className="border-gray-600 text-gray-400">
              CLIENT
            </Badge>
          </div>
          <div className="flex items-center space-x-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.activeProjects}</div>
              <div className="text-sm text-gray-400">Active Projects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.activeOperators}</div>
              <div className="text-sm text-gray-400">Operators</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.completedProjects}</div>
              <div className="text-sm text-gray-400">Completed</div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-400">Project Status</span>
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
                  <Clock className="h-6 w-6 text-blue-400" />
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
                  <p className="text-sm font-medium text-gray-400">Active Operators</p>
                  <p className="text-3xl font-bold text-white">{stats.activeOperators}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Invested</p>
                  <p className="text-3xl font-bold text-white">${stats.totalSpent.toLocaleString()}</p>
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
                  <p className="text-sm font-medium text-gray-400">Avg Rating</p>
                  <p className="text-3xl font-bold text-white">{stats.averageRating}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 bg-gray-900 border-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Projects
            </TabsTrigger>
            <TabsTrigger value="operators" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Operators
            </TabsTrigger>
            <TabsTrigger value="website" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Website
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Marketplace
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Projects */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Recent Projects</CardTitle>
                  <CardDescription className="text-gray-400">
                    Your latest creative projects and their progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentProjects.map((project) => (
                      <div key={project.id} className="p-4 border border-gray-800 rounded-lg bg-gray-800/50">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-white">{project.title}</h4>
                            <Badge className={getStatusColor(project.status)}>
                              {getStatusIcon(project.status)}
                              <span className="ml-1 capitalize">{project.status.replace("-", " ")}</span>
                            </Badge>
                          </div>

                          {project.operator && (
                            <div className="flex items-center space-x-2 mb-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={project.operator.avatar || "/placeholder.svg"} />
                                <AvatarFallback>
                                  {project.operator.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-400">{project.operator.name}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex-1 mr-4">
                              <Progress value={project.progress} className="h-2 bg-gray-700" />
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>{project.progress}% complete</span>
                                <span>Due {project.deadline}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-white">${project.budget.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                  <CardDescription className="text-gray-400">Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      className="h-20 flex-col space-y-2 bg-gray-800 hover:bg-gray-700 border-gray-700"
                      variant="outline"
                    >
                      <Plus className="h-6 w-6" />
                      <span>New Project</span>
                    </Button>
                    <Button
                      className="h-20 flex-col space-y-2 bg-gray-800 hover:bg-gray-700 border-gray-700"
                      variant="outline"
                    >
                      <Search className="h-6 w-6" />
                      <span>Find Operators</span>
                    </Button>
                    <Button
                      className="h-20 flex-col space-y-2 bg-gray-800 hover:bg-gray-700 border-gray-700"
                      variant="outline"
                    >
                      <Upload className="h-6 w-6" />
                      <span>Upload Files</span>
                    </Button>
                    <Button
                      className="h-20 flex-col space-y-2 bg-gray-800 hover:bg-gray-700 border-gray-700"
                      variant="outline"
                    >
                      <Globe className="h-6 w-6" />
                      <span>View Website</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Feed */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
                <CardDescription className="text-gray-400">
                  Latest updates from your projects and operators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">
                        <span className="font-medium text-white">Sarah Chen</span> completed the logo design for Brand
                        Identity project
                      </p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">
                        <span className="font-medium text-white">Mike Rodriguez</span> submitted website mockups for
                        review
                      </p>
                      <p className="text-xs text-gray-500">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">
                        New operator <span className="font-medium text-white">Alex Kim</span> applied for Social Media
                        Campaign
                      </p>
                      <p className="text-xs text-gray-500">6 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">All Projects</CardTitle>
                <CardDescription className="text-gray-400">Manage and track all your creative projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search projects..."
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
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </div>

                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>Project management interface would be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operators">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Your Operators</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage relationships with your creative operators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>Operator management interface would be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="website">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Your Website</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your auto-generated website and storefront
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Globe className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>Website management interface would be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketplace">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Marketplace</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your products and marketplace presence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>Marketplace management interface would be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
