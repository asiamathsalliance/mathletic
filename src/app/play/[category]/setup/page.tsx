import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ category: string }>;
}

export default async function PlaySetupRedirectPage({ params }: PageProps) {
  const { category } = await params;
  redirect(`/challenge/${category}/setup`);
}
