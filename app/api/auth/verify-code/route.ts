import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: Request) {
  const body = await req.json();
  console.log("VERIFY BODY:", body);

  const code = String(body.code || "").trim();

  if (!code) {
    return NextResponse.json({ ok: false, message: "Bitte Code eingeben." }, { status: 400 });
  }

  // 1) Code in Supabase suchen
  const { data, error } = await supabaseAdmin
    .from("access_codes")
    .select("id,status")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, message: "Code ist falsch." }, { status: 401 });
  }

  if (data.status !== "active") {
    return NextResponse.json({ ok: false, message: "Code ist gesperrt." }, { status: 401 });
  }

  // 2) Optional: Event loggen (hilft später beim Debuggen)
  await supabaseAdmin.from("events").insert({
    access_code_id: data.id,
    type: "code_verified",
    payload: { via: "start" },
  });

  // 3) Cookie setzen (damit /app freigeschaltet ist)
  
  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === "production";

res.cookies.set("hh_access", data.id, {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
});


  return res;
}
