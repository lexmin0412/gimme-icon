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
import { useTranslations } from "next-intl";

const STORAGE_KEY = "gimme-icon-local-project-path";

export const useLocalProjectPath = () => {
  const [path, setPath] = useState("");

  useEffect(() => {
    // Check localStorage only on mount
    const savedPath = localStorage.getItem(STORAGE_KEY);
    if (savedPath) {
      // Use requestAnimationFrame to avoid synchronous setState warning
      requestAnimationFrame(() => {
        setPath(savedPath);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const savePath = (newPath: string) => {
    localStorage.setItem(STORAGE_KEY, newPath);
    setPath(newPath);
  };

  return { path, savePath };
};

export const ProjectSettingsDialog: React.FC = () => {
  const t = useTranslations('Settings');
  const tHeader = useTranslations('Header');
  const { path, savePath } = useLocalProjectPath();
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      // Use requestAnimationFrame to avoid synchronous setState warning
      requestAnimationFrame(() => {
        setInputValue(path);
      });
    }
  }, [open, path]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    savePath(inputValue);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title={tHeader('projectSettings')}>
          <Settings className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project-path" className="text-right">
              {t('pathLabel')}
            </Label>
            <Input
              id="project-path"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('placeholder')}
              className="col-span-3"
            />
          </div>
          <p className="text-xs text-muted-foreground ml-auto pl-10">
            {t('example')}
          </p>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
