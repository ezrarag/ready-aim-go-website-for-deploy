import { FieldValue, type Firestore } from "firebase-admin/firestore"

export type WorkspaceDuplicateWorkspace = {
  id: string
  name: string
  nameSlug: string
  baseNameSlug: string
  generatedSuffix: boolean
  clientId: string | null
  clientEmail: string | null
  ownerUid: string | null
  domains: string[]
  repos: string[]
  vercelKeys: string[]
  projectIds: string[]
  memberUids: string[]
  memberEmails: string[]
  pendingInviteEmails: string[]
  createdAt: string | null
  updatedAt: string | null
  archivedDuplicateOf: string | null
  score: number
}

export type WorkspaceDuplicateCluster = {
  id: string
  canonicalWorkspaceId: string
  duplicateWorkspaceIds: string[]
  reasons: string[]
  workspaces: WorkspaceDuplicateWorkspace[]
}

export type WorkspaceDuplicateReference = {
  collection: "users" | "clients" | "projects" | "ragAllowlist" | "workspaces"
  docId: string
  field: string
  from: string[]
  to: string[]
}

export type WorkspaceDuplicateMergePlan = {
  dryRun: boolean
  canonicalWorkspaceId: string
  duplicateWorkspaceIds: string[]
  references: WorkspaceDuplicateReference[]
  memberCopies: Array<{ fromWorkspaceId: string; toWorkspaceId: string; uid: string }>
  duplicateArchiveWrites: Array<{ workspaceId: string; archivedDuplicateOf: string }>
}

export type WorkspaceDuplicateAudit = {
  success: true
  data: {
    workspaces: WorkspaceDuplicateWorkspace[]
    clusters: WorkspaceDuplicateCluster[]
    knownIssue: WorkspaceDuplicateCluster[]
    handoffsInspected: number
    loadedAt: string
  }
}

type RawDoc = {
  id: string
  data: Record<string, unknown>
}

type WorkspaceMemberIndex = Map<string, Array<{ uid: string; email: string }>>
type PendingInviteIndex = Map<string, string[]>

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
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

function toIsoString(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (typeof value === "string") return value
  if (typeof value === "number") return new Date(value).toISOString()
  if (typeof value === "object") {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number }
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString()
    const seconds = timestamp.seconds ?? timestamp._seconds
    if (typeof seconds === "number") return new Date(seconds * 1000).toISOString()
  }
  return null
}

function timestampMillis(value: unknown): number {
  const iso = toIsoString(value)
  if (!iso) return 0
  const millis = new Date(iso).getTime()
  return Number.isNaN(millis) ? 0 : millis
}

export function slugifyWorkspaceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

function stripGeneratedSuffix(slug: string): { base: string; generated: boolean } {
  const match = slug.match(/^(.+)-[a-z0-9]{5}$/)
  return match?.[1] ? { base: match[1], generated: true } : { base: slug, generated: false }
}

