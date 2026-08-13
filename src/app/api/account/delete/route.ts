import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * DELETE /api/account/delete
 * Body: { confirm: "DELETE" }
 * Deletes the signed-in Auth user; cascaded FK rows remove practice/sprint data.
 */
export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Auth not configured" }, { status: 503 });
  }

  let body: { confirm?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.confirm !== "DELETE") {
    return Response.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return Response.json(
      { error: "Account deletion is temporarily unavailable." },
      { status: 503 }
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return Response.json({ error: "Could not delete account." }, { status: 500 });
  }

  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
