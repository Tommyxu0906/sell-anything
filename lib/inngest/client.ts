import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "sell-anything",
  name: "sellAnything",
});

// Event type definitions
export type Events = {
  "outreach/send": {
    data: {
      contactSequenceId: string;
      orgId: string;
      stepNumber: number;
    };
  };
  "reply/received": {
    data: {
      orgId: string;
      contactId: string;
      messageId: string;
      rawEmail: string;
    };
  };
  "prospect/daily-pull": {
    data: {
      orgId: string;
    };
  };
  "research/offering": {
    data: {
      orgId: string;
      offeringId: string;
    };
  };
  "meeting/book": {
    data: {
      orgId: string;
      contactId: string;
      messageId: string;
    };
  };
};
