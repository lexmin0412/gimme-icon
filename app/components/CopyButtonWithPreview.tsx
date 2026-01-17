"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { copy2Clipboard } from "@/libs/utils";
import { useToast } from "@/app/components/ToastProvider";
import { Loader2 } from "lucide-react";

type ButtonProps = React.ComponentProps<typeof Button>;

interface CopyButtonWithPreviewProps extends ButtonProps {
  contentOrFetcher: string | (() => Promise<string>);
  copyMessage?: string;
}

export const CopyButtonWithPreview = ({
  children,
  contentOrFetcher,
  copyMessage = "Copied to clipboard!",
  ...props
}: CopyButtonWithPreviewProps) => {
  const { showToast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMouseEnter = async () => {
    if (preview) return;

    if (typeof contentOrFetcher === "string") {
      setPreview(contentOrFetcher);
    } else {
      setLoading(true);
      try {
        const content = await contentOrFetcher();
        setPreview(content);
      } catch (error) {
        console.error("Failed to fetch preview content", error);
        setPreview("Failed to load preview");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    // Prevent default if necessary, though Button usually handles click
    e.preventDefault();
    e.stopPropagation();

    let contentToCopy = preview;
    if (!contentToCopy) {
      if (typeof contentOrFetcher === "string") {
        contentToCopy = contentOrFetcher;
      } else {
        try {
          contentToCopy = await contentOrFetcher();
          setPreview(contentToCopy);
        } catch (e) {
          console.error(e);
          showToast("Failed to fetch content", "error");
          return;
        }
      }
    }

    if (contentToCopy) {
      await copy2Clipboard(contentToCopy);
      showToast(copyMessage, "success");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            {...props}
            onMouseEnter={handleMouseEnter}
            onClick={handleCopy}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-[400px] max-h-[300px] overflow-auto whitespace-pre-wrap font-mono text-xs bg-popover text-popover-foreground border p-3"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading preview...</span>
            </div>
          ) : (
            preview || "Loading..."
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
