import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/** Returns the signed-in user's id, or a 401 response to return directly. */
export async function requireUser(): Promise<
  { userId: string; response?: undefined } | { userId?: undefined; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId };
}

export function badRequest(issues: unknown) {
  return NextResponse.json({ error: "Invalid input", issues }, { status: 400 });
}
