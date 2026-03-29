import { getAllClientDirectoryEntries } from "@/lib/firestore"

export interface BeamParticipantWorkContextExport {
  sourceClientDocId: string
  sourceStoryId: string
  displayName: string
  websiteUrl: string | null
  workContexts: Array<{
    id: string
    label: string
    summary: string
    sources: string[]
    status: "suggested" | "confirmed"
  }>
  status: string
  visibility: {
    showOnFrontend: boolean
    isNewStory: boolean
  }
}

export async function listBeamParticipantWorkContextExports(): Promise<BeamParticipantWorkContextExport[]> {
  const clients = await getAllClientDirectoryEntries()

  return clients
    .map((client) => ({
      sourceClientDocId: client.id,
      sourceStoryId: client.storyId,
      displayName: client.name,
      websiteUrl: client.websiteUrl || client.deployUrl || null,
      workContexts: client.roleSuggestionSnapshot?.workContexts ?? [],
      status: client.status,
      visibility: {
        showOnFrontend: client.showOnFrontend !== false,
        isNewStory: client.isNewStory === true,
      },
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
