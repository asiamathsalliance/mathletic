import { PageLoading } from "@/components/PageLoading";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageLoading label="Loading question…" />
    </div>
  );
}
