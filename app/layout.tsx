import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Tau Notes - Clean, Minimalist Note-Taking",
  description:
    "A clean, minimalist note-taking application inspired by Obsidian. Write, organize, and customize your notes with ease.",
  generator: "v0.app",
  keywords: ["notes", "note-taking", "markdown", "obsidian", "minimalist", "clean"],
  authors: [{ name: "Tau Notes" }],
  viewport: "width=device-width, initial-scale=1",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      {" "}
      {/* Default to dark mode for Obsidian-like experience */}
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
