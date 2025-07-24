"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  Search,
  MapPin,
  Users,
  Square,
  Star,
  Wifi,
  Clock,
  Shield,
  Car,
  Coffee,
  Monitor,
  Snowflake,
  Sun,
  Filter,
  Grid3X3,
  List,
  Calendar,
  Phone,
  Mail,
  Building,
} from "lucide-react"
import {
  mockRealEstateListings,
  propertyTypes,
  locations,
  capacityRanges,
  commonAmenities,
} from "@/lib/data/real-estate-data"
import type { RealEstateListing, PropertyFilters, PropertyType, CapacityRange } from "@/lib/types/real-estate"

const iconMap = {
  Wifi,
  Clock,
  Shield,
  Car,
  Coffee,
  Monitor,
  Snowflake,
  Sun,
}

export default function RealEstatePage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<PropertyFilters>({
    type: "all",
    location: "all",
    capacity: "any",
    priceRange: { min: 0, max: 10000 },
    amenities: [],
    availability: "all",
    minRating: 0,
  })

  const filteredListings = useMemo(() => {
    return mockRealEstateListings.filter((listing) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          listing.title.toLowerCase().includes(query) ||
          listing.description.toLowerCase().includes(query) ||
          listing.location.toLowerCase().includes(query) ||
          listing.amenities.some((amenity) => amenity.toLowerCase().includes(query))

        if (!matchesSearch) return false
      }

      // Type filter
      if (filters.type !== "all" && listing.type !== filters.type) {
        return false
      }

      // Location filter
      if (filters.location !== "all") {
        const locationMatch = listing.location.toLowerCase().includes(filters.location.toLowerCase())
        if (!locationMatch) return false
      }

      // Capacity filter
      if (filters.capacity !== "any") {
        const [min, max] =
          filters.capacity === "50+" ? [50, Number.POSITIVE_INFINITY] : filters.capacity.split("-").map(Number)

        if (listing.capacity < min || (max !== Number.POSITIVE_INFINITY && listing.capacity > max)) {
          return false
        }
      }

      // Price range filter
      const monthlyPrice =
        listing.priceUnit === "month"
          ? listing.price
          : listing.priceUnit === "day"
            ? listing.price * 30
            : listing.priceUnit === "hour"
              ? listing.price * 8 * 22
              : listing.price * 12

      if (monthlyPrice < filters.priceRange.min || monthlyPrice > filters.priceRange.max) {
        return false
      }

      // Amenities filter
      if (filters.amenities.length > 0) {
        const hasRequiredAmenities = filters.amenities.every((requiredAmenity) =>
          listing.amenities.some((amenity) => amenity.toLowerCase().includes(requiredAmenity.toLowerCase())),
        )
        if (!hasRequiredAmenities) return false
      }

      // Availability filter
      if (filters.availability !== "all" && listing.availability !== filters.availability) {
        return false
      }

      // Rating filter
      if (listing.rating < filters.minRating) {
        return false
      }

      return true
    })
  }, [searchQuery, filters])

  const updateFilter = (key: keyof PropertyFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const toggleAmenity = (amenity: string) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }))
  }

  const getPropertyTypeIcon = (type: PropertyType) => {
    switch (type) {
      case "office":
        return <Building className="h-4 w-4" />
      case "studio":
        return <Monitor className="h-4 w-4" />
      case "meeting-room":
        return <Users className="h-4 w-4" />
      case "event-space":
        return <Calendar className="h-4 w-4" />
      case "co-working":
        return <Wifi className="h-4 w-4" />
      case "warehouse":
        return <Square className="h-4 w-4" />
      default:
        return <Building className="h-4 w-4" />
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "available":
        return "text-green-600"
      case "booked":
        return "text-red-600"
      case "maintenance":
        return "text-yellow-600"
      case "pending":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const formatPrice = (listing: RealEstateListing) => {
    return `$${listing.price.toLocaleString()}/${listing.priceUnit}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center text-indigo-600 hover:text-indigo-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <h1 className="text-2xl font-bold">ReadyAimGo</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-indigo-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Real Estate Solutions</h1>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto mb-8">
              Access premium office spaces, studios, and meeting rooms without long-term commitments. Connect with
              verified property operators through our BEAM-powered network.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
                Browse Properties
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-indigo-600"
              >
                List Your Property
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filter Properties
                </CardTitle>
                <CardDescription>Find the perfect space for your needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="search"
                      placeholder="Search properties..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <Label>Property Type</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => updateFilter("type", value as PropertyType | "all")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label} ({type.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div>
                  <Label>Location</Label>
                  <Select value={filters.location} onValueChange={(value) => updateFilter("location", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.value} value={location.value}>
                          {location.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Capacity */}
                <div>
                  <Label>Capacity</Label>
                  <Select
                    value={filters.capacity}
                    onValueChange={(value) => updateFilter("capacity", value as CapacityRange | "any")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {capacityRanges.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <Label>Monthly Price Range</Label>
                  <div className="px-2 py-4">
                    <Slider
                      value={[filters.priceRange.min, filters.priceRange.max]}
                      onValueChange={([min, max]) => updateFilter("priceRange", { min, max })}
                      max={10000}
                      min={0}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                      <span>${filters.priceRange.min}</span>
                      <span>${filters.priceRange.max}</span>
                    </div>
                  </div>
                </div>

                {/* Minimum Rating */}
                <div>
                  <Label>Minimum Rating</Label>
                  <div className="px-2 py-4">
                    <Slider
                      value={[filters.minRating]}
                      onValueChange={([rating]) => updateFilter("minRating", rating)}
                      max={5}
                      min={0}
                      step={0.5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                      <span>Any Rating</span>
                      <span>{filters.minRating}+ Stars</span>
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <Label>Amenities</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {commonAmenities.map((amenity) => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          id={amenity}
                          checked={filters.amenities.includes(amenity)}
                          onCheckedChange={() => toggleAmenity(amenity)}
                        />
                        <Label htmlFor={amenity} className="text-sm">
                          {amenity}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearchQuery("")
                    setFilters({
                      type: "all",
                      location: "all",
                      capacity: "any",
                      priceRange: { min: 0, max: 10000 },
                      amenities: [],
                      availability: "all",
                      minRating: 0,
                    })
                  }}
                >
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Results Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Available Properties</h2>
                <p className="text-gray-600">{filteredListings.length} properties found</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Map Placeholder */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive Map</h3>
                    <p className="text-gray-600">Map showing property locations would be integrated here</p>
                    <p className="text-sm text-gray-500 mt-2">Google Maps or Mapbox integration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Listings */}
            {filteredListings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
                  <p className="text-gray-600">Try adjusting your filters to see more results</p>
                </CardContent>
              </Card>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-6"}>
                {filteredListings.map((listing) => (
                  <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                    <div className={viewMode === "list" ? "flex" : ""}>
                      <div className={viewMode === "list" ? "w-1/3" : ""}>
                        <img
                          src={listing.images[0] || "/placeholder.svg"}
                          alt={listing.title}
                          className={`w-full object-cover ${viewMode === "list" ? "h-full" : "h-48"} rounded-t-lg ${viewMode === "list" ? "rounded-l-lg rounded-t-none" : ""}`}
                        />
                      </div>
                      <div className={viewMode === "list" ? "w-2/3" : ""}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-2">
                              {getPropertyTypeIcon(listing.type)}
                              <Badge variant="secondary">{listing.type.replace("-", " ")}</Badge>
                              {listing.isVerified && (
                                <Badge className="bg-green-100 text-green-800">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <span className={`font-medium capitalize ${getAvailabilityColor(listing.availability)}`}>
                              {listing.availability}
                            </span>
                          </div>

                          <h3 className="text-xl font-semibold mb-2">{listing.title}</h3>
                          <p className="text-gray-600 mb-4 line-clamp-2">{listing.description}</p>

                          <div className="flex items-center mb-4 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{listing.location}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1 text-gray-400" />
                              <span>{listing.capacity} people</span>
                            </div>
                            <div className="flex items-center">
                              <Square className="h-4 w-4 mr-1 text-gray-400" />
                              <span>{listing.size.toLocaleString()} sq ft</span>
                            </div>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 mr-1 text-yellow-400" />
                              <span>
                                {listing.rating} ({listing.reviews})
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-4">
                            {listing.features.slice(0, 3).map((feature) => {
                              const IconComponent = iconMap[feature.icon as keyof typeof iconMap]
                              return (
                                <Badge key={feature.name} variant="outline" className="text-xs">
                                  {IconComponent && <IconComponent className="h-3 w-3 mr-1" />}
                                  {feature.name}
                                </Badge>
                              )
                            })}
                            {listing.features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{listing.features.length - 3} more
                              </Badge>
                            )}
                          </div>

                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-2xl font-bold text-indigo-600">{formatPrice(listing)}</span>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Phone className="h-4 w-4 mr-1" />
                                Contact
                              </Button>
                              <Button size="sm">
                                <Calendar className="h-4 w-4 mr-1" />
                                Book Now
                              </Button>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-1" />
                                <span>{listing.contact.name}</span>
                              </div>
                              {listing.contact.company && <span className="text-xs">{listing.contact.company}</span>}
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Load More */}
            {filteredListings.length > 0 && (
              <div className="text-center mt-8">
                <Button variant="outline">Load More Properties</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
