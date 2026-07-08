import { FieldValue, type Firestore } from "firebase-admin/firestore"

import { healWorkspaceChildClientIds } from "@/lib/admin/workspace-assets"

type RawDoc = {
  id: string
  data: Record<string, unknown>
}

export type CanonicalWorkspaceIssue = {
  id: string
  severity: "warning" | "danger"
  collection: "clients" | "workspaces" | "projects" | "contracts"
  docId: string
  workspaceSlug: string | null
  clientId: string | null
  field: string
  message: string
  repairable: boolean
}

export type CanonicalWorkspaceRepairResult = {
  dryRun: boolean
  workspaceSlugWrites: string[]
  workspaceClientWrites: Array<{ workspaceId: string; clientId: string }>
  clientWorkspaceIdsWrites: Array<{ clientId: string; workspaceId: string }>
  childRepairs: Array<{
    workspaceId: string
    clientId: string
    total: number
    projects: string[]
    contracts: string[]
  }>
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

function normalizeName(value: string | null): string | null {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || null
}

function clientDisplayName(data: Record<string, unknown>, fallback: string) {
  return (
    readString(data.name) ||
    readString(data.displayName) ||
    readString(data.companyName) ||
    readString(data.clientBusinessName) ||
    readString(data.storyId) ||
    fallback
  )
}

function workspaceDisplayName(data: Record<string, unknown>, fallback: string) {
  return (
    readString(data.name) ||
    readString(data.workspaceName) ||
    readString(data.businessName) ||
    readString(data.clientBusinessName) ||
    fallback
  )
}

function issue(input: Omit<CanonicalWorkspaceIssue, "id">): CanonicalWorkspaceIssue {
  return {
    ...input,
    id: `${input.collection}:${input.docId}:${input.field}`,
  }
}

async function readCollection(db: Firestore, collectionName: string, limit: number): Promise<RawDoc[]> {
  const snap = await db.collection(collectionName).limit(limit).get()
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
}

export async function buildCanonicalWorkspaceAudit(db: Firestore, limit = 1000) {
  const [clients, workspaces, projects, contracts] = await Promise.all([
    readCollection(db, "clients", limit),
    readCollection(db, "workspaces", limit),
    readCollection(db, "projects", limit),
    readCollection(db, "contracts", limit),
  ])

  const workspaceById = new Map(workspaces.map((doc) => [doc.id, doc]))
  const clientById = new Map(clients.map((doc) => [doc.id, doc]))
  const issues: CanonicalWorkspaceIssue[] = []
  const orphanClients: Array<{ clientId: string; name: string; workspaceId: string | null; reason: string }> = []

  for (const workspace of workspaces) {
    const slug = readString(workspace.data.slug)
    const clientId = readString(workspace.data.clientId)
    if (slug !== workspace.id) {
      issues.push(
        issue({
          severity: "warning",
          collection: "workspaces",
          docId: workspace.id,
          workspaceSlug: workspace.id,
          clientId,
          field: "slug",
          message: `Workspace slug should equal its document ID "${workspace.id}".`,
          repairable: true,
        })
      )
    }
    if (clientId && !clientById.has(clientId)) {
      issues.push(
        issue({
          severity: "danger",
          collection: "workspaces",
          docId: workspace.id,
          workspaceSlug: workspace.id,
          clientId,
          field: "clientId",
          message: `Workspace references missing clients/${clientId}.`,
          repairable: false,
        })
      )
    }
  }

  for (const client of clients) {
    const workspaceId = readString(client.data.workspaceId)
    if (!workspaceId) {
      orphanClients.push({
        clientId: client.id,
        name: clientDisplayName(client.data, client.id),
        workspaceId: null,
        reason: "missing-workspaceId",
      })
      issues.push(
        issue({
          severity: "warning",
          collection: "clients",
          docId: client.id,
          workspaceSlug: null,
          clientId: client.id,
          field: "workspaceId",
          message: "Client has no canonical workspaceId and should be treated as orphan until linked.",
          repairable: false,
        })
      )
      continue
    }

    const workspace = workspaceById.get(workspaceId)
    if (!workspace) {
      orphanClients.push({
        clientId: client.id,
        name: clientDisplayName(client.data, client.id),
        workspaceId,
        reason: "workspace-missing",
      })
      issues.push(
        issue({
          severity: "danger",
          collection: "clients",
          docId: client.id,
          workspaceSlug: workspaceId,
          clientId: client.id,
          field: "workspaceId",
          message: `Client points to missing workspaces/${workspaceId}.`,
          repairable: false,
        })
      )
      continue
    }

    const workspaceClientId = readString(workspace.data.clientId)
    if (workspaceClientId !== client.id) {
      issues.push(
        issue({
          severity: "warning",
          collection: "workspaces",
          docId: workspaceId,
          workspaceSlug: workspaceId,
          clientId: client.id,
          field: "clientId",
          message: `Workspace should reference canonical client "${client.id}".`,
          repairable: true,
        })
      )
    }

    const workspaceIds = readStringArray(client.data.workspaceIds)
    if (!workspaceIds.includes(workspaceId)) {
      issues.push(
        issue({
          severity: "warning",
          collection: "clients",
          docId: client.id,
          workspaceSlug: workspaceId,
          clientId: client.id,
          field: "workspaceIds",
          message: `Client workspaceIds should include canonical workspace "${workspaceId}".`,
          repairable: true,
        })
      )
    }
  }

  const inspectChild = (collection: "projects" | "contracts", doc: RawDoc) => {
    const workspaceId = readString(doc.data.workspaceId)
    const workspaceSlug = readString(doc.data.workspaceSlug)
    const clientId = readString(doc.data.clientId)
    if (!workspaceId) {
      issues.push(
        issue({
          severity: "warning",
          collection,
          docId: doc.id,
          workspaceSlug: null,
          clientId,
          field: "workspaceId",
          message: `${collection}/${doc.id} is not attached to a workspace.`,
          repairable: false,
        })
      )
      return
    }

    const workspace = workspaceById.get(workspaceId)
    if (!workspace) {
      issues.push(
        issue({
          severity: "danger",
          collection,
          docId: doc.id,
          workspaceSlug: workspaceId,
          clientId,
          field: "workspaceId",
          message: `${collection}/${doc.id} points to missing workspaces/${workspaceId}.`,
          repairable: false,
        })
      )
      return
    }

    const parentClientId = readString(workspace.data.clientId)
    if (workspaceSlug !== workspaceId) {
      issues.push(
        issue({
          severity: "warning",
          collection,
          docId: doc.id,
          workspaceSlug: workspaceId,
          clientId: clientId || parentClientId,
          field: "workspaceSlug",
          message: `${collection}/${doc.id} should carry workspaceSlug "${workspaceId}".`,
          repairable: Boolean(parentClientId),
        })
      )
    }
    if (parentClientId && clientId !== parentClientId) {
      issues.push(
        issue({
          severity: "warning",
          collection,
          docId: doc.id,
          workspaceSlug: workspaceId,
          clientId: parentClientId,
          field: "clientId",
          message: `${collection}/${doc.id} should mirror parent clientId "${parentClientId}".`,
          repairable: true,
        })
      )
    }
  }

  projects.forEach((doc) => inspectChild("projects", doc))
  contracts.forEach((doc) => inspectChild("contracts", doc))

  const clientNameIndex = new Map<string, string[]>()
  for (const client of clients) {
    const key = normalizeName(clientDisplayName(client.data, client.id))
    if (!key) continue
    const current = clientNameIndex.get(key) ?? []
    current.push(client.id)
    clientNameIndex.set(key, current)
  }
  const duplicateClientCandidates = Array.from(clientNameIndex.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([key, clientIds]) => ({ key, clientIds }))

  return {
    loadedAt: new Date().toISOString(),
    counts: {
      clients: clients.length,
      workspaces: workspaces.length,
      projects: projects.length,
      contracts: contracts.length,
      issues: issues.length,
      orphanClients: orphanClients.length,
      duplicateClientCandidates: duplicateClientCandidates.length,
    },
    orphanClients,
    duplicateClientCandidates,
    issues,
    workspaceSummaries: workspaces.map((workspace) => ({
      id: workspace.id,
      slug: readString(workspace.data.slug) || workspace.id,
      name: workspaceDisplayName(workspace.data, workspace.id),
      clientId: readString(workspace.data.clientId),
      status: readString(workspace.data.status),
      archivedDuplicateOf: readString(workspace.data.archivedDuplicateOf),
    })),
  }
}

export async function repairCanonicalWorkspaceModel(
  db: Firestore,
  options: { dryRun?: boolean; limit?: number } = {}
): Promise<CanonicalWorkspaceRepairResult> {
  const dryRun = options.dryRun !== false
  const limit = options.limit ?? 1000
  const [clients, workspaces] = await Promise.all([
    readCollection(db, "clients", limit),
    readCollection(db, "workspaces", limit),
  ])
  const workspaceById = new Map(workspaces.map((doc) => [doc.id, doc]))

  const result: CanonicalWorkspaceRepairResult = {
    dryRun,
    workspaceSlugWrites: [],
    workspaceClientWrites: [],
    clientWorkspaceIdsWrites: [],
    childRepairs: [],
  }

  if (!dryRun) {
    const batch = db.batch()
    for (const workspace of workspaces) {
      if (readString(workspace.data.slug) === workspace.id) continue
      batch.set(
        db.collection("workspaces").doc(workspace.id),
        { slug: workspace.id, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      )
      result.workspaceSlugWrites.push(workspace.id)
    }
    await batch.commit()
  } else {
    result.workspaceSlugWrites = workspaces
      .filter((workspace) => readString(workspace.data.slug) !== workspace.id)
      .map((workspace) => workspace.id)
  }

  for (const client of clients) {
    const workspaceId = readString(client.data.workspaceId)
    if (!workspaceId) continue
    const workspace = workspaceById.get(workspaceId)
    if (!workspace) continue

    if (readString(workspace.data.clientId) !== client.id) {
      result.workspaceClientWrites.push({ workspaceId, clientId: client.id })
      if (!dryRun) {
        await db.collection("workspaces").doc(workspaceId).set(
          { slug: workspaceId, clientId: client.id, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        )
      }
    }

    if (!readStringArray(client.data.workspaceIds).includes(workspaceId)) {
      result.clientWorkspaceIdsWrites.push({ clientId: client.id, workspaceId })
      if (!dryRun) {
        await db.collection("clients").doc(client.id).set(
          { workspaceIds: FieldValue.arrayUnion(workspaceId), updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        )
      }
    }

    const childRepair = dryRun
      ? null
      : await healWorkspaceChildClientIds(db, workspaceId, client.id)
    if (childRepair) {
      result.childRepairs.push({ workspaceId, clientId: client.id, ...childRepair })
    }
  }

  return result
}