function normalizeDomain(value: string | null): string | null {
  if (!value) return null
  const withoutProtocol = value.replace(/^https?:\/\//i, "").split("/")[0] ?? ""
  const normalized = withoutProtocol.replace(/^www\./i, "").trim().toLowerCase()
  return normalized || null
}

function normalizeRepo(value: string | null): string | null {
  if (!value) return null
  return value
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .trim()
    .toLowerCase() || null
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function collectWorkspaceDomains(data: Record<string, unknown>): string[] {
  const hosting = asRecord(data.hosting)
  const registrarDomains = Array.isArray(hosting.domainRegistrars)
    ? hosting.domainRegistrars.flatMap((item) => {
        const record = asRecord(item)
        return [readString(record.domain)]
      })
    : []
  const staticHosts = Array.isArray(hosting.staticHosts)
    ? hosting.staticHosts.flatMap((host) => {
        const record = asRecord(host)
        return [readString(record.productionUrl)]
      })
    : []

  return unique([
    readString(data.primaryDomain),
    readString(data.targetDomain),
    readString(data.productionUrl),
    ...readStringArray(data.domains),
    ...registrarDomains,
    ...staticHosts,
  ].map((value) => normalizeDomain(value ?? null)))
}

function collectWorkspaceRepos(data: Record<string, unknown>): string[] {
  const repoObjects = Array.isArray(data.repos)
    ? data.repos.flatMap((repo) => {
        const record = asRecord(repo)
        return [readString(record.fullName), readString(record.url)]
      })
    : []

  return unique([
    readString(data.githubRepo),
    ...readStringArray(data.githubRepos),
    ...readStringArray(data.repositoryChains),
    ...repoObjects,
  ].map((value) => normalizeRepo(value ?? null)))
}

function collectVercelKeys(data: Record<string, unknown>): string[] {
  const projects = Array.isArray(data.vercelProjects) ? data.vercelProjects : []
  return unique(
    projects.flatMap((project) => {
      const record = asRecord(project)
      return [
        readString(record.id),
        readString(record.name),
        normalizeDomain(readString(record.url)),
        ...readStringArray(record.domains).map((domain) => normalizeDomain(domain)),
      ]
    })
  )
}

function scoreWorkspace(workspace: Omit<WorkspaceDuplicateWorkspace, "score">, referenceCount: number): number {
  let score = 0
  if (workspace.domains.length > 0) score += 120
  if (workspace.repos.length > 0 || workspace.vercelKeys.length > 0) score += 90
  if (workspace.nameSlug && workspace.nameSlug !== "untitled-workspace") score += 45
  if (workspace.memberUids.length > 0 || workspace.memberEmails.length > 0) score += 30
  if (referenceCount > 0) score += 35
  if (!workspace.generatedSuffix) score += 12
  if (workspace.id === workspace.baseNameSlug) score += 10
  if (workspace.archivedDuplicateOf) score -= 500
  score -= Math.min(20, Math.floor((Date.now() - (timestampMillis(workspace.createdAt) || Date.now())) / 86_400_000 / 365))
  return score
}

function addIndex(map: Map<string, Set<string>>, key: string, workspaceId: string) {
  const existing = map.get(key) ?? new Set<string>()
  existing.add(workspaceId)
  map.set(key, existing)
}

function isWorkspaceSubcollectionDoc(ref: FirebaseFirestore.DocumentReference) {
  return ref.parent.parent?.parent.id === "workspaces"
}

function canonicalClusterId(workspaceIds: string[]) {
  return workspaceIds.slice().sort().join("__")
}

function buildClusters(workspaces: WorkspaceDuplicateWorkspace[]): WorkspaceDuplicateCluster[] {
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]))
  const indexes = new Map<string, Set<string>>()

  for (const workspace of workspaces) {
    if (workspace.archivedDuplicateOf) continue
    const nameKey = workspace.baseNameSlug || workspace.nameSlug
    if (nameKey && nameKey !== "untitled-workspace") {
      if (workspace.clientId) addIndex(indexes, `client-name:${workspace.clientId}:${nameKey}`, workspace.id)
      if (workspace.clientEmail) addIndex(indexes, `email-name:${workspace.clientEmail}:${nameKey}`, workspace.id)
      if (workspace.ownerUid) addIndex(indexes, `owner-name:${workspace.ownerUid}:${nameKey}`, workspace.id)
      for (const uid of workspace.memberUids) addIndex(indexes, `member-name:${uid}:${nameKey}`, workspace.id)
      for (const email of workspace.memberEmails) addIndex(indexes, `member-email-name:${email}:${nameKey}`, workspace.id)
      for (const email of workspace.pendingInviteEmails) addIndex(indexes, `invite-email-name:${email}:${nameKey}`, workspace.id)
    }
    for (const domain of workspace.domains) addIndex(indexes, `domain:${domain}`, workspace.id)
    for (const repo of workspace.repos) addIndex(indexes, `repo:${repo}`, workspace.id)
    for (const vercel of workspace.vercelKeys) addIndex(indexes, `vercel:${vercel}`, workspace.id)
    for (const projectId of workspace.projectIds) addIndex(indexes, `project:${projectId}`, workspace.id)
    if (workspace.generatedSuffix && workspace.baseNameSlug) {
      addIndex(indexes, `generated-name:${workspace.baseNameSlug}`, workspace.id)
      for (const other of workspaces) {
        if (!other.archivedDuplicateOf && other.nameSlug === workspace.baseNameSlug) {
          addIndex(indexes, `generated-name:${workspace.baseNameSlug}`, other.id)
        }
      }
    }
  }

  const adjacency = new Map<string, Set<string>>()
  const reasonsByPair = new Map<string, Set<string>>()
  const addEdge = (a: string, b: string, reason: string) => {
    const aSet = adjacency.get(a) ?? new Set<string>()
    const bSet = adjacency.get(b) ?? new Set<string>()
    aSet.add(b)
    bSet.add(a)
    adjacency.set(a, aSet)
    adjacency.set(b, bSet)
    const pair = [a, b].sort().join("::")
    const reasons = reasonsByPair.get(pair) ?? new Set<string>()
    reasons.add(reason)
    reasonsByPair.set(pair, reasons)
  }

  for (const [key, ids] of indexes.entries()) {
    if (ids.size < 2) continue
    const idList = Array.from(ids)
    for (let i = 0; i < idList.length; i += 1) {
      for (let j = i + 1; j < idList.length; j += 1) {
        addEdge(idList[i], idList[j], key)
      }
    }
  }

  const visited = new Set<string>()
  const clusters: WorkspaceDuplicateCluster[] = []

  for (const workspace of workspaces) {
    if (visited.has(workspace.id) || !adjacency.has(workspace.id)) continue
    const stack = [workspace.id]
    const ids = new Set<string>()
    while (stack.length > 0) {
      const id = stack.pop()!
      if (ids.has(id)) continue
      ids.add(id)
      visited.add(id)
      for (const next of adjacency.get(id) ?? []) stack.push(next)
    }
    if (ids.size < 2) continue
    const clusterWorkspaces = Array.from(ids)
      .map((id) => workspaceById.get(id))
      .filter((item): item is WorkspaceDuplicateWorkspace => Boolean(item))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    const canonical = clusterWorkspaces[0]
    const reasons = new Set<string>()
    const idList = Array.from(ids)
    for (let i = 0; i < idList.length; i += 1) {
      for (let j = i + 1; j < idList.length; j += 1) {
        for (const reason of reasonsByPair.get([idList[i], idList[j]].sort().join("::")) ?? []) {
          reasons.add(reason)
        }
      }
    }

    clusters.push({
      id: canonicalClusterId(idList),
      canonicalWorkspaceId: canonical.id,
      duplicateWorkspaceIds: clusterWorkspaces.filter((item) => item.id !== canonical.id).map((item) => item.id),
      reasons: Array.from(reasons).sort(),
      workspaces: clusterWorkspaces,
    })
  }

  return clusters.sort((a, b) => b.workspaces.length - a.workspaces.length || a.canonicalWorkspaceId.localeCompare(b.canonicalWorkspaceId))
}

