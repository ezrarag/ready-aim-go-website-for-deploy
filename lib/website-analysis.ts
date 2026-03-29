import * as cheerio from "cheerio"

export type WebsiteExtract = {
  title: string
  metaDescription: string
  h1: string
  text: string
}

export async function fetchAndExtractWebsite(url: string): Promise<WebsiteExtract> {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" })
  if (!response.ok) {
    throw new Error("Failed to fetch URL")
  }

  const html = await response.text()
  const $ = cheerio.load(html)

  const title = $("title").text() || ""
  const metaDescription = $('meta[name="description"]').attr("content") || ""
  const h1 = $("h1").first().text() || ""
  let text = $("body").text().replace(/\s+/g, " ").trim()
  text = text.split(" ").slice(0, 1000).join(" ")

  return { title, metaDescription, h1, text }
}
