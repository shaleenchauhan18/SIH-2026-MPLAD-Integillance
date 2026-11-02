import { riskBg } from "@/lib/format";
import clsx from "clsx";

export function RiskBadge({ category, score }: { category: string; score?: number }) {
  return (
    <span className={clsx("chip", riskBg(category))}>
      {category}{typeof score === "number" ? ` · ${score}` : ""}
    </span>
  );
}
