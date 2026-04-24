"use client"

import Link from "next/link"
import { useEffect, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { ArrowLeft, Building2, Loader2, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ensureAuthPersistence } from "@/lib/firebase-client"

type ClientPortalHandoff = {
  id: string
  mode: "claim" | "new"
  companyName: string
  contactName: string
  workEmail: string
  phoneOnly: boolean
  phone: string
  organizationType: string
}

type SignupForm = {
  fullName: string
  email: string
  phone: string
  companyName: string
  organizationType: string
  password: string
  confirmPassword: string
}

const EMPTY_FORM: SignupForm = {
  fullName: "",
  email: "",
  phone: "",
  companyName: "",
  organizationType: "",
  password: "",
  confirmPassword: "",
}

function getSignupErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "That email already has an account. Use the sign-in page instead."
      case "auth/invalid-email":
        return "Enter a valid email address."
      case "auth/weak-password":
        return "Choose a stronger password with at least 6 characters."
      case "auth/network-request-failed":
        return "Network error while creating the account. Try again."
      default:
        break
    }
  }

  return error instanceof Error ? error.message : "Unable to create your client account."
}

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const handoffId = searchParams.get("handoff")
  const signInHref = handoffId
    ? `/login?portal=client&handoff=${encodeURIComponent(handoffId)}`
    : "/login?portal=client"

  const [form, setForm] = useState<SignupForm>(EMPTY_FORM)
  const [handoffLoading, setHandoffLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!handoffId) {
      return
    }

    let cancelled = false

    const loadHandoff = async () => {
      try {
        setHandoffLoading(true)
        const response = await fetch(`/api/client-handoff/${encodeURIComponent(handoffId)}`, {
          cache: "no-store",
        })
        const payload = await response.json()

        if (!response.ok || !payload?.handoff) {
          throw new Error(payload?.error || "Unable to load the saved client intake.")
        }

        if (cancelled) {
          return
        }

        const handoff = payload.handoff as ClientPortalHandoff
        setForm((current) => ({
          ...current,
          fullName: current.fullName || handoff.contactName,
          email: current.email || (handoff.phoneOnly ? "" : handoff.workEmail),
          phone: current.phone || handoff.phone,
          companyName: current.companyName || handoff.companyName,
          organizationType: current.organizationType || handoff.organizationType,
        }))
      } catch (handoffError) {
        console.error(handoffError)
        if (!cancelled) {
          setError(
            handoffError instanceof Error
              ? handoffError.message
              : "Unable to load the saved client intake."
          )
        }
      } finally {
        if (!cancelled) {
          setHandoffLoading(false)
        }
      }
    }

    void loadHandoff()

    return () => {
      cancelled = true
    }
  }, [handoffId])

  const handleFieldChange = <K extends keyof SignupForm>(field: K, value: SignupForm[K]) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!form.fullName.trim()) {
      setError("Enter your full name.")
      return
    }

    if (!form.email.trim()) {
      setError("Enter your email address.")
      return
    }

    if (!form.companyName.trim()) {
      setError("Enter your business name.")
      return
    }

    if (form.password.length < 6) {
      setError("Choose a password with at least 6 characters.")
      return
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    try {
      setSubmitting(true)
      const auth = await ensureAuthPersistence()
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password)

      if (form.fullName.trim()) {
        await updateProfile(credential.user, {
          displayName: form.fullName.trim(),
        })
      }

      const idToken = await credential.user.getIdToken()
      const finalizeResponse = await fetch("/api/client-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          handoffId,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          companyName: form.companyName,
          organizationType: form.organizationType,
        }),
      })

      const finalizePayload = await finalizeResponse.json()
      if (!finalizeResponse.ok || !finalizePayload?.success) {
        throw new Error(finalizePayload?.error || "Unable to complete client account setup.")
      }

      router.replace(
        typeof finalizePayload.redirectUrl === "string"
          ? finalizePayload.redirectUrl
          : "/dashboard/client"
      )
    } catch (signupError) {
      console.error(signupError)
      setError(getSignupErrorMessage(signupError))
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-center">
            <Link href="/" className="mb-6 inline-flex items-center text-indigo-600 hover:text-indigo-700">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>

            <div className="max-w-lg space-y-5">
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-700">
                Client Portal Signup
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                Create your ReadyAimGo client account.
              </h1>
              <p className="text-lg leading-8 text-slate-600">
                {handoffId
                  ? "Your intake details were carried forward. Review them, set a password, and continue into the client dashboard."
                  : "Start a client account for your business and continue into the ReadyAimGo client dashboard."}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-white/90 bg-white/80 shadow-sm">
                  <CardContent className="space-y-3 p-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-lg font-semibold text-slate-950">Business context</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Company and onboarding details stay attached to the account you create here.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/90 bg-white/80 shadow-sm">
                  <CardContent className="space-y-3 p-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                      <Shield className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-lg font-semibold text-slate-950">Direct dashboard access</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Once the account is created, you land in the client dashboard instead of being bounced back through intake.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <Card className="border-white/90 bg-white/92 shadow-2xl">
            <CardHeader>
              <CardTitle>Create account</CardTitle>
              <CardDescription>
                {handoffLoading
                  ? "Loading your saved intake details…"
                  : "Enter the account details you’ll use to sign in to the client portal."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full name</Label>
                    <Input
                      id="full-name"
                      value={form.fullName}
                      onChange={(event) => handleFieldChange("fullName", event.target.value)}
                      placeholder="Jane Smith"
                      autoComplete="name"
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(event) => handleFieldChange("email", event.target.value)}
                      placeholder="jane@company.com"
                      autoComplete="email"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(event) => handleFieldChange("phone", event.target.value)}
                      placeholder="(312) 555-0199"
                      autoComplete="tel"
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization-type">Organization type</Label>
                    <Input
                      id="organization-type"
                      value={form.organizationType}
                      onChange={(event) => handleFieldChange("organizationType", event.target.value)}
                      placeholder="Transportation, retail, real estate"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-name">Business name</Label>
                  <Input
                    id="company-name"
                    value={form.companyName}
                    onChange={(event) => handleFieldChange("companyName", event.target.value)}
                    placeholder="PaynePros"
                    autoComplete="organization"
                    disabled={submitting}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(event) => handleFieldChange("password", event.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) =>
                        handleFieldChange("confirmPassword", event.target.value)
                      }
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <Button type="submit" disabled={submitting || handoffLoading} className="w-full">
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating client account
                      </>
                    ) : (
                      "Create client account"
                    )}
                  </Button>

                  <Button asChild type="button" variant="outline" className="w-full">
                    <Link href={signInHref}>I already have a client account</Link>
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Operators should continue through the separate onboarding flow.
                  {" "}
                  <Link href="/onboarding" className="font-medium text-indigo-600 hover:text-indigo-700">
                    Continue as operator
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
