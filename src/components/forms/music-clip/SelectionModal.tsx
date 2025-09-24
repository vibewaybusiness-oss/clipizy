"use client";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

export interface SelectionOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  preview?: string;
}

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  options: SelectionOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  maxWidth?: string;
  gridCols?: string;
  showSidebar?: boolean;
  form?: UseFormReturn<any>;
  sidebarContent?: React.ReactNode;
}

export function SelectionModal({
  isOpen,
  onClose,
  title,
  description,
  options,
  selectedValue,
  onSelect,
  maxWidth = "max-w-4xl",
  gridCols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  showSidebar = false,
  form,
  sidebarContent
}: SelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className={`bg-background rounded-2xl ${maxWidth} w-full h-[90vh] flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 p-8 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">{title}</h2>
                <p className="text-muted-foreground mt-2">{description}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <div className={`flex-1 flex ${showSidebar ? 'gap-8' : ''} px-8 pb-8`}>
            {/* Main content area */}
            <div className={`${showSidebar ? 'flex-1 overflow-y-auto' : 'w-full overflow-y-auto'}`}>
              <div className={`grid ${gridCols} gap-6`}>
                {options.map((option) => (
                  <div
                    key={option.id}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                      selectedValue === option.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      onSelect(option.id);
                      if (!showSidebar) {
                        onClose();
                      }
                    }}
                  >
                    <div className="space-y-4">
                      <div className="relative">
                        <div className={`w-full h-32 bg-gradient-to-br ${option.gradient} rounded-xl flex items-center justify-center`}>
                          <span className="text-4xl">{option.icon}</span>
                        </div>
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors rounded-xl"></div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-bold text-xl">{option.name}</h3>
                        <p className="text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            {showSidebar && (
              <div className="w-80 flex-shrink-0">
                <div className="h-full flex flex-col border rounded-2xl bg-muted/30">
                  <div className="flex-1 p-6">
                    <h3 className="text-lg font-semibold mb-4">Settings</h3>
                    {sidebarContent}
                  </div>
                  <div className="flex-shrink-0 p-6 pt-0">
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          onSelect(selectedValue);
                          onClose();
                        }}
                        className="flex-1 btn-ai-gradient text-white"
                        disabled={!selectedValue}
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
