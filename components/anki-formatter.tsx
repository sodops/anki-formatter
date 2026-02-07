"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "./file-upload";
import TextInput from "./text-input";
import GoogleDocInput from "./google-doc-input";
import CardPreview from "./card-preview";
import { Loader2 } from "lucide-react";

interface ParsedCard {
  question: string;
  answer: string;
}

export default function AnkiFormatter() {
  const [cards, setCards] = useState<ParsedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [failures, setFailures] = useState<string[]>([]);
  const [filename, setFilename] = useState("deck");

  const handleParse = async (
    method: "file" | "text" | "google-doc",
    data: FormData | { raw_text: string } | { doc_url: string }
  ) => {
    setLoading(true);
    try {
      const formData = new FormData();

      if (method === "file" && data instanceof FormData) {
        Object.entries(Object.fromEntries(data)).forEach(([key, value]) => {
          formData.append(key, value as string | Blob);
        });
      } else if (method === "text" && "raw_text" in data) {
        formData.append("raw_text", data.raw_text);
      } else if (method === "google-doc" && "doc_url" in data) {
        formData.append("doc_url", data.doc_url);
      }

      const response = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to parse");
      }

      setCards(result.cards);
      setStats(result.stats);
      setFailures(result.failures || []);
      setFilename(result.filename);
    } catch (error) {
      console.error("Parse error:", error);
      alert(error instanceof Error ? error.message : "Failed to parse");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDeck = async () => {
    if (cards.length === 0) {
      alert("No cards to generate");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards,
          deck_name: filename,
          filename,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate deck");
      }

      // Trigger download
      const downloadUrl = result.download_url;
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${filename}.apkg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Generate error:", error);
      alert(error instanceof Error ? error.message : "Failed to generate deck");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Anki Formatter</h1>
          <p className="text-muted-foreground">
            Convert your documents into Anki flashcards effortlessly
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Import Content</CardTitle>
                <CardDescription>
                  Choose how you want to provide your content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="file" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="file">File</TabsTrigger>
                    <TabsTrigger value="text">Text</TabsTrigger>
                    <TabsTrigger value="google-doc">Google Doc</TabsTrigger>
                  </TabsList>

                  <TabsContent value="file" className="mt-6">
                    <FileUpload
                      onParse={handleParse}
                      disabled={loading}
                    />
                  </TabsContent>

                  <TabsContent value="text" className="mt-6">
                    <TextInput
                      onParse={handleParse}
                      disabled={loading}
                    />
                  </TabsContent>

                  <TabsContent value="google-doc" className="mt-6">
                    <GoogleDocInput
                      onParse={handleParse}
                      disabled={loading}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          {stats && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Successful</p>
                    <p className="text-2xl font-bold">{stats.successful || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold text-red-500">
                      {stats.failed || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Preview and Generate Section */}
        {cards.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Preview Cards ({cards.length})</CardTitle>
                <CardDescription>
                  Review your flashcards before generating the deck
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 mb-6">
                  {cards.slice(0, 5).map((card, index) => (
                    <CardPreview
                      key={index}
                      card={card}
                      index={index}
                    />
                  ))}
                  {cards.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      ... and {cards.length - 5} more cards
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleGenerateDeck}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Anki Deck"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Failures Section */}
        {failures.length > 0 && (
          <div className="mt-8">
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800">
                  Parsing Issues ({failures.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {failures.map((failure, index) => (
                    <p key={index} className="text-sm text-yellow-700">
                      {failure}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
