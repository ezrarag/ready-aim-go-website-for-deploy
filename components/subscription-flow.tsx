"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Check, CreditCard, Shield, Zap, Users, Star, Building, ArrowRight, Lock, Plus } from "lucide-react"

interface SubscriptionFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPlan?: "starter" | "pro" | "enterprise"
}

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    description: "Perfect for individual creators and small projects",
    icon: Zap,
    features: [
      "Up to 5 active projects",
      "Basic operator matching",
      "Standard support",
      "File storage (5GB)",
      "Basic analytics",
      "Email notifications",
    ],
    limits: {
      projects: 5,
      storage: "5GB",
      operators: "Basic matching",
      support: "Email support",
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    description: "Ideal for growing businesses and frequent collaborations",
    icon: Star,
    popular: true,
    features: [
      "Unlimited active projects",
      "Advanced operator matching",
      "Priority support",
      "File storage (50GB)",
      "Advanced analytics & insights",
      "Real-time notifications",
      "Custom branding",
      "API access",
    ],
    limits: {
      projects: "Unlimited",
      storage: "50GB",
      operators: "Advanced matching",
      support: "Priority support",
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
    description: "For large teams and organizations with custom needs",
    icon: Building,
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "Unlimited file storage",
      "White-label solution",
      "SLA guarantee",
      "Advanced security",
      "Custom workflows",
      "Bulk operator management",
    ],
    limits: {
      projects: "Unlimited",
      storage: "Unlimited",
      operators: "Dedicated matching",
      support: "Dedicated manager",
    },
  },
]

