"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const noopSubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useIsMounted();

  const isDark = mounted ? (resolvedTheme ?? theme) === "dark" : true;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative text-muted-foreground hover:text-foreground"
    >
      <Sun
        className={
          "absolute size-4 transition-all " +
          (isDark
            ? "scale-0 -rotate-90 opacity-0"
            : "scale-100 rotate-0 opacity-100")
        }
      />
      <Moon
        className={
          "absolute size-4 transition-all " +
          (isDark
            ? "scale-100 rotate-0 opacity-100"
            : "scale-0 rotate-90 opacity-0")
        }
      />
    </Button>
  );
}
