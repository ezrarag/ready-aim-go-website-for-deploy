export type ExtractedContractMilestone = {
  label: string
  amount: number
  triggerType: "signing" | "delivery" | "manual"
}

export type ExtractedContractData = {
  payerEntity: string
  payerContact: string
  contractorName: string
  totalFee: number
  currency: string
  milestones: ExtractedContractMilestone[]
  paymentTermsDays: number | null
  deadlineDate: string | null
}
