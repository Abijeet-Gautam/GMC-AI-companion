import { getLeaf } from "@/server/db";
import { noStore } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params,
    leaf = getLeaf(id);
  return leaf
    ? Response.json({ leaf }, { headers: noStore })
    : Response.json(
        { error: "This leaf is no longer on the public tree." },
        { status: 404, headers: noStore },
      );
}
