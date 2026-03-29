import { type NextRequest, NextResponse } from "next/server"
import {
  getClientDirectoryEntryById,
  getClientWorkspace,
  upsertClientWorkspace,
} from "@/lib/firestore"
import {
  buildDefaultClientWorkspace,
  normalizeClientWorkspace,
} from "@/lib/client-workspace"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const client = await getClientDirectoryEntryById(id)
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const persistedWorkspace = await getClientWorkspace(client.id)
    const workspace = persistedWorkspace ?? buildDefaultClientWorkspace(client)

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
      },
      workspace,
      persisted: Boolean(persistedWorkspace),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load workspace",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const client = await getClientDirectoryEntryById(id)
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const candidateWorkspace = body?.workspace ?? body
    const workspace = normalizeClientWorkspace(candidateWorkspace, client)

    await upsertClientWorkspace(client.id, workspace)

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
      },
      workspace: {
        ...workspace,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save workspace",
      },
      { status: 500 }
    )
  }
}
