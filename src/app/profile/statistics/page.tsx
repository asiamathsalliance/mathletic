import { redirect } from "next/navigation";

export default function ProfileStatisticsPage() {
  redirect("/dashboard?from=profile");
}
