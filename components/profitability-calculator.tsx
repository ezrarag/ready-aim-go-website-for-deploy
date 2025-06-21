"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  Target,
  BarChart3,
  Download,
  RefreshCw,
  Info,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface CalculatorInputs {
  currentRevenue: number
  hoursPerWeek: number
  operatorType: string
  businessSize: string
  currentEfficiency: number
  marketArea: string
  experienceLevel: string
  serviceTypes: string[]
  seasonality: number
  competitionLevel: string
}

interface CalculatorResults {
  projectedRevenue: number
  revenueIncrease: number
  timeSavings: number
  efficiencyGain: number
  monthlyProjection: number[]
  yearlyProjection: number
  roi: number
  paybackPeriod: number
  additionalJobs: number
  networkValue: number
}

const operatorTypes = [
  { value: "service-provider", label: "Service Provider", multiplier: 1.35 },
  { value: "contractor", label: "Independent Contractor", multiplier: 1.42 },
  { value: "property-manager", label: "Property Manager", multiplier: 1.28 },
  { value: "vendor", label: "Vendor/Supplier", multiplier: 1.31 },
  { value: "real-estate", label: "Real Estate Professional", multiplier: 1.38 },
]

const businessSizes = [
  { value: "solo", label: "Solo Operator", multiplier: 1.45 },
  { value: "small", label: "Small Team (2-5)", multiplier: 1.35 },
  { value: "medium", label: "Medium Business (6-20)", multiplier: 1.25 },
  { value: "large", label: "Large Business (20+)", multiplier: 1.15 },
]

const marketAreas = [
  { value: "urban", label: "Urban/Metropolitan", multiplier: 1.4 },
  { value: "suburban", label: "Suburban", multiplier: 1.3 },
  { value: "rural", label: "Rural", multiplier: 1.2 },
  { value: "mixed", label: "Mixed Markets", multiplier: 1.35 },
]

