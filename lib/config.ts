export const siteConfig = {
  title: "Skyblog des 30 ans",
  description: "Le blog du 30e anniversaire — un cadeau collectif.",
  birthday: new Date(process.env.NEXT_PUBLIC_BIRTHDAY_DATE || "2026-12-31T00:00:00+01:00"),
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
