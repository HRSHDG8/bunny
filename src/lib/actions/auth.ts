"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signOut() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}