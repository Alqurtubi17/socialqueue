export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.socialAccount.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  let result: { success: boolean; error?: string } = { success: false, error: "Platform tidak didukung" };

  if (account.platform === "X") {
    const { testLoginX } = await import("@/lib/platforms/x-automation");
    result = await testLoginX(account.id);
  }

  if (result.success) {
    return NextResponse.json({ success: true, message: "Login berhasil dan session aktif." });
  } else {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }
}
