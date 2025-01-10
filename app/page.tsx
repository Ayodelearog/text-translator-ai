"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import { throttle } from 'lodash'

interface Change {
  original: string
  translated: string
  bold?: boolean
  italic?: boolean
  link?: string
  underline?: boolean
}

interface TranslationItem {
  key: string
  original: string
  translated: string
  changes?: Change[]
}

interface TranslationData {
  metadata: {
    description: string
    path: string
    lang: {
      original: string
      translated: string
    }
  }
  phrases: TranslationItem[]
}

export default function TranslationSystem() {
  const [inputJson, setInputJson] = useState<string>("")
  const [outputJson, setOutputJson] = useState<string>("")
  const [targetLanguage, setTargetLanguage] = useState<string>("es")
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const translateText = useCallback(async (text: string, targetLanguage: string): Promise<string> => {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, targetLanguage }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Translation failed')
    }

    const data = await response.json()
    return data.translatedText
  }, [])

  const memoizedTranslateText = useCallback((text: string, targetLanguage: string) => {
    return translateText(text, targetLanguage);
  }, [translateText]); // Add translateText as a dependency

  const throttledTranslateText = useMemo(
    () =>
      throttle(
        (text: string, targetLanguage: string, callback: (result: string) => void) => {
          memoizedTranslateText(text, targetLanguage)
            .then(callback)
            .catch((error) => console.error("Translation error:", error));
        },
        1000
      ),
    [memoizedTranslateText]
  );

  const findCorrespondingTranslation = useCallback(async (
    fullTranslatedPhrase: string,
    originalFragment: string,
    targetLanguage: string
  ): Promise<string> => {
    const response = await fetch("/api/find-corresponding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fullTranslatedPhrase, originalFragment, targetLanguage }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Finding corresponding translation failed')
    }

    const data = await response.json()
    return data.correspondingTranslation
  }, [])

  

  const processTranslations = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const data = JSON.parse(inputJson) as TranslationData
      const translatedData: TranslationData = {
        ...data,
        metadata: {
          ...data.metadata,
          lang: {
            ...data.metadata.lang,
            translated: targetLanguage
          }
        },
        phrases: []
      }

      for (const item of data.phrases) {
        let retries = 3
        while (retries > 0) {
          try {
            const translatedText = await new Promise<string>((resolve) => {
              throttledTranslateText(item.original, targetLanguage, resolve)
            })

            

            const translatedItem: TranslationItem = {
              ...item,
              translated: translatedText,
            }

            if (item.changes) {
              const translatedChanges = await Promise.all(
                item.changes.map(async (change) => {
                  const translatedChange = await findCorrespondingTranslation(translatedText, change.original, targetLanguage)
                  return {
                    ...change,
                    translated: translatedChange,
                    
                  }
                })
              )
              translatedItem.changes = translatedChanges
            }

            translatedData.phrases.push(translatedItem)
            break  // Success, exit the retry loop
          } catch (itemError) {
            console.error(`Error processing item ${item.key}:`, itemError)
            retries--
            if (retries === 0) {
              translatedData.phrases.push(item) // Keep original on final error
            } else {
              await new Promise(resolve => setTimeout(resolve, 2000))  // Wait 2 seconds before retrying
            }
          }
        }
      }

      setOutputJson(JSON.stringify(translatedData, null, 2))
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      console.error("Error processing translations:", error)
      setError(`Error processing translations: ${errorMessage}`)
      setOutputJson("")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setError("No file selected")
      return
    }

    if (file.type !== "application/json") {
      setError("Please upload a JSON file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        JSON.parse(content) // Validate JSON
        setInputJson(content)
        setError(null)
      } catch (err) {
        setError("Invalid JSON file")
        setInputJson("")
        console.log(err)
      }
    }
    reader.onerror = () => {
      setError("Error reading file")
      setInputJson("")
    }
    reader.readAsText(file)
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Translation System</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Upload JSON File</h2>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4 text-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
            ref={fileInputRef}
          />
          <p>Click to upload a JSON file</p>
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Select Target Language</h2>
        <select
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Input JSON</h2>
        <textarea
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          className="w-full h-60 p-2 border rounded font-mono"
          placeholder="Your JSON will appear here after upload, or you can paste it manually"
        />
      </div>

      <button
        onClick={processTranslations}
        disabled={!inputJson || isProcessing}
        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed mb-6"
      >
        {isProcessing ? "Translating..." : "Translate"}
      </button>

      {outputJson && (
        <div>
          <h2 className="text-xl font-semibold mb-2">4. Output JSON</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto max-h-96 font-mono">
            {outputJson}
          </pre>
          <button
            onClick={() => {
              const blob = new Blob([outputJson], { type: "application/json" })
              const url = URL.createObjectURL(blob)
              const link = document.createElement("a")
              link.href = url
              link.download = `${targetLanguage}-translated.json`
              link.click()
              URL.revokeObjectURL(url)
            }}
            className="mt-4 bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
          >
            Download Translated JSON
          </button>
        </div>
      )}
    </div>
  )
}