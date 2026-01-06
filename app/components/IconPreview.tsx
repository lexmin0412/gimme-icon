"use client";
import React, { useState } from "react";
import type { Icon } from "@/types/icon";
import { useToast } from "./ToastProvider";
import { Icon as IconifyIcon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { embeddingService } from "@/services/embedding";
import { Copy, Plus, RefreshCw } from "lucide-react";

import IconDetail from "./IconDetail";

interface IconPreviewProps {
  icon: Icon | null;
  onClose: () => void;
  onTagAdded?: (icon: Icon) => void;
}

const IconPreview: React.FC<IconPreviewProps> = ({
  icon,
  onClose,
  onTagAdded,
}) => {
  // If icon is null, the Dialog should not be open.
  // We can control open state based on icon existence.
  const isOpen = !!icon;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  if (!icon) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <IconDetail 
          icon={icon} 
          onTagAdded={onTagAdded} 
          onClose={onClose}
          showCloseButton={false}
        />
      </DialogContent>
    </Dialog>
  );
};

export default IconPreview;
