import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";

const ALLOWED_CONSOLE_EMAILS =
  (process.env.CONSOLE_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    const email = session?.user?.email?.toLowerCase();

    if (!email) {
      return NextResponse.json({ allowed: false }, { status: 401 });
    }

    if (ALLOWED_CONSOLE_EMAILS.length === 0) {
      return NextResponse.json({ allowed: false }, { status: 403 });
    }

    if (!ALLOWED_CONSOLE_EMAILS.includes(email)) {
      return NextResponse.json({ allowed: false }, { status: 403 });
    }

    return NextResponse.json({ allowed: true }, { status: 200 });
  } catch (error) {
    console.error("console auth check failed:", error);
    return NextResponse.json({ allowed: false }, { status: 500 });
  }
}

