import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runSequence } from "@/lib/inngest/functions/run-sequence";
import { handleReply } from "@/lib/inngest/functions/handle-reply";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runSequence, handleReply],
});