export function SubscriptionFlow({ open, onOpenChange, initialPlan = "pro" }: SubscriptionFlowProps) {
  const [selectedPlan, setSelectedPlan] = useState(initialPlan)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [currentStep, setCurrentStep] = useState<"plans" | "billing" | "payment" | "confirmation">("plans")
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card")
  const [isProcessing, setIsProcessing] = useState(false)

  const [billingInfo, setBillingInfo] = useState({
    email: "",
    fullName: "",
    company: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  })

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
  })

  const selectedPlanData = plans.find((plan) => plan.id === selectedPlan)!
  const yearlyDiscount = 0.2 // 20% discount for yearly
  const finalPrice =
    billingCycle === "yearly" ? selectedPlanData.price * 12 * (1 - yearlyDiscount) : selectedPlanData.price

  const handleSubscribe = async () => {
    setIsProcessing(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Here you would integrate with Stripe
    const subscriptionData = {
      plan: selectedPlan,
      billingCycle,
      price: finalPrice,
      billingInfo,
      paymentInfo: paymentMethod === "card" ? paymentInfo : null,
    }

    console.log("Creating subscription:", subscriptionData)

    setCurrentStep("confirmation")
    setIsProcessing(false)
  }

  const PlanIcon = selectedPlanData.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {currentStep === "plans" && "Choose Your Plan"}
            {currentStep === "billing" && "Billing Information"}
            {currentStep === "payment" && "Payment Details"}
            {currentStep === "confirmation" && "Welcome to ReadyAimGo!"}
          </DialogTitle>
          <DialogDescription>
            {currentStep === "plans" && "Select the perfect plan for your creative needs"}
            {currentStep === "billing" && "Enter your billing information"}
            {currentStep === "payment" && "Secure payment processing"}
            {currentStep === "confirmation" && "Your subscription is now active"}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {currentStep === "plans" && (
            <div className="space-y-6">
              {/* Billing Toggle */}
              <div className="flex items-center justify-center space-x-4">
                <span className={billingCycle === "monthly" ? "font-medium" : "text-gray-500"}>Monthly</span>
                <button
                  onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      billingCycle === "yearly" ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className={billingCycle === "yearly" ? "font-medium" : "text-gray-500"}>
                  Yearly{" "}
                  <Badge variant="secondary" className="ml-1">
                    Save 20%
                  </Badge>
                </span>
              </div>

              {/* Plans Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const Icon = plan.icon
                  const isSelected = selectedPlan === plan.id
                  const planPrice = billingCycle === "yearly" ? plan.price * 12 * (1 - yearlyDiscount) : plan.price

                  return (
                    <Card
                      key={plan.id}
                      className={`relative cursor-pointer transition-all hover:shadow-lg ${
                        isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""
                      } ${plan.popular ? "border-blue-500" : ""}`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                        </div>
                      )}
                      <CardHeader className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                          <Icon className="h-6 w-6 text-blue-600" />
                        </div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <div className="space-y-1">
                          <div className="text-3xl font-bold">
                            ${billingCycle === "yearly" ? Math.round(planPrice / 12) : planPrice}
                            <span className="text-lg font-normal text-gray-500">
                              /{billingCycle === "yearly" ? "mo" : "month"}
                            </span>
                          </div>
                          {billingCycle === "yearly" && (
                            <div className="text-sm text-gray-500">${Math.round(planPrice)} billed annually</div>
                          )}
                        </div>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <Check className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep("billing")} size="lg">
                  Continue with {selectedPlanData.name}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === "billing" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Billing Information</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={billingInfo.fullName}
                        onChange={(e) => setBillingInfo((prev) => ({ ...prev, fullName: e.target.value }))}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={billingInfo.email}
                        onChange={(e) => setBillingInfo((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="company">Company (Optional)</Label>
                    <Input
                      id="company"
                      value={billingInfo.company}
                      onChange={(e) => setBillingInfo((prev) => ({ ...prev, company: e.target.value }))}
                      placeholder="Acme Inc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={billingInfo.address}
                      onChange={(e) => setBillingInfo((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={billingInfo.city}
                        onChange={(e) => setBillingInfo((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={billingInfo.state}
                        onChange={(e) => setBillingInfo((prev) => ({ ...prev, state: e.target.value }))}
                        placeholder="NY"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={billingInfo.zipCode}
                        onChange={(e) => setBillingInfo((prev) => ({ ...prev, zipCode: e.target.value }))}
                        placeholder="10001"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center space-x-3">
                        <PlanIcon className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">{selectedPlanData.name} Plan</div>
                          <div className="text-sm text-gray-500">
                            {billingCycle === "yearly" ? "Annual" : "Monthly"} billing
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>
                            ${billingCycle === "yearly" ? selectedPlanData.price * 12 : selectedPlanData.price}
                          </span>
                        </div>
                        {billingCycle === "yearly" && (
                          <div className="flex justify-between text-green-600">
                            <span>Annual discount (20%)</span>
                            <span>-${Math.round(selectedPlanData.price * 12 * yearlyDiscount)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>${Math.round(finalPrice)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep("plans")}>
                  Back to Plans
                </Button>
                <Button onClick={() => setCurrentStep("payment")}>
                  Continue to Payment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === "payment" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Payment Method</h3>

                  <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "card" | "paypal")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="card">Credit Card</TabsTrigger>
                      <TabsTrigger value="paypal">PayPal</TabsTrigger>
                    </TabsList>

                    <TabsContent value="card" className="space-y-4">
                      <div>
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input
                          id="cardNumber"
                          value={paymentInfo.cardNumber}
                          onChange={(e) => setPaymentInfo((prev) => ({ ...prev, cardNumber: e.target.value }))}
                          placeholder="1234 5678 9012 3456"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expiryDate">Expiry Date</Label>
                          <Input
                            id="expiryDate"
                            value={paymentInfo.expiryDate}
                            onChange={(e) => setPaymentInfo((prev) => ({ ...prev, expiryDate: e.target.value }))}
                            placeholder="MM/YY"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            value={paymentInfo.cvv}
                            onChange={(e) => setPaymentInfo((prev) => ({ ...prev, cvv: e.target.value }))}
                            placeholder="123"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="nameOnCard">Name on Card</Label>
                        <Input
                          id="nameOnCard"
                          value={paymentInfo.nameOnCard}
                          onChange={(e) => setPaymentInfo((prev) => ({ ...prev, nameOnCard: e.target.value }))}
                          placeholder="John Doe"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="paypal" className="text-center py-8">
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                          <CreditCard className="h-8 w-8 text-blue-600" />
                        </div>
                        <p className="text-gray-600">You'll be redirected to PayPal to complete your payment</p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Shield className="h-4 w-4" />
                    <span>Your payment information is secure and encrypted</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Final Summary</h3>
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center space-x-3">
                        <PlanIcon className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">{selectedPlanData.name} Plan</div>
                          <div className="text-sm text-gray-500">
                            {billingCycle === "yearly" ? "Annual" : "Monthly"} billing
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Plan</span>
                          <span>
                            ${billingCycle === "yearly" ? selectedPlanData.price * 12 : selectedPlanData.price}
                          </span>
                        </div>
                        {billingCycle === "yearly" && (
                          <div className="flex justify-between text-green-600">
                            <span>Annual discount</span>
                            <span>-${Math.round(selectedPlanData.price * 12 * yearlyDiscount)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-semibold text-base">
                          <span>Total</span>
                          <span>${Math.round(finalPrice)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        {billingCycle === "yearly"
                          ? `Billed annually. Next billing date: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}`
                          : `Billed monthly. Next billing date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep("billing")}>
                  Back to Billing
                </Button>
                <Button onClick={handleSubscribe} disabled={isProcessing} size="lg">
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Complete Subscription
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {currentStep === "confirmation" && (
            <div className="text-center space-y-6 py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to ReadyAimGo!</h3>
                <p className="text-gray-600">
                  Your {selectedPlanData.name} subscription is now active. You can start creating projects right away.
                </p>
              </div>

              <Card className="max-w-md mx-auto">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="font-medium">{selectedPlanData.name} Plan</div>
                      <div className="text-sm text-gray-500">Active subscription</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h4 className="font-semibold">What's Next?</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <Plus className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h5 className="font-medium mb-1">Create Your First Project</h5>
                    <p className="text-sm text-gray-600">Start by uploading your creative project</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h5 className="font-medium mb-1">Explore Operators</h5>
                    <p className="text-sm text-gray-600">Browse our network of skilled professionals</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <Star className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h5 className="font-medium mb-1">Track Progress</h5>
                    <p className="text-sm text-gray-600">Monitor your projects in real-time</p>
                  </Card>
                </div>
              </div>

              <Button onClick={() => onOpenChange(false)} size="lg">
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
