"use client"

import { Card } from "@/components/ui/card"
import { Briefcase, Users } from "lucide-react"
import { motion } from "framer-motion"

export function WhoWeServeSection() {
  const cards = [
    {
      label: "For Clients",
      title: "We run your digital back office.",
      icon: <Briefcase className="h-8 w-8 text-blue-600" />,
      bullets: [
        "Custom website and landing pages.",
        "Payments and subscriptions with Stripe.",
        "Admin workflows and reporting handled for you."
      ]
    },
    {
      label: "For Partners",
      title: "We operate your shared assets.",
      icon: <Users className="h-8 w-8 text-purple-600" />,
      bullets: [
        "Vehicles, studios, and shared spaces organized as a service.",
        "Scheduling, payments, and coordination handled centrally.",
        "Connect your assets to ReadyAimGo clients and projects."
      ]
    }
  ]

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {cards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="p-8 h-full hover:shadow-lg transition-shadow border border-gray-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gray-100 rounded-xl">
                    {card.icon}
                  </div>
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {card.label}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">
                  {card.title}
                </h3>
                <ul className="space-y-3">
                  {card.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-700">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

