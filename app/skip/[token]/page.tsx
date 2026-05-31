import ResolveConfirmation from "@/components/ResolveConfirmation";
import { resolveByDoneToken } from "@/lib/complete";

export const dynamic = "force-dynamic";

export default async function SkipPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await resolveByDoneToken(params.token, "skipped");
  return <ResolveConfirmation result={result} />;
}