export function ProfitabilityCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    currentRevenue: 5000,
    hoursPerWeek: 40,
    operatorType: "service-provider",
    businessSize: "solo",
    currentEfficiency: 70,
    marketArea: "suburban",
    experienceLevel: "intermediate",
    serviceTypes: ["maintenance"],
    seasonality: 80,
    competitionLevel: "moderate",
  })

  const [results, setResults] = useState<CalculatorResults | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const calculateResults = () => {
    setIsCalculating(true)

    // Simulate calculation delay for better UX
    setTimeout(() => {
      const operatorMultiplier = operatorTypes.find((t) => t.value === inputs.operatorType)?.multiplier || 1.35
      const sizeMultiplier = businessSizes.find((s) => s.value === inputs.businessSize)?.multiplier || 1.35
      const marketMultiplier = marketAreas.find((m) => m.value === inputs.marketArea)?.multiplier || 1.3

      // Base calculations
      const efficiencyImprovement = (100 - inputs.currentEfficiency) * 0.6
      const baseIncrease = operatorMultiplier * sizeMultiplier * marketMultiplier

      // Experience level adjustments
      const experienceMultiplier =
        inputs.experienceLevel === "beginner" ? 1.5 : inputs.experienceLevel === "intermediate" ? 1.3 : 1.1

      // Competition adjustments
      const competitionMultiplier =
        inputs.competitionLevel === "low" ? 1.2 : inputs.competitionLevel === "moderate" ? 1.0 : 0.85

      const revenueIncrease = (baseIncrease * experienceMultiplier * competitionMultiplier - 1) * 100
      const projectedRevenue = inputs.currentRevenue * (1 + revenueIncrease / 100)
      const timeSavings = Math.min(efficiencyImprovement * 0.5, 30) // Max 30% time savings
      const efficiencyGain = efficiencyImprovement

      // Monthly projections (12 months)
      const monthlyProjection = Array.from({ length: 12 }, (_, i) => {
        const growthFactor = 1 + (revenueIncrease / 100) * ((i + 1) / 12)
        const seasonalityFactor = inputs.seasonality / 100
        return Math.round(inputs.currentRevenue * growthFactor * seasonalityFactor)
      })

      const yearlyProjection = monthlyProjection.reduce((sum, month) => sum + month, 0)
      const roi = ((yearlyProjection - inputs.currentRevenue * 12) / (inputs.currentRevenue * 12)) * 100
      const paybackPeriod = 2.5 // Months to break even
      const additionalJobs = Math.round((projectedRevenue - inputs.currentRevenue) / 250) // Assuming $250 avg job
      const networkValue = additionalJobs * 150 // Network connection value

      setResults({
        projectedRevenue,
        revenueIncrease,
        timeSavings,
        efficiencyGain,
        monthlyProjection,
        yearlyProjection,
        roi,
        paybackPeriod,
        additionalJobs,
        networkValue,
      })

      setIsCalculating(false)
    }, 1500)
  }

  useEffect(() => {
    calculateResults()
  }, [inputs])

  const handleInputChange = (field: keyof CalculatorInputs, value: any) => {
    setInputs((prev) => ({ ...prev, [field]: value }))
  }

  const resetCalculator = () => {
    setInputs({
      currentRevenue: 5000,
      hoursPerWeek: 40,
      operatorType: "service-provider",
      businessSize: "solo",
      currentEfficiency: 70,
      marketArea: "suburban",
      experienceLevel: "intermediate",
      serviceTypes: ["maintenance"],
      seasonality: 80,
      competitionLevel: "moderate",
    })
  }

  const exportResults = () => {
    if (!results) return

    const exportData = {
      inputs,
      results,
      calculatedAt: new Date().toISOString(),
      platform: "ReadyAimGo",
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `readyaimgo-profitability-analysis-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const chartData =
    results?.monthlyProjection.map((revenue, index) => ({
      month: `Month ${index + 1}`,
      current: inputs.currentRevenue,
      projected: revenue,
    })) || []

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Calculator className="h-8 w-8 text-indigo-600 mr-3" />
            <CardTitle className="text-3xl font-bold">ReadyAimGo Profitability Calculator</CardTitle>
          </div>
          <CardDescription className="text-lg">
            Discover your earning potential with the BEAM-powered operator network
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Your Business Profile
              </CardTitle>
              <CardDescription>Tell us about your current operation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label htmlFor="revenue">Current Monthly Revenue</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="revenue"
                        type="number"
                        value={inputs.currentRevenue}
                        onChange={(e) => handleInputChange("currentRevenue", Number(e.target.value))}
                        className="pl-10"
                        min="0"
                        step="100"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="hours">Hours Worked Per Week</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="hours"
                        type="number"
                        value={inputs.hoursPerWeek}
                        onChange={(e) => handleInputChange("hoursPerWeek", Number(e.target.value))}
                        className="pl-10"
                        min="1"
                        max="80"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="operator-type">Operator Type</Label>
                    <Select
                      value={inputs.operatorType}
                      onValueChange={(value) => handleInputChange("operatorType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operatorTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="business-size">Business Size</Label>
                    <Select
                      value={inputs.businessSize}
                      onValueChange={(value) => handleInputChange("businessSize", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {businessSizes.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div>
                    <Label>Current Efficiency Level: {inputs.currentEfficiency}%</Label>
                    <Slider
                      value={[inputs.currentEfficiency]}
                      onValueChange={(value) => handleInputChange("currentEfficiency", value[0])}
                      max={100}
                      min={20}
                      step={5}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="market-area">Market Area</Label>
                    <Select value={inputs.marketArea} onValueChange={(value) => handleInputChange("marketArea", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {marketAreas.map((area) => (
                          <SelectItem key={area.value} value={area.value}>
                            {area.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="experience">Experience Level</Label>
                    <Select
                      value={inputs.experienceLevel}
                      onValueChange={(value) => handleInputChange("experienceLevel", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                        <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                        <SelectItem value="expert">Expert (5+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Seasonality Factor: {inputs.seasonality}%</Label>
                    <Slider
                      value={[inputs.seasonality]}
                      onValueChange={(value) => handleInputChange("seasonality", value[0])}
                      max={100}
                      min={50}
                      step={5}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="competition">Competition Level</Label>
                    <Select
                      value={inputs.competitionLevel}
                      onValueChange={(value) => handleInputChange("competitionLevel", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Competition</SelectItem>
                        <SelectItem value="moderate">Moderate Competition</SelectItem>
                        <SelectItem value="high">High Competition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex space-x-2">
                <Button onClick={calculateResults} disabled={isCalculating} className="flex-1">
                  {isCalculating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4 mr-2" />
                      Recalculate
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {isCalculating ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
                  <p className="text-lg font-medium">Analyzing Your Potential...</p>
                  <p className="text-gray-600">Calculating projections based on BEAM network data</p>
                </div>
              </CardContent>
            </Card>
          ) : results ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">+{results.revenueIncrease.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Revenue Increase</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{results.timeSavings.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Time Savings</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">{results.efficiencyGain.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Efficiency Gain</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-indigo-600">+{results.additionalJobs}</div>
                    <div className="text-sm text-gray-600">Additional Jobs/Month</div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Projection Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>12-Month Revenue Projection</CardTitle>
                  <CardDescription>Projected vs. current monthly revenue with ReadyAimGo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          `$${value?.toLocaleString()}`,
                          name === "current" ? "Current Revenue" : "Projected Revenue",
                        ]}
                      />
                      <Line type="monotone" dataKey="current" stroke="#94a3b8" strokeDasharray="5 5" name="Current" />
                      <Line type="monotone" dataKey="projected" stroke="#6366f1" strokeWidth={3} name="Projected" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Financial Analysis</CardTitle>
                  <CardDescription>Comprehensive breakdown of your potential with ReadyAimGo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Current Monthly Revenue:</span>
                        <span className="text-lg">${inputs.currentRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Projected Monthly Revenue:</span>
                        <span className="text-lg font-bold text-green-600">
                          ${results.projectedRevenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Annual Revenue Increase:</span>
                        <span className="text-lg font-bold text-green-600">
                          ${(results.yearlyProjection - inputs.currentRevenue * 12).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">ROI (First Year):</span>
                        <span className="text-lg font-bold text-green-600">{results.roi.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Hours Saved Per Week:</span>
                        <span className="text-lg">
                          {((inputs.hoursPerWeek * results.timeSavings) / 100).toFixed(1)} hours
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Payback Period:</span>
                        <span className="text-lg">{results.paybackPeriod} months</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Network Value:</span>
                        <span className="text-lg">${results.networkValue.toLocaleString()}/month</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Break-even Point:</span>
                        <span className="text-lg">Month {Math.ceil(results.paybackPeriod)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-indigo-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-indigo-900 mb-1">How We Calculate Your Potential</h4>
                        <p className="text-sm text-indigo-800">
                          Our projections are based on real data from thousands of operators in the ReadyAimGo network,
                          adjusted for your specific business profile, market conditions, and the proven efficiency
                          gains from BEAM integration.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <Button variant="outline" onClick={exportResults}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Analysis
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">Start Your ReadyAimGo Journey</Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
