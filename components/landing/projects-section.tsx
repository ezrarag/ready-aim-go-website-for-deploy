"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

export function ProjectsSection() {
  const projects = [
    {
      name: "FemiLeasing",
      description: "Vehicle leasing and fleet operations.",
      status: "Pilot",
      statusColor: "bg-blue-100 text-blue-800"
    },
    {
      name: "PaynePros",
      description: "Professional services with student-powered support.",
      status: "In Progress",
      statusColor: "bg-yellow-100 text-yellow-800"
    },
    {
      name: "Baya",
      description: "Service platform with shared assets.",
      status: "Pilot",
      statusColor: "bg-blue-100 text-blue-800"
    }
  ]

  return (
    <section id="projects" className="py-16 md:py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            Early Projects & Pilots
          </h2>
          <p className="text-lg text-gray-600">
            See how ReadyAimGo is powering real operations today.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={project.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="p-6 h-full hover:shadow-lg transition-shadow border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                  <Badge className={project.statusColor}>
                    {project.status}
                  </Badge>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {project.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