export async function buildWorkspaceDuplicateAudit(db: Firestore, limit = 500): Promise<WorkspaceDuplicateAudit["data"]> {
  const [workspacesSnap, usersSnap, clientsSnap, projectsSnap, allowlistSnap, handoffsSnap, membersSnap, pendingInvitesSnap] = await Promise.all([
    db.collection("workspaces").limit(limit).get(),
    db.collection("users").limit(limit).get(),
    db.collection("clients").limit(limit).get(),
    db.collection("projects").limit(limit).get(),
    db.collection("ragAllowlist").limit(limit).get(),
    db.collection("clientPortalHandoffs").limit(limit).get().catch(() => null),
    db.collectionGroup("members").limit(limit * 8).get().catch(() => null),
    db.collectionGroup("pendingInvites").limit(limit * 4).get().catch(() => null),
  ])

  const users = usersSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
  const clients = clientsSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
  const projects = projectsSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
  const allowlist = allowlistSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
  const handoffs = handoffsSnap?.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> })) ?? []

  const membersByWorkspace: WorkspaceMemberIndex = new Map()
  for (const doc of membersSnap?.docs ?? []) {
    if (!isWorkspaceSubcollectionDoc(doc.ref)) continue
    const workspaceId = doc.ref.parent.parent?.id
    if (!workspaceId) continue
    const data = doc.data() as Record<string, unknown>
    const list = membersByWorkspace.get(workspaceId) ?? []
    list.push({ uid: readString(data.uid) || doc.id, email: readString(data.email)?.toLowerCase() || "" })
    membersByWorkspace.set(workspaceId, list)
  }

  const pendingByWorkspace: PendingInviteIndex = new Map()
  for (const doc of pendingInvitesSnap?.docs ?? []) {
    if (!isWorkspaceSubcollectionDoc(doc.ref)) continue
    const workspaceId = doc.ref.parent.parent?.id
    if (!workspaceId) continue
    const email = readString((doc.data() as Record<string, unknown>).email)?.toLowerCase()
    if (!email) continue
    const list = pendingByWorkspace.get(workspaceId) ?? []
    list.push(email)
    pendingByWorkspace.set(workspaceId, list)
  }

  const referenceCounts = new Map<string, number>()
  const addReference = (workspaceId: string | null) => {
    if (!workspaceId) return
    referenceCounts.set(workspaceId, (referenceCounts.get(workspaceId) ?? 0) + 1)
  }
  for (const user of users) for (const workspaceId of readStringArray(user.data.workspaceIds)) addReference(workspaceId)
  for (const client of clients) {
    addReference(readString(client.data.workspaceId))
    for (const workspaceId of readStringArray(client.data.workspaceIds)) addReference(workspaceId)
  }
  for (const project of projects) addReference(readString(project.data.workspaceId))
  for (const entry of allowlist) for (const workspaceId of readStringArray(entry.data.workspaceIds)) addReference(workspaceId)
  for (const handoff of handoffs) {
    addReference(readString(handoff.data.workspaceId))
    for (const workspaceId of readStringArray(handoff.data.workspaceIds)) addReference(workspaceId)
  }

  const workspaces = workspacesSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>
    const name = readString(data.name) || readString(data.workspaceName) || doc.id
    const nameSlug = slugifyWorkspaceName(name)
    const { base, generated } = stripGeneratedSuffix(nameSlug || slugifyWorkspaceName(doc.id))
    const members = membersByWorkspace.get(doc.id) ?? []
    const workspace: Omit<WorkspaceDuplicateWorkspace, "score"> = {
      id: doc.id,
      name,
      nameSlug,
      baseNameSlug: base,
      generatedSuffix: generated || stripGeneratedSuffix(slugifyWorkspaceName(doc.id)).generated,
      clientId: readString(data.clientId),
      clientEmail: readString(data.clientEmail)?.toLowerCase() || null,
      ownerUid: readString(data.ownerUid),
      domains: collectWorkspaceDomains(data),
      repos: collectWorkspaceRepos(data),
      vercelKeys: collectVercelKeys(data),
      projectIds: readStringArray(data.projectIds),
      memberUids: unique(members.map((member) => member.uid)),
      memberEmails: unique(members.map((member) => member.email)),
      pendingInviteEmails: unique(pendingByWorkspace.get(doc.id) ?? []),
      createdAt: toIsoString(data.createdAt),
      updatedAt: toIsoString(data.updatedAt),
      archivedDuplicateOf: readString(data.archivedDuplicateOf),
    }
    return { ...workspace, score: scoreWorkspace(workspace, referenceCounts.get(doc.id) ?? 0) }
  })

  const clusters = buildClusters(workspaces)
  const knownIds = new Set(["clients", "clients-5g8uf", "main-site"])
  const knownIssue = clusters.filter((cluster) =>
    cluster.workspaces.some((workspace) =>
      knownIds.has(workspace.id) ||
      workspace.nameSlug === "untitled-workspace" ||
      workspace.memberEmails.includes("ezra@readyaimgo.biz") ||
      workspace.domains.includes("clients.readyaimgo.biz") ||
      workspace.domains.includes("readyaimgo.biz")
    )
  )

  return {
    workspaces,
    clusters,
    knownIssue,
    handoffsInspected: handoffs.length,
    loadedAt: new Date().toISOString(),
  }
}

