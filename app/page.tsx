"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowRight, Star, Users, Briefcase, TrendingUp, CheckCircle, Zap, Shield, Globe, Play } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Card */}
      <div className="p-4">
        <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
          <nav className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">READYAIMGO</h1>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="#platform" className="text-gray-600 hover:text-gray-900 font-medium">
                  Platform
                </Link>
                <Link href="#services" className="text-gray-600 hover:text-gray-900 font-medium">
                  Services
                </Link>
                <Link href="#marketplace" className="text-gray-600 hover:text-gray-900 font-medium">
                  Marketplace
                </Link>
                <Link href="#operators" className="text-gray-600 hover:text-gray-900 font-medium">
                  Operators
                </Link>
                <Link href="/about" className="text-gray-600 hover:text-gray-900 font-medium">
                  About
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="ghost" className="text-gray-600">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-6">Get Started</Button>
                </Link>
              </div>
            </div>
          </nav>
        </Card>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-8">
        <Card className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="relative px-8 py-24 lg:py-32">
            <div className="max-w-4xl">
              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                CONNECT YOUR
                <br />
                <span className="text-indigo-400">CREATIVE VISION</span>
                <br />
                TODAY
              </h1>

              <p className="text-xl text-gray-200 mb-8 max-w-2xl leading-relaxed">
                We provide tailored creative solutions, connecting clients with skilled operators through personalized
                experiences that meet your unique needs and aspirations.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-gray-100 rounded-full px-8 py-4 text-lg font-semibold"
                  asChild
                >
                  <Link href="/dashboard/client">
                    <span>Explore Platform</span>
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-black rounded-full px-8 py-4 text-lg font-semibold"
                >
                  <Play className="mr-2 h-5 w-5" />
                  <span>Watch Demo</span>
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <div className="text-4xl font-bold text-white mb-1">500+</div>
                  <div className="text-gray-300 font-medium">Projects Complete</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-white mb-1">150+</div>
                  <div className="text-gray-300 font-medium">Active Operators</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-white mb-1">$2M+</div>
                  <div className="text-gray-300 font-medium">Creator Value</div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating testimonials */}
          <div className="absolute bottom-8 right-8 hidden lg:block">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex -space-x-2">
                  <Avatar className="w-8 h-8 border-2 border-white">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-8 h-8 border-2 border-white">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                    <AvatarFallback>SM</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-8 h-8 border-2 border-white">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                    <AvatarFallback>AL</AvatarFallback>
                  </Avatar>
                </div>
                <div className="text-sm">
                  <div className="flex items-center">
                    <span className="font-semibold">10+ Featured</span>
                    <div className="flex ml-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-gray-300">5/5 Rating</div>
                </div>
              </div>
            </Card>
          </div>
        </Card>
      </section>

      {/* Rest of the content wrapped in cards */}
      <div className="px-4 space-y-8">
        {/* What We Offer */}
        <section className="py-20">
          <Card className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-4">
              <Badge variant="secondary" className="mb-4">
                What We Offer
              </Badge>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-6">
              COMPREHENSIVE CREATIVE SOLUTIONS
            </h2>

            <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-16">
              Our comprehensive services encompass creative project management, skilled operator networks, and premium
              marketplace solutions.
            </p>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="space-y-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Client Platform</h3>
                      <p className="text-gray-600">
                        Custom dashboards, project management, and automated website generation with integrated
                        storefronts and content publishing.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Operator Network</h3>
                      <p className="text-gray-600">
                        Connect with verified creative professionals across design, development, marketing, audio,
                        video, and consulting services.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Globe className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">BEAM Integration</h3>
                      <p className="text-gray-600">
                        Seamless operations pipeline connecting clients and operators with real-time task management and
                        automated workflows.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Card className="overflow-hidden">
                  <div className="aspect-[4/3] bg-gradient-to-br from-indigo-500 to-purple-600 relative">
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Zap className="h-8 w-8" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Platform Demo</h3>
                        <p className="text-white/80">See ReadyAimGo in action</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">01</h4>
                        <p className="text-sm text-gray-600">Client Dashboard</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Next: Operator Network</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </section>

        {/* Platform Features */}
        <section id="platform" className="py-20">
          <Card className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Platform Features</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Everything you need to manage creative projects and connect with top operators
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Client Dashboard</h3>
                <p className="text-gray-600 mb-4">
                  Manage projects, track progress, and collaborate with operators in one unified interface.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Project management
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Real-time updates
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    File sharing
                  </li>
                </ul>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Operator Marketplace</h3>
                <p className="text-gray-600 mb-4">
                  Browse and connect with verified creative professionals across all disciplines.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Verified operators
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Skill-based matching
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Portfolio reviews
                  </li>
                </ul>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Website Generator</h3>
                <p className="text-gray-600 mb-4">
                  Auto-generated websites with integrated storefronts and content management.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Custom domains
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    E-commerce ready
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    SEO optimized
                  </li>
                </ul>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">BEAM Operations</h3>
                <p className="text-gray-600 mb-4">
                  Automated workflow management connecting clients and operators seamlessly.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Task automation
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Progress tracking
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Quality assurance
                  </li>
                </ul>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Analytics & Insights</h3>
                <p className="text-gray-600 mb-4">
                  Comprehensive analytics to track performance and optimize your creative operations.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Performance metrics
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ROI tracking
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Custom reports
                  </li>
                </ul>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
                <p className="text-gray-600 mb-4">
                  Enterprise-grade security with 99.9% uptime and comprehensive data protection.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    End-to-end encryption
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Regular backups
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    24/7 monitoring
                  </li>
                </ul>
              </Card>
            </div>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <Card className="bg-gray-900 text-white rounded-2xl shadow-2xl p-12">
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Creative Process?</h2>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Join thousands of creators and operators who trust ReadyAimGo to streamline their workflows and
                accelerate their success.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard/client">
                  <Button
                    size="lg"
                    className="bg-white text-black hover:bg-gray-100 rounded-full px-8 py-4 text-lg font-semibold"
                  >
                    <span>Start Your Journey</span>
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-black rounded-full px-8 py-4 text-lg font-semibold"
                  >
                    <span>Schedule Demo</span>
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">ReadyAimGo</h3>
              </div>
              <p className="text-gray-600">
                Connecting creators with skilled operators through the power of BEAM technology.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <Link href="/dashboard" className="hover:text-gray-900">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace" className="hover:text-gray-900">
                    Marketplace
                  </Link>
                </li>
                <li>
                  <Link href="/operators" className="hover:text-gray-900">
                    Find Operators
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-gray-900">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <Link href="/docs" className="hover:text-gray-900">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="hover:text-gray-900">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-gray-900">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/api" className="hover:text-gray-900">
                    API
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <Link href="/about" className="hover:text-gray-900">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-gray-900">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-gray-900">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-gray-900">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; 2024 ReadyAimGo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
