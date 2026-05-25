"use client"

import type React from "react"

import { useState } from "react"
import { Upload, Download, FileText, Loader2, AlertCircle } from "lucide-react"
import { removeCamScannerWatermark, type RemoveResult } from "@/lib/remove-watermark"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processed, setProcessed] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [result, setResult] = useState<RemoveResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const acceptFile = (f: File | undefined | null) => {
    if (!f) return
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.")
      return
    }
    setError(null)
    setFile(f)
    setProcessed(false)
    setResult(null)
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0])
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    acceptFile(e.dataTransfer.files[0])
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const processFile = async () => {
    if (!file) return
    setProcessing(true)
    setError(null)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const res = await removeCamScannerWatermark(arrayBuffer)
      const ab = (res.bytes.buffer as ArrayBuffer).slice(
        res.bytes.byteOffset,
        res.bytes.byteOffset + res.bytes.byteLength,
      )
      const blob = new Blob([ab], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setResult(res)
      setProcessed(true)
    } catch (err) {
      console.error("Error processing PDF:", err)
      setError(err instanceof Error ? err.message : "Failed to process PDF.")
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!downloadUrl) return
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = file?.name.replace(/\.pdf$/i, "_cleaned.pdf") || "cleaned.pdf"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-6 py-16">

        {/* Header */}
        <div className="animate-reveal mb-8 text-center" style={{ animationDelay: "0ms" }}>
          <h1 className="font-display text-2xl font-bold italic text-foreground">
            CamScanner Watermark Remover
          </h1>
          <p className="mt-1.5 font-sans text-sm font-light text-muted-foreground">
            Strips watermarks from PDFs locally, nothing uploaded.
          </p>
        </div>

        {/* Panel */}
        <div className="animate-reveal border border-border bg-card p-6" style={{ animationDelay: "100ms" }}>
          <div className="space-y-5">

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="group relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center border border-dashed border-border bg-background/40 px-6 py-8 transition-colors hover:border-primary/50"
            >
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {file ? (
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
                  <div>
                    <p className="font-sans text-sm text-foreground">{file.name}</p>
                    <p className="font-sans text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <Upload className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" strokeWidth={1.5} />
                  <p className="font-sans text-sm font-light text-muted-foreground">Drop PDF or click to browse</p>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={1.5} />
                <p className="font-sans text-sm font-light text-destructive">{error}</p>
              </div>
            )}

            {/* Action */}
            {file && !processed && (
              <button
                onClick={processFile}
                disabled={processing}
                className="w-full bg-primary py-3 font-sans text-xs font-light uppercase tracking-[0.25em] text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    Processing
                  </span>
                ) : (
                  "Remove Watermark"
                )}
              </button>
            )}

            {/* Result */}
            {processed && downloadUrl && result && (
              <div className="space-y-3 border border-border px-4 py-4">
                <p className="font-sans text-xs font-light text-muted-foreground">
                  {result.pageCount}p &middot; {result.removedXObjects} image{result.removedXObjects === 1 ? "" : "s"} removed &middot; {result.removedAnnots} annotation{result.removedAnnots === 1 ? "" : "s"} removed
                </p>
                <button
                  onClick={handleDownload}
                  className="flex w-full items-center justify-center gap-2 bg-primary py-3 font-sans text-xs font-light uppercase tracking-[0.25em] text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Download
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <p className="animate-reveal mt-5 font-sans text-xs font-light text-muted-foreground/70 text-center" style={{ animationDelay: "200ms" }}>
          Powered by{" "}
          <a className="underline underline-offset-2 hover:text-muted-foreground/70 transition-colors" href="https://github.com/Hopding/pdf-lib" target="_blank" rel="noreferrer">
            pdf-lib
          </a>
          , built with{" "}
          <a className="underline underline-offset-2 hover:text-muted-foreground/70 transition-colors" href="https://motherfuckingwebsite.com/" target="_blank" rel="noreferrer">
            zero-nonsense
          </a>
        </p>

      </div>
    </main>
  )
}
