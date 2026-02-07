"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

interface FileUploadProps {
  onParse: (method: "file", data: FormData) => void;
  disabled?: boolean;
}

export default function FileUpload({ onParse, disabled }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type || !["text/plain", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      alert("Please upload a .txt, .csv, or .docx file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    onParse("file", formData);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        dragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <label htmlFor="file-input" className="cursor-pointer block">
        <Upload className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
        <p className="font-semibold">Drop your file here or click to browse</p>
        <p className="text-sm text-muted-foreground">
          Supported: .txt, .csv, .docx (Max 16MB)
        </p>
      </label>
      <input
        id="file-input"
        type="file"
        className="hidden"
        accept=".txt,.csv,.docx"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />
    </div>
  );
}
