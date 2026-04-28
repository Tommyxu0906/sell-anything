import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runSequence } from "@/lib/inngest/functions/run-sequence";
import { handleReply } from "@/lib/inngest/functions/handle-reply";
import { prospectDaily } from "@/lib/inngest/functions/prospect-daily";
import { analyzePerformance } from "@/lib/inngest/functions/analyze-performance";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runSequence, handleReply, prospectDaily, analyzePerformance],
});
