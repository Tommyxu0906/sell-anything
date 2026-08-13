/**
 * Channel-fit model eval. Runs the deterministic model over the golden set and
 * reports top-1 / top-2 accuracy. Run it:
 *
 *   pnpm tsx lib/strategy/eval/run.ts
 *
 * Exits non-zero if accuracy drops below the target, so it doubles as a
 * regression guard when the model weights change.
 */
import { scoreChannels, CHANNEL_LABELS, type Channel } from "../channel-model";
import { GOLDEN_SET } from "./golden-set";

const TARGET_TOP1 = 0.8;
const TARGET_TOP2 = 0.9;

function run() {
  let top1 = 0;
  let top2 = 0;
  const rows: string[] = [];

  for (const c of GOLDEN_SET) {
    const { scores } = scoreChannels(c.attrs, c.signals);
    const top: Channel = scores[0].channel;
    const second: Channel = scores[1].channel;
    const hit1 = c.acceptableTop.includes(top);
    const hit2 = hit1 || c.acceptableTop.includes(second);
    if (hit1) top1++;
    if (hit2) top2++;

    const mark = hit1 ? "✓" : hit2 ? "≈" : "✗";
    rows.push(
      `${mark} ${c.name}\n    → ${CHANNEL_LABELS[top]} (${scores[0].fitScore}), ${CHANNEL_LABELS[second]} (${scores[1].fitScore})` +
        `  | expected: ${c.acceptableTop.map((x) => CHANNEL_LABELS[x]).join(" / ")}`
    );
  }

  const n = GOLDEN_SET.length;
  const t1 = top1 / n;
  const t2 = top2 / n;

  console.log("\nChannel-fit model eval\n" + "=".repeat(60));
  console.log(rows.join("\n"));
  console.log("=".repeat(60));
  console.log(`Top-1 accuracy: ${(t1 * 100).toFixed(0)}%  (${top1}/${n})  target ≥ ${TARGET_TOP1 * 100}%`);
  console.log(`Top-2 accuracy: ${(t2 * 100).toFixed(0)}%  (${top2}/${n})  target ≥ ${TARGET_TOP2 * 100}%`);

  if (t1 < TARGET_TOP1 || t2 < TARGET_TOP2) {
    console.error("\n❌ Below target — model regression.");
    process.exit(1);
  }
  console.log("\n✅ Model meets accuracy targets.");
}

run();
