"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { ensureAuthPersistence, getClientUserProfile, type ClientUserProfile } from "@/lib/firebase-client"

type UserWithId = User & { id: string }

interface UserSession {
  user: UserWithId
  profile: ClientUserProfile | null
  avatar_url?: string
  full_name?: string
  email?: string
}

export function useUserWithRole() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    let unsubscribe: (() => void) | undefined

    const initialize = async () => {
      try {
        const auth = await ensureAuthPersistence()
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!isMounted) {
            return
          }

          if (!user) {
            setSession(null)
            setError(null)
            setLoading(false)
            return
          }

          try {
            const profile = await getClientUserProfile(user.uid)
            if (!isMounted) {
              return
            }

            const userWithId = Object.assign(user, { id: user.uid }) as UserWithId

            setSession({
              user: userWithId,
              profile,
              avatar_url: profile?.avatar_url || user.photoURL || undefined,
              full_name: profile?.full_name || user.displayName || undefined,
              email: profile?.email || user.email || undefined,
            })
            setError(null)
          } catch (profileError) {
            console.error(profileError)
            if (!isMounted) {
              return
            }

            const userWithId = Object.assign(user, { id: user.uid }) as UserWithId

            setSession({
              user: userWithId,
              profile: null,
              avatar_url: user.photoURL || undefined,
              full_name: user.displayName || undefined,
              email: user.email || undefined,
            })
            setError(
              profileError instanceof Error ? profileError.message : "Unable to load user profile."
            )
          } finally {
            if (isMounted) {
              setLoading(false)
            }
          }
        })
      } catch (authError) {
        console.error(authError)
        if (!isMounted) {
          return
        }
        setSession(null)
        setError(authError instanceof Error ? authError.message : "Unable to initialize authentication.")
        setLoading(false)
      }
    }

    void initialize()

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [])

  return { session, loading, error }
}
