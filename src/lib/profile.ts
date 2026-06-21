import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  updated_at?: string;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone, avatar_url, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as UserProfile | null) ?? null;
}

export async function upsertProfile(input: UserProfile): Promise<void> {
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: input.user_id,
      full_name: input.full_name,
      phone: input.phone,
      avatar_url: input.avatar_url,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function updateEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}
