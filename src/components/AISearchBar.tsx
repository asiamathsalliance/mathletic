"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function AISearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [query, router]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="search"
          placeholder="Search with AI..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 h-12 text-base"
          aria-label="Search exam questions"
        />
        <Button
          type="submit"
          size="lg"
          className="h-12 px-6"
          disabled={!query.trim()}
        >
          <Sparkles className="size-4 mr-2" />
          Search
        </Button>
      </form>
    </div>
  );
}