function rewriteWorkspaceIds(values: string[], canonicalWorkspaceId: string, duplicateWorkspaceIds: string[]) {
  const duplicateSet = new Set(duplicateWorkspaceIds)
  const next = values.filter((value) => !duplicateSet.has(value))
  if (!next.includes(canonicalWorkspaceId)) next.push(canonicalWorkspaceId)
  return Array.from(new Set(next))
}

export async function buildWorkspaceDuplicateMergePlan(input: {
  db: Firestore
  canonicalWorkspaceId: string
  duplicateWorkspaceIds: string[]
  dryRun?: boolean
}): Promise<WorkspaceDuplicateMergePlan> {
  const canonicalWorkspaceId = input.canonicalWorkspaceId.trim()
  const duplicateWorkspaceIds = Array.from(new Set(input.duplicateWorkspaceIds.map((id) => id.trim()).filter(Boolean))).filter(
    (id) => id !== canonicalWorkspaceId
  )
  const references: WorkspaceDuplicateReference[] = []
  const memberCopies: WorkspaceDuplicateMergePlan["memberCopies"] = []
  const duplicateArchiveWrites = duplicateWorkspaceIds.map((workspaceId) => ({ workspaceId, archivedDuplicateOf: canonicalWorkspaceId }))

  if (!canonicalWorkspaceId || duplicateWorkspaceIds.length === 0) {
    return { dryRun: input.dryRun !== false, canonicalWorkspaceId, duplicateWorkspaceIds, references, memberCopies, duplicateArchiveWrites: [] }
  }

  const duplicateSet = new Set(duplicateWorkspaceIds)
  const [usersSnap, clientsSnap, projectsSnap, allowlistSnap, duplicateMembersSnap] = await Promise.all([
    input.db.collection("users").limit(1000).get(),
    input.db.collection("clients").limit(1000).get(),
    input.db.collection("projects").limit(1000).get(),
    input.db.collection("ragAllowlist").limit(1000).get(),
    input.db.collectionGroup("members").limit(5000).get().catch(() => null),
  ])

  for (const doc of usersSnap.docs) {
    const data = doc.data() as Record<string, unknown>
    const current = readStringArray(data.workspaceIds)
    if (!current.some((id) => duplicateSet.has(id))) continue
    references.push({ collection: "users", docId: doc.id, field: "workspaceIds", from: current, to: rewriteWorkspaceIds(current, canonicalWorkspaceId, duplicateWorkspaceIds) })
  }

  for (const doc of clientsSnap.docs) {
    const data = doc.data() as Record<string, unknown>
    const currentWorkspaceId = readString(data.workspaceId)
    if (currentWorkspaceId && duplicateSet.has(currentWorkspaceId)) {
      references.push({ collection: "clients", docId: doc.id, field: "workspaceId", from: [currentWorkspaceId], to: [canonicalWorkspaceId] })
    }
    const current = readStringArray(data.workspaceIds)
    if (current.some((id) => duplicateSet.has(id))) {
      references.push({ collection: "clients", docId: doc.id, field: "workspaceIds", from: current, to: rewriteWorkspaceIds(current, canonicalWorkspaceId, duplicateWorkspaceIds) })
    }
  }

  for (const doc of projectsSnap.docs) {
    const data = doc.data() as Record<string, unknown>
    const currentWorkspaceId = readString(data.workspaceId)
    if (currentWorkspaceId && duplicateSet.has(currentWorkspaceId)) {
      references.push({ collection: "projects", docId: doc.id, field: "workspaceId", from: [currentWorkspaceId], to: [canonicalWorkspaceId] })
    }
  }

  for (const doc of allowlistSnap.docs) {
    const data = doc.data() as Record<string, unknown>
    const current = readStringArray(data.workspaceIds)
    if (current.some((id) => duplicateSet.has(id))) {
      references.push({ collection: "ragAllowlist", docId: doc.id, field: "workspaceIds", from: current, to: rewriteWorkspaceIds(current, canonicalWorkspaceId, duplicateWorkspaceIds) })
    }
  }

  for (const memberDoc of duplicateMembersSnap?.docs ?? []) {
    if (!isWorkspaceSubcollectionDoc(memberDoc.ref)) continue
    const workspaceId = memberDoc.ref.parent.parent?.id
    if (!workspaceId || !duplicateSet.has(workspaceId)) continue
    memberCopies.push({ fromWorkspaceId: workspaceId, toWorkspaceId: canonicalWorkspaceId, uid: memberDoc.id })
  }

  return {
    dryRun: input.dryRun !== false,
    canonicalWorkspaceId,
    duplicateWorkspaceIds,
    references,
    memberCopies,
    duplicateArchiveWrites,
  }
}

