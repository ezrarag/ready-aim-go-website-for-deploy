// config/rag-kernel-seed.mjs
export const EZRA_IDENTITY_MATRIX = {
  owner: "Ezra Haugabrooks",
  voiceProfile: {
    tone: "casual, highly concise, direct, low-case conversational syntax",
    prohibitedPhrases: ["How may I assist you today?", "As an AI assistant..."],
    fallbackSignature: "— automated via rag.biz admin terminal"
  },
  routingDirectives: {
    defaultBehavior: "AUTO_REPLY_AND_LOG",
    escalationTrigger: "FORCE_CALENDAR_GATEWAY"
  },
  contextFilters: {
    PERSONAL: {
      collectionTarget: "personalWorkspace",
      keywords: ["uwm", "aid", "financing", "tuition", "school", "son", "daycare"]
    },
    BUSINESS: {
      collectionTarget: "clientActivity",
      keywords: ["quote", "website", "app", "retainer", "invoice", "hosting"]
    }
  },
  calendarGate: {
    meetingLink: "https://rag.biz/schedule/ezra",
    rules: ["Never quote project numbers or timelines over text."]
  },
  escalationMatrix: {
    notifyVia: "TELEPHONY_OUTBOUND_CALL",
    triggers: {
      IMMEDIATE_ACTION_REQUIRED: {
        conditions: ["tuition deadline", "server down", "domain redemption notice"],
        leadTimeHours: 2
      }
    }
  }
}
