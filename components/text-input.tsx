"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface TextInputProps {
  onParse: (
    method: "text",
    data: { raw_text: string }
  ) => void;
  disabled?: boolean;
}

export default function TextInput({ onParse, disabled }: TextInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) {
      alert("Please enter some text");
      return;
    }
    onParse("text", { raw_text: text });
  };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Paste your content here. Use Q: for questions and A: for answers."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        className="min-h-64"
      />
      <p className="text-xs text-muted-foreground">
        Format your cards with Q: and A: prefixes, or one per line in pairs.
      </p>
      <Button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="w-full"
      >
        {disabled ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Parsing...
          </>
        ) : (
          "Parse Text"
        )}
      </Button>
    </div>
  );
}
