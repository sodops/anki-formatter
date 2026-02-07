"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface GoogleDocInputProps {
  onParse: (method: "google-doc", data: { doc_url: string }) => void;
  disabled?: boolean;
}

export default function GoogleDocInput({ onParse, disabled }: GoogleDocInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    if (!url.trim()) {
      alert("Please enter a Google Docs URL");
      return;
    }
    if (!url.includes("docs.google.com")) {
      alert("Please enter a valid Google Docs URL");
      return;
    }
    onParse("google-doc", { doc_url: url });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Google Docs Link
        </label>
        <Input
          placeholder="https://docs.google.com/document/d/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={disabled}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Make sure the document is shared publicly or with your account.
      </p>
      <Button
        onClick={handleSubmit}
        disabled={disabled || !url.trim()}
        className="w-full"
      >
        {disabled ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Fetching...
          </>
        ) : (
          "Import from Google Docs"
        )}
      </Button>
    </div>
  );
}
