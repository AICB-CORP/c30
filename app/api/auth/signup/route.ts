import { createClient } from "@supabase/supabase-js";
import { isInviteUsable } from "@/lib/invites";

export const runtime = "nodejs";

const PSEUDO_RE = /^[a-zA-Z0-9_-]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return Response.json({ error: "Configuration serveur incomplète." }, { status: 500 });
  }

  let body: {
    pseudo?: string;
    email?: string;
    password?: string;
    inviteCode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const pseudo = (body.pseudo ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const inviteCode = (body.inviteCode ?? "").trim();

  if (!pseudo || !email || !password || !inviteCode) {
    return Response.json({ error: "Tous les champs sont requis." }, { status: 400 });
  }
  if (!PSEUDO_RE.test(pseudo)) {
    return Response.json(
      {
        error: "Pseudo invalide : 3 à 20 caractères (lettres, chiffres, _ ou -).",
      },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Adresse email invalide." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json(
      { error: "Mot de passe trop court : 8 caractères minimum." },
      { status: 400 },
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("id, code, role, uses_count, max_uses, first_used_at")
    .eq("code", inviteCode)
    .maybeSingle();

  if (inviteError) {
    return Response.json({ error: "Erreur lors de la vérification du code." }, { status: 500 });
  }
  if (!invite) {
    return Response.json({ error: "Code d'invitation invalide." }, { status: 400 });
  }
  if (!isInviteUsable(invite)) {
    return Response.json(
      { error: "Code d'invitation invalide ou nombre d'utilisations atteint." },
      { status: 400 },
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { pseudo },
  });

  if (createError || !created.user) {
    const isDuplicate =
      createError?.code === "user_already_exists" ||
      /already|existe/i.test(createError?.message ?? "");
    return Response.json(
      {
        error: isDuplicate
          ? "Cet email est déjà utilisé."
          : "Erreur lors de la création du compte.",
      },
      { status: isDuplicate ? 409 : 500 },
    );
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: created.user.id, pseudo, role: invite.role });

  if (profileError) {
    const isDuplicate = /duplicate|unique/i.test(profileError.message);
    return Response.json(
      {
        error: isDuplicate ? "Ce pseudo est déjà pris." : "Erreur lors de la création du profil.",
      },
      { status: isDuplicate ? 409 : 500 },
    );
  }

  // Reusable code: bump the usage counter and stamp first-use (telemetry only).
  await admin
    .from("invites")
    .update({
      uses_count: (invite?.uses_count ?? 0) + 1,
      first_used_at: invite?.first_used_at ?? new Date().toISOString(),
    })
    .eq("id", invite.id);

  return Response.json({ ok: true }, { status: 201 });
}
