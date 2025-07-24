"use client"

import { useState } from "react"

export default function IntakePage() {
  const [url, setUrl] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Placeholder for future Supabase save
  const saveAnalysisToProfile = async (analysis: any) => {
    // TODO: Implement saving to Supabase and linking to client profile
    // Example: await supabase.from('website_analyses').insert({ ...analysis, client_id })
    // For now, just log
    console.log("Scaffold: Save analysis to profile", analysis)
  }

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/intake/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unknown error")
      setResult(data)
      // Optionally, scaffold save
      // await saveAnalysisToProfile(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-4">Website Intake Analyzer</h1>
      <div className="flex gap-2 mb-6">
        <input
          type="url"
          className="border rounded px-3 py-2 flex-1"
          placeholder="Enter website URL (https://...)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
        <button
          type="button"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleAnalyze}
          disabled={loading || !url}
        >
          {loading ? "Analyzing..." : "Analyze Website"}
        </button>
      </div>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {result && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="font-semibold mb-2 text-lg">Extracted Website Info</h2>
          <div className="mb-2">
            <span className="font-medium">Title:</span> {result.scraped.title || <span className="text-gray-400">(none)</span>}
          </div>
          <div className="mb-2">
            <span className="font-medium">Meta Description:</span> {result.scraped.metaDescription || <span className="text-gray-400">(none)</span>}
          </div>
          <div className="mb-2">
            <span className="font-medium">H1:</span> {result.scraped.h1 || <span className="text-gray-400">(none)</span>}
          </div>
          <details className="mb-4">
            <summary className="cursor-pointer text-blue-600">Show Raw Text (first 500 chars)</summary>
            <pre className="whitespace-pre-wrap text-xs max-h-32 overflow-auto bg-gray-50 p-2 rounded mt-2">{result.scraped.text?.slice(0, 500) || ""}</pre>
          </details>
          <div className="border-t my-4" />
          <h2 className="font-semibold mb-2 text-lg">AI Analysis</h2>
          <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-2 rounded">
{JSON.stringify(result.ai, null, 2)}
          </pre>
          {/* Optionally, add a button to save to profile in the future */}
          {/* <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded" onClick={() => saveAnalysisToProfile(result)}>Save to Profile</button> */}
        </div>
      )}
    </div>
  )
} 