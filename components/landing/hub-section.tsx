"use client"

import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { MessageSquare, Wallet } from "lucide-react"

export function HubSection() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            One Hub for Communication and Money
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            ReadyAimGo is evolving into a central hub for your client communication and transactions — email, payments, and shared assets summarized in one place.
          </p>
        </motion.div>
      </div>

      {/* Full viewport width cards container */}
      <div className="w-full -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 xl:-mx-16 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Client Messages */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <Card className="p-6 border border-gray-200 w-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Client Messages</h3>
              </div>
              <div className="space-y-4">
                {[
                  { name: "Sarah Chen", preview: "Re: Project timeline update...", time: "2h ago" },
                  { name: "Mike Johnson", preview: "Payment received, thank you!", time: "5h ago" },
                  { name: "Emma Davis", preview: "Can we schedule a call?", time: "1d ago" }
                ].map((msg, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-gray-900">{msg.name}</span>
                      <span className="text-xs text-gray-500">{msg.time}</span>
                    </div>
                    <p className="text-sm text-gray-600">{msg.preview}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Wallet Balance */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <Card className="p-6 border border-gray-200 w-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Wallet Balance</h3>
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">$12,450.00</div>
                <div className="text-sm text-gray-500">Available balance</div>
              </div>
              <div className="space-y-3">
                {[
                  { desc: "Payment from Client A", amount: "+$2,500.00", type: "credit" },
                  { desc: "Studio rental fee", amount: "-$450.00", type: "debit" },
                  { desc: "Subscription payment", amount: "+$1,200.00", type: "credit" }
                ].map((txn, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-sm text-gray-700">{txn.desc}</span>
                    <span className={`text-sm font-medium ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.amount}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

