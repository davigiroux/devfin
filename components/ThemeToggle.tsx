"use client"

import { useTheme } from "@/lib/theme-provider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="relative inline-block text-left">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
        className="block w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="light">☀️ Claro</option>
        <option value="dark">🌙 Escuro</option>
        <option value="system">💻 Sistema</option>
      </select>
    </div>
  )
}
