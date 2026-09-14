"use client"

import { use, useEffect, useState } from "react"
import { Loader2, Printer, Download } from "lucide-react"

export default function PrintInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = use(params)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/admin/invoices/${encodeURIComponent(invoiceId)}`, { cache: "no-store" })
        const payload = await res.json().catch(() => ({}))
        if (payload?.success && payload?.data?.renderedHtml) {
          setHtmlContent(payload.data.renderedHtml)
        } else {
          throw new Error(payload?.error || "Invoice HTML not found.")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice")
      } finally {
        setLoading(false)
      }
    }
    void fetchInvoice()
  }, [invoiceId])

  useEffect(() => {
    if (htmlContent) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [htmlContent])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
          Loading printable invoice PDF…
        </div>
      </div>
    )
  }

  if (error || !htmlContent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center max-w-md">
          <h2 className="text-lg font-bold text-red-700">Unable to load invoice</h2>
          <p className="text-sm text-red-600 mt-1">{error || "Invoice not found."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Action Controls for non-print view */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-900/90 text-white p-2 px-3 rounded-full shadow-lg backdrop-blur">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-xs font-semibold hover:text-orange-400 transition-colors px-2 py-1"
        >
          <Printer className="h-4 w-4" /> Save as PDF / Print
        </button>
      </div>

      <iframe
        srcDoc={htmlContent}
        className="w-full h-screen border-0"
        title={`Invoice ${invoiceId}`}
      />
    </div>
  )
}
