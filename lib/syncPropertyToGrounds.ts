import { FieldValue, type Firestore } from "firebase-admin/firestore"
import type { RAGProperty, RAGPropertyClass } from "@/types/ragProperty"

type GroundsPropertyClass =
  | "commercial"
  | "hospitality"
  | "mixed-use"
  | "distressed"
  | "residential"

function mapPropertyClass(propertyClass: RAGPropertyClass): GroundsPropertyClass {
  switch (propertyClass) {
    case "commercial-space":
      return "commercial"
    case "hotel-established":
    case "hotel-remake":
      return "hospitality"
    case "mixed-use-civic":
      return "mixed-use"
    case "distressed":
      return "distressed"
    case "residential-portfolio":
      return "residential"
    default:
      return "commercial"
  }
}

// Syncs a RAG property to the shared acquisitionSites Firestore
// collection so it appears on grounds.beamthinktank.space.
// Call this from the admin panel sync button.
// Both RAG and Grounds share the same Firebase project (home-beam).
export async function syncRAGPropertyToGrounds(
  ragProperty: RAGProperty,
  db: Firestore
): Promise<string> {
  const groundsPropertyId = ragProperty.beamGroundsPropertyId?.trim() || ragProperty.id
  const documentRef = db.collection("acquisitionSites").doc(groundsPropertyId)
  const existingSnapshot = await documentRef.get()

  const payload = {
    id: groundsPropertyId,
    ragPropertyId: ragProperty.id,
    address: ragProperty.address,
    city: ragProperty.city,
    state: ragProperty.state,
    zip: ragProperty.zip,
    lat: ragProperty.lat,
    lng: ragProperty.lng,
    name: ragProperty.name,
    node: ragProperty.node,
    status: ragProperty.status,
    isPublic: ragProperty.isPublic,
    publicTitle: ragProperty.publicName,
    publicSummary: ragProperty.publicSummary,
    publicImageUrl: ragProperty.publicImageUrl ?? null,
    propertyClass: mapPropertyClass(ragProperty.propertyClass),
    ragPropertyClass: ragProperty.propertyClass,
    ngoLinks: ragProperty.ngoLinks,
    beamGroundsPropertyId: groundsPropertyId,
    clientId: ragProperty.clientId ?? null,
    clientName: ragProperty.clientName ?? null,
    sourceSystem: "readyaimgo.biz",
    sourceCollection: "ragProperties",
    sourceUpdatedAt: ragProperty.updatedAt,
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (existingSnapshot.exists) {
    await documentRef.set(payload, { merge: true })
  } else {
    await documentRef.set({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  return groundsPropertyId
}
