"use client";

import { DragEvent, FormEvent, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatAttachmentUpload } from "@/lib/chat-api";
import {
  ALLOWED_ATTACHMENT_ACCEPT,
  ALLOWED_ATTACHMENT_LABEL,
  filterAllowedAttachments,
} from "@/lib/allowed-attachments";

interface ChatComposerProps {
  parsing: boolean;
  onSend: (text: string, attachments: ChatAttachmentUpload[]) => void;
  placeholder?: string;
  className?: string;
}

export function ChatComposer({
  parsing,
  onSend,
  placeholder = "일정 말하기 또는 「학습지 만들어줘」",
  className,
}: ChatComposerProps) {
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<ChatAttachmentUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const allowed = filterAllowedAttachments(files);
    if (allowed.length === 0) {
      alert(`${ALLOWED_ATTACHMENT_LABEL}만 첨부할 수 있어요.`);
      return;
    }
    setUploading(true);
    try {
      const { uploadChatAttachment } = await import("@/lib/chat-api");
      for (const file of allowed) {
        const att = await uploadChatAttachment(file);
        setPendingFiles((prev) => [...prev, att]);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "첨부 실패");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && pendingFiles.length === 0) || parsing || uploading) return;
    onSend(input, pendingFiles);
    setInput("");
    setPendingFiles([]);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (parsing || uploading) return;
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (parsing || uploading) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    await handleFiles(files);
  };

  return (
    <div
      className={cn(
        "rounded-2xl transition-colors",
        dragActive && "bg-orange-50/70 ring-2 ring-orange-300/70",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {pendingFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {pendingFiles.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-2 py-1 text-xs text-orange-900"
            >
              <FileText className="h-3 w-3" />
              {f.filename}
              <button
                type="button"
                onClick={() =>
                  setPendingFiles((prev) => prev.filter((x) => x.id !== f.id))
                }
                className="rounded p-0.5 hover:bg-orange-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_ATTACHMENT_ACCEPT}
          className="hidden"
          multiple
          onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={parsing || uploading}
          className="shrink-0 rounded-2xl border-orange-100"
          onClick={() => fileRef.current?.click()}
          aria-label="파일 첨부"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="rounded-2xl border-orange-100 bg-orange-50/30 focus-visible:ring-orange-300"
          disabled={parsing}
        />
        <Button
          type="submit"
          size="icon"
          disabled={parsing || uploading || (!input.trim() && !pendingFiles.length)}
          className="shrink-0 rounded-2xl bg-orange-500 hover:bg-orange-600"
        >
          {parsing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
