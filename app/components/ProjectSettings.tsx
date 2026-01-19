"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

const STORAGE_KEY = "gimme-icon-local-project-path";

export const useLocalProjectPath = () => {
  const [path, setPath] = useState("");

  useEffect(() => {
    // Check localStorage only on mount
    const savedPath = localStorage.getItem(STORAGE_KEY);
    if (savedPath) {
      setPath(savedPath);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const savePath = (newPath: string) => {
    localStorage.setItem(STORAGE_KEY, newPath);
    setPath(newPath);
  };

  return { path, savePath };
};

export const ProjectSettingsDialog: React.FC = () => {
  const { path, savePath } = useLocalProjectPath();
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setInputValue(path);
    }
  }, [path, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    savePath(inputValue);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Project Settings">
          <Settings className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Set your local project path to enable VS Code integration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project-path" className="text-right">
              Path
            </Label>
            <Input
              id="project-path"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="/Users/username/projects/my-app"
              className="col-span-3"
            />
          </div>
          <p className="text-xs text-muted-foreground ml-auto pl-10">
            Example: /Users/username/code/my-project/src/components
          </p>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
