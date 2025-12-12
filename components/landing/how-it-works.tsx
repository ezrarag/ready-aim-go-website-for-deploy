"use client"

import { motion } from "framer-motion"
import { Search, Wrench, TrendingUp } from "lucide-react"

export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Discovery & Scope",
      description: "We map your business, assets, and goals into a clear operations plan.",
      icon: <Search className="h-6 w-6" />
    },
    {
      number: "02",
      title: "Build & Integrate",
      description: "We build your site, connect payments, and plug into your existing tools.",
      icon: <Wrench className="h-6 w-6" />
    },
    {
      number: "03",
      title: "Run & Optimize",
      description: "We operate your stack as a subscription — from payments to shared assets — with ongoing improvements.",
      icon: <TrendingUp className="h-6 w-6" />
    }
  ]

  return (
    <section className="py-16 md:py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            How ReadyAimGo Works
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector line (hidden on mobile) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gray-300 -z-10" style={{ width: 'calc(100% - 4rem)' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-300 rounded-full"></div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    {step.icon}
                  </div>
                  <span className="text-4xl font-bold text-gray-300">{step.number}</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

