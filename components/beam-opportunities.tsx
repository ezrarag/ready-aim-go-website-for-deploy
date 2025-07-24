"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Clock, DollarSign, Users, Briefcase } from "lucide-react"

interface BeamRole {
  id: string
  title: string
  description: string
  category: string
  skills: string[]
  pay_range: string
  deadline: string
  location?: string
  workstream: string
  visibility: string
  tags: string[]
  media_url?: string
  client_name: string
  status: string
  created_at: string
}

export default function BeamOpportunities() {
  const [roles, setRoles] = useState<BeamRole[]>([])
  const [loading, setLoading] = useState(true)
  const [activeWorkstream, setActiveWorkstream] = useState<string>("all")

  const workstreams = ["all", "Creative", "Operations", "Media", "Transport", "Retail", "Events", "Admin"]

  useEffect(() => {
    fetchRoles()
  }, [activeWorkstream])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const url = activeWorkstream === "all" ? "/api/beam/jobs" : `/api/beam/jobs?workstream=${activeWorkstream}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setRoles(data.data)
      }
    } catch (error) {
      console.error("Error fetching roles:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getWorkstreamColor = (workstream: string) => {
    const colors = {
      Creative: "bg-purple-100 text-purple-800",
      Operations: "bg-blue-100 text-blue-800",
      Media: "bg-green-100 text-green-800",
      Transport: "bg-orange-100 text-orange-800",
      Retail: "bg-pink-100 text-pink-800",
      Events: "bg-yellow-100 text-yellow-800",
      Admin: "bg-gray-100 text-gray-800",
    }
    return colors[workstream as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Available Opportunities</h2>
          <p className="text-muted-foreground">
            {roles.length} active {roles.length === 1 ? "opportunity" : "opportunities"} available
          </p>
        </div>
      </div>

      <Tabs value={activeWorkstream} onValueChange={setActiveWorkstream}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          {workstreams.map((workstream) => (
            <TabsTrigger key={workstream} value={workstream} className="capitalize">
              {workstream === "all" ? "All" : workstream}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeWorkstream} className="mt-6">
          {roles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No opportunities available</h3>
                <p className="text-muted-foreground text-center">
                  {activeWorkstream === "all"
                    ? "There are currently no active opportunities. Check back soon!"
                    : `No opportunities available in ${activeWorkstream} workstream.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map((role) => (
                <Card key={role.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{role.title}</CardTitle>
                        <CardDescription className="mt-1">by {role.client_name}</CardDescription>
                      </div>
                      <Badge className={getWorkstreamColor(role.workstream)}>{role.workstream}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">{role.description}</p>

                    <div className="space-y-2">
                      {role.pay_range && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span>{role.pay_range}</span>
                        </div>
                      )}

                      {role.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span>{role.location}</span>
                        </div>
                      )}

                      {role.deadline && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span>Due {formatDate(role.deadline)}</span>
                        </div>
                      )}
                    </div>

                    {role.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {role.skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {role.skills.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{role.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{role.visibility}</span>
                      </div>
                      <Button size="sm">Apply Now</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
