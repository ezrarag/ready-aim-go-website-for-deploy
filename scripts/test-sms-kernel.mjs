#!/usr/bin/env node
// scripts/test-sms-kernel.mjs
//
// Local simulator for the RAG kernel routing logic. Feeds sample inbound
// messages through the EZRA_IDENTITY_MATRIX classifiers and prints the
// resulting routing/escalation decisions — no Telnyx credentials required.
// Run with: npm run ra:test-kernel

import { EZRA_IDENTITY_MATRIX } from "../config/rag-kernel-seed.mjs"

const SAMPLE_MESSAGES = [
  { from: "+14145550101", body: "hey is the website quote still good for $2500?" },
  { from: "+14145550102", body: "reminder: son's daycare tuition is due friday" },
  { from: "+14145550103", body: "URGENT - domain redemption notice, act now or lose readyaimgo.biz" },
  { from: "+14145550104", body: "can we hop on a call to talk retainer pricing for next month" },
  { from: "+14145550105", body: "yo what's up" }
]

function classifyContext(body, filters) {
  const lower = body.toLowerCase()
  for (const [label, filter] of Object.entries(filters)) {
    if (filter.keywords.some((keyword) => lower.includes(keyword))) {
      return { label, collectionTarget: filter.collectionTarget }
    }
  }
  return { label: "UNCLASSIFIED", collectionTarget: null }
}

function checkEscalation(body, escalationMatrix) {
  const lower = body.toLowerCase()
  for (const [name, trigger] of Object.entries(escalationMatrix.triggers)) {
    if (trigger.conditions.some((condition) => lower.includes(condition))) {
      return { name, leadTimeHours: trigger.leadTimeHours, notifyVia: escalationMatrix.notifyVia }
    }
  }
  return null
}

function decideRoute(message, matrix) {
  const context = classifyContext(message.body, matrix.contextFilters)
  const escalation = checkEscalation(message.body, matrix.escalationMatrix)

  return {
    from: message.from,
    body: message.body,
    context,
    behavior: escalation ? matrix.routingDirectives.escalationTrigger : matrix.routingDirectives.defaultBehavior,
    escalation
  }
}

function printDecision(decision) {
  console.log(`\nFrom: ${decision.from}`)
  console.log(`  Message:   ${decision.body}`)
  console.log(`  Context:   ${decision.context.label}${decision.context.collectionTarget ? ` -> ${decision.context.collectionTarget}` : ""}`)
  console.log(`  Behavior:  ${decision.behavior}`)
  if (decision.escalation) {
    console.log(`  Escalation: ${decision.escalation.name} (notify via ${decision.escalation.notifyVia}, lead time ${decision.escalation.leadTimeHours}h)`)
  }
}

function main() {
  console.log(`Running kernel simulation for ${EZRA_IDENTITY_MATRIX.owner}`)
  console.log(`Voice tone: ${EZRA_IDENTITY_MATRIX.voiceProfile.tone}`)

  const decisions = SAMPLE_MESSAGES.map((message) => decideRoute(message, EZRA_IDENTITY_MATRIX))
  decisions.forEach(printDecision)

  const escalations = decisions.filter((decision) => decision.escalation)
  console.log(`\n${decisions.length} messages processed, ${escalations.length} escalation(s) triggered.`)
}

main()
