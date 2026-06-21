import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  created_at: string;
}

export async function listMyNotifications(tenantId: string, userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllAsRead(tenantId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function createNotification(input: {
  tenant_id: string;
  user_id: string;
  title: string;
  body?: string | null;
  url?: string | null;
}): Promise<Notification> {
  const { data, error } = await supabase
    .from("notifications").insert(input).select("*").single();
  if (error) throw error;
  return data as Notification;
}
