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
import { highlight } from "@/libs/code-highlight";
import { useTranslations } from "next-intl";

type ButtonProps = React.ComponentProps<typeof Button>;

interface CopyButtonWithPreviewProps extends ButtonProps {
  contentOrFetcher: string | (() => Promise<string>);
  copyMessage?: string;
  language?: string;
}

export const CopyButtonWithPreview = ({
  children,
  contentOrFetcher,
  copyMessage = "Copied to clipboard!",
  language,
  ...props
}: CopyButtonWithPreviewProps) => {
  const { showToast } = useToast();
  const [previewContent, setPreviewContent] = useState<React.ReactNode | null>(
    null
  );
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tCommon = useTranslations("Common");

  const handleMouseEnter = async () => {
    if (previewContent) return;

    setLoading(true);
    try {
      let content = rawContent;
      if (!content) {
        if (typeof contentOrFetcher === "string") {
          content = contentOrFetcher;
        } else {
          content = await contentOrFetcher();
        }
        setRawContent(content);
      }

      if (language) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const highlighted = await highlight(content, language as any);
        setPreviewContent(highlighted);
      } else {
        setPreviewContent(content);
      }
    } catch (error) {
      console.error("Failed to fetch preview content", error);
      setPreviewContent(tCommon("previewLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    // Prevent default if necessary, though Button usually handles click
    e.preventDefault();
    e.stopPropagation();

    let contentToCopy = rawContent;
    if (!contentToCopy) {
      if (typeof contentOrFetcher === "string") {
        contentToCopy = contentOrFetcher;
      } else {
        try {
          contentToCopy = await contentOrFetcher();
          setRawContent(contentToCopy);
        } catch (e) {
          console.error(e);
          showToast(tCommon("fetchContentFailed"), "error");
          return;
        }
      }
    }

    if (contentToCopy) {
      await copy2Clipboard(contentToCopy);
      const message = copyMessage ?? tCommon("copiedToClipboard");
      showToast(message, "success");
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
          className="p-0 border-none bg-transparent shadow-none"
        >
          {loading ? (
            <div className="flex items-center gap-2 rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{tCommon("loadingPreview")}</span>
            </div>
          ) : typeof previewContent === "string" ? (
            <div className="max-w-[400px] whitespace-pre-wrap rounded-md border bg-popover px-3 py-1.5 font-mono text-xs text-popover-foreground shadow-md">
              {previewContent || tCommon("loading")}
            </div>
          ) : (
            <div className="text-xs [&>pre]:max-h-[400px] [&>pre]:max-w-[500px] [&>pre]:overflow-auto [&>pre]:rounded-md [&>pre]:border [&>pre]:p-3 [&>pre]:shadow-md [&>pre]:font-mono">
              {previewContent}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
