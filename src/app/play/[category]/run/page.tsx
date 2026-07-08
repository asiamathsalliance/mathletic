import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PlayRunRedirectPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
  }
  const query = qs.toString();
  redirect(`/challenge/${category}/run${query ? `?${query}` : ""}`);
}
