"use client";

import { Card } from "@/components/ui/card";
import { useState } from "react";

interface CardPreviewProps {
  card: {
    question: string;
    answer: string;
  };
  index: number;
}

export default function CardPreview({ card, index }: CardPreviewProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setFlipped(!flipped)}
    >
      <div className="text-xs text-muted-foreground mb-2">Card {index + 1}</div>
      <div className="min-h-20 flex items-center">
        <p className="text-sm">
          <span className="font-semibold">
            {flipped ? "Answer:" : "Question:"}
          </span>
          <span className="ml-2">{flipped ? card.answer : card.question}</span>
        </p>
      </div>
      <div className="text-xs text-muted-foreground text-right mt-2">
        Click to {flipped ? "see question" : "see answer"}
      </div>
    </Card>
  );
}
