"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Search,
  MoreHorizontal,
  Send,
  Edit,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  Briefcase,
} from "lucide-react"
import { NewRoleModal } from "./new-role-modal"
import type { BeamRole } from "@/lib/types/roles"

const WORKSTREAM_COLORS = {
  Creative: "bg-purple-100 text-purple-800",
  Operations: "bg-blue-100 text-blue-800",
  Media: "bg-pink-100 text-pink-800",
  Transport: "bg-green-100 text-green-800",
  Retail: "bg-orange-100 text-orange-800",
  Events: "bg-yellow-100 text-yellow-800",
  Admin: "bg-gray-100 text-gray-800",
}

const STATUS_COLORS = {
  Draft: "bg-gray-100 text-gray-800",
  Live: "bg-green-100 text-green-800",
  Filled: "bg-blue-100 text-blue-800",
}

export function RolesManager() {
  const [roles, setRoles] = useState<BeamRole[]>([])
  const [filteredRoles, setFilteredRoles] = useState<BeamRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewRoleModal, setShowNewRoleModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [workstreamFilter, setWorkstreamFilter] = useState<string>("all")
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null)
  const [sendingToBeam, setSendingToBeam] = useState<string | null>(null)

  useEffect(() => {
    fetchRoles()
  }, [])

  useEffect(() => {
    filterRoles()
  }, [roles, searchTerm, statusFilter, workstreamFilter])

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles?clientId=current-user-id") // TODO: Get from auth
      if (response.ok) {
        const { roles } = await response.json()
        setRoles(roles)
      }
    } catch (error) {
      console.error("Error fetching roles:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterRoles = () => {
    let filtered = roles

    if (searchTerm) {
      filtered = filtered.filter(
        (role) =>
          role.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          role.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          role.skills.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((role) => role.status === statusFilter)
    }

    if (workstreamFilter !== "all") {
      filtered = filtered.filter((role) => role.workstream === workstreamFilter)
    }

    setFilteredRoles(filtered)
  }

  const handleSendToBeam = async (roleId: string) => {
    setSendingToBeam(roleId)
    try {
      const response = await fetch(`/api/roles/${roleId}/send-to-beam`, {
        method: "POST",
      })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Role sent to BEAM:", result)
        // Refresh roles to get updated status
        fetchRoles()
      } else {
        console.error("Failed to send role to BEAM")
      }
    } catch (error) {
      console.error("Error sending role to BEAM:", error)
    } finally {
      setSendingToBeam(null)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setRoles(roles.filter((role) => role.id !== roleId))
      }
    } catch (error) {
      console.error("Error deleting role:", error)
    } finally {
      setDeleteRoleId(null)
    }
  }

  const groupedRoles = filteredRoles.reduce(
    (acc, role) => {
      if (!acc[role.workstream]) {
        acc[role.workstream] = []
      }
      acc[role.workstream].push(role)
      return acc
    },
    {} as Record<string, BeamRole[]>,
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading roles...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-gray-600">Create and manage roles to send to the BEAM platform</p>
        </div>
        <Button onClick={() => setShowNewRoleModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Role
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Live">Live</SelectItem>
                <SelectItem value="Filled">Filled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workstreamFilter} onValueChange={setWorkstreamFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Workstream" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workstreams</SelectItem>
                <SelectItem value="Creative">Creative</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Transport">Transport</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
                <SelectItem value="Events">Events</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Roles Display */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="workstream">By Workstream</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {filteredRoles.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No roles found. Create your first role to get started!</p>
                <Button className="mt-4" onClick={() => setShowNewRoleModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredRoles.map((role) => (
              <Card key={role.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{role.title}</h3>
                        <Badge className={STATUS_COLORS[role.status]}>{role.status}</Badge>
                        <Badge className={WORKSTREAM_COLORS[role.workstream]}>{role.workstream}</Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{role.description}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {role.payRange}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {role.deadline}
                        </div>
                        {role.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {role.location}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {role.visibility}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {role.skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Role
                        </DropdownMenuItem>
                        {role.status === "Live" && (
                          <DropdownMenuItem
                            onClick={() => handleSendToBeam(role.id)}
                            disabled={sendingToBeam === role.id}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {sendingToBeam === role.id ? "Sending..." : "Send to BEAM"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setDeleteRoleId(role.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="workstream" className="space-y-6">
          {Object.entries(groupedRoles).map(([workstream, workstreamRoles]) => (
            <Card key={workstream}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className={WORKSTREAM_COLORS[workstream as keyof typeof WORKSTREAM_COLORS]}>
                    {workstream}
                  </Badge>
                  <span className="text-sm text-gray-500">({workstreamRoles.length} roles)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {workstreamRoles.map((role) => (
                    <Card key={role.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{role.title}</h4>
                          <Badge className={STATUS_COLORS[role.status]} variant="secondary">
                            {role.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{role.description}</p>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{role.payRange}</span>
                          <span>{role.deadline}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* New Role Modal */}
      <NewRoleModal
        open={showNewRoleModal}
        onOpenChange={setShowNewRoleModal}
        onRoleCreated={(role) => {
          setRoles([role, ...roles])
          setShowNewRoleModal(false)
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRoleId} onOpenChange={() => setDeleteRoleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRoleId && handleDeleteRole(deleteRoleId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
