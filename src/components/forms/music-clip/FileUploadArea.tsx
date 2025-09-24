"use client";

import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadAreaProps {
  onFileChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function FileUploadArea({
  onFileChange,
  accept = "*/*",
  multiple = false,
  className = "",
  children,
  disabled = false
}: FileUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFileChange(files);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <div onClick={handleClick}>
        {children || (
          <div className="flex flex-col items-center justify-center p-10 rounded-xl cursor-pointer border-2 border-dashed border-border hover:border-muted-foreground/50 transition-all duration-300 bg-muted/30 hover:bg-muted/50 group">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="font-semibold text-foreground text-lg mb-2">Click to upload</p>
            <p className="text-sm text-foreground/70">or drag & drop files here</p>
          </div>
        )}
      </div>
    </div>
  );
}