export async function applyWorkspaceDuplicateMergePlan(db: Firestore, plan: WorkspaceDuplicateMergePlan): Promise<void> {
  const now = FieldValue.serverTimestamp()
  const batch = db.batch()

  for (const reference of plan.references) {
    const ref = db.collection(reference.collection).doc(reference.docId)
    batch.set(ref, { [reference.field]: reference.field === "workspaceId" ? reference.to[0] : reference.to, updatedAt: now }, { merge: true })
  }

  for (const copy of plan.memberCopies) {
    const sourceRef = db.collection("workspaces").doc(copy.fromWorkspaceId).collection("members").doc(copy.uid)
    const sourceSnap = await sourceRef.get()
    if (!sourceSnap.exists) continue
    batch.set(
      db.collection("workspaces").doc(copy.toWorkspaceId).collection("members").doc(copy.uid),
      {
        ...sourceSnap.data(),
        mergedFromWorkspaceId: copy.fromWorkspaceId,
        updatedAt: now,
      },
      { merge: true }
    )
  }

  const duplicateIds = plan.duplicateWorkspaceIds
  batch.set(
    db.collection("workspaces").doc(plan.canonicalWorkspaceId),
    {
      mergedDuplicateWorkspaceIds: FieldValue.arrayUnion(...duplicateIds),
      updatedAt: now,
    },
    { merge: true }
  )

  for (const archive of plan.duplicateArchiveWrites) {
    batch.set(
      db.collection("workspaces").doc(archive.workspaceId),
      {
        status: "archived",
        archivedDuplicateOf: archive.archivedDuplicateOf,
        archivedAt: now,
        updatedAt: now,
      },
      { merge: true }
    )
  }

  await batch.commit()
}
