"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, Filter, Star, ShoppingCart, Eye, Heart, TrendingUp, Users } from "lucide-react"

export function Marketplace() {
  const [activeTab, setActiveTab] = useState("products")

  const products = [
    {
      id: "1",
      title: "Custom Logo Design Package",
      creator: "Sarah Chen Design",
      price: 299,
      rating: 4.9,
      reviews: 127,
      image: "/placeholder.svg?height=200&width=300",
      category: "Design",
      sales: 89,
    },
    {
      id: "2",
      title: "Website Development Template",
      creator: "Mike Rodriguez Dev",
      price: 149,
      rating: 4.8,
      reviews: 93,
      image: "/placeholder.svg?height=200&width=300",
      category: "Development",
      sales: 156,
    },
    {
      id: "3",
      title: "Social Media Strategy Guide",
      creator: "Marketing Pro Co.",
      price: 79,
      rating: 4.7,
      reviews: 204,
      image: "/placeholder.svg?height=200&width=300",
      category: "Marketing",
      sales: 312,
    },
  ]

  const openTasks = [
    {
      id: "1",
      title: "Album Cover Design Needed",
      client: "Indie Music Label",
      budget: 800,
      deadline: "2024-02-20",
      type: "design",
      description: "Looking for a creative album cover design for our new indie rock release...",
      applicants: 12,
    },
    {
      id: "2",
      title: "E-commerce Website Build",
      client: "Fashion Boutique",
      budget: 3500,
      deadline: "2024-03-01",
      type: "development",
      description: "Need a modern, mobile-responsive e-commerce website with payment integration...",
      applicants: 8,
    },
    {
      id: "3",
      title: "Brand Strategy Consultation",
      client: "Tech Startup",
      budget: 1200,
      deadline: "2024-02-25",
      type: "consulting",
      description: "Seeking expert guidance on brand positioning and go-to-market strategy...",
      applicants: 15,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketplace</h1>
        <p className="text-gray-600">Discover products and opportunities from our creative community</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">Products & Services</TabsTrigger>
          <TabsTrigger value="tasks">Open Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search products..." className="pl-10 w-80" />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending
              </Button>
              <Button variant="outline" size="sm">
                <Star className="h-4 w-4 mr-2" />
                Top Rated
              </Button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">{product.category}</Badge>
                    <Button variant="ghost" size="sm">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{product.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{product.creator}</p>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium ml-1">{product.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">({product.reviews})</span>
                    <span className="text-sm text-gray-500">• {product.sales} sales</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">${product.price}</span>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Buy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search tasks..." className="pl-10 w-80" />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Latest
              </Button>
              <Button variant="outline" size="sm">
                Highest Budget
              </Button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-4">
            {openTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        <Badge variant="outline">{task.type}</Badge>
                      </div>
                      <p className="text-gray-600 mb-2">{task.client}</p>
                      <p className="text-gray-500 mb-4">{task.description}</p>
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center">
                          <span className="text-2xl font-bold text-green-600">${task.budget}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>Due: {task.deadline}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{task.applicants} applicants</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button>Apply Now</Button>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
