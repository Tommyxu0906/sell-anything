import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);

export const contactStageEnum = pgEnum("contact_stage", [
  "new",
  "contacted",
  "replied",
  "interested",
  "meeting_booked",
  "qualified",
  "closed_won",
  "closed_lost",
  "unsubscribed",
  "dnc",
]);

export const messageDirectionEnum = pgEnum("message_direction", [
  "outbound",
  "inbound",
]);

export const messageChannelEnum = pgEnum("message_channel", [
  "email",
  "sms",
  "call",
]);

export const replyClassificationEnum = pgEnum("reply_classification", [
  "interested",
  "objection",
  "ooo",
  "unsubscribe",
  "book",
  "referral",
  "other",
]);

export const autonomyLevelEnum = pgEnum("autonomy_level", [
  "L0",
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
  "sent",
]);

// ─── Multi-tenant core ────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default(
    "trialing"
  ),
  planId: text("plan_id").default("starter"),
  // autonomy presets per module (stored as JSON for flexibility)
  autonomySettings: jsonb("autonomy_settings").default({
    prospect: "L3",
    draft: "L1",
    send: "L1",
    reply: "L1",
    schedule: "L2",
    sms: "L1",
    call: "L0",
  }),
  // compliance
  physicalAddress: text("physical_address"),
  unsubscribeFooter: text("unsubscribe_footer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(), // Supabase auth.users.id
    role: text("role").notNull().default("member"), // owner | admin | member
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("org_members_org_id_idx").on(t.orgId)]
);

export const orgInvitations = pgTable("org_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Playbook (ICP + brand voice + value props) ───────────────────────────────

export const playbooks = pgTable("playbooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
  icpDescription: text("icp_description"), // free-text ICP for LLM
  targetIndustries: text("target_industries").array(),
  targetJobTitles: text("target_job_titles").array(),
  companySize: jsonb("company_size"), // { min: 10, max: 500 }
  valueProp: text("value_prop"),
  brandVoice: text("brand_voice"),
  objectionHandlers: jsonb("objection_handlers"), // [{ trigger, response }]
  caseStudies: text("case_studies"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Companies + Contacts ─────────────────────────────────────────────────────

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain"),
    industry: text("industry"),
    employeeCount: integer("employee_count"),
    annualRevenue: text("annual_revenue"),
    location: text("location"),
    websiteUrl: text("website_url"),
    linkedinUrl: text("linkedin_url"),
    description: text("description"),
    techStack: text("tech_stack").array(),
    // enrichment metadata
    apolloId: text("apollo_id"),
    enrichedAt: timestamp("enriched_at"),
    enrichmentData: jsonb("enrichment_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("companies_org_id_idx").on(t.orgId)]
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    jobTitle: text("job_title"),
    linkedinUrl: text("linkedin_url"),
    location: text("location"),
    timezone: text("timezone"),
    stage: contactStageEnum("stage").default("new"),
    icpScore: integer("icp_score"), // 0-100
    // compliance
    unsubscribed: boolean("unsubscribed").default(false),
    unsubscribedAt: timestamp("unsubscribed_at"),
    dnc: boolean("dnc").default(false),
    // enrichment
    apolloId: text("apollo_id"),
    enrichedAt: timestamp("enriched_at"),
    // assignment
    assignedUserId: uuid("assigned_user_id"),
    notes: text("notes"),
    customFields: jsonb("custom_fields"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("contacts_org_id_idx").on(t.orgId),
    index("contacts_email_org_idx").on(t.email, t.orgId),
    index("contacts_stage_idx").on(t.stage),
  ]
);

// ─── Sequences ────────────────────────────────────────────────────────────────

export const sequences = pgTable(
  "sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    playbookId: uuid("playbook_id").references(() => playbooks.id),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("sequences_org_id_idx").on(t.orgId)]
);

export const sequenceSteps = pgTable("sequence_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  sequenceId: uuid("sequence_id")
    .notNull()
    .references(() => sequences.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(), // 1, 2, 3...
  delayDays: integer("delay_days").notNull().default(0), // days after previous step
  channel: messageChannelEnum("channel").default("email"),
  subjectTemplate: text("subject_template"),
  bodyTemplate: text("body_template"), // will be personalized by LLM
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactSequences = pgTable(
  "contact_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => sequences.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").default(1),
    status: text("status").default("active"), // active | paused | completed | replied | unsubscribed
    startedAt: timestamp("started_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    pausedAt: timestamp("paused_at"),
    nextStepAt: timestamp("next_step_at"),
    inngestRunId: text("inngest_run_id"), // for tracking/cancellation
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("contact_sequences_contact_idx").on(t.contactId),
    index("contact_sequences_org_idx").on(t.orgId),
    index("contact_sequences_next_step_idx").on(t.nextStepAt),
  ]
);

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    contactSequenceId: uuid("contact_sequence_id").references(
      () => contactSequences.id
    ),
    direction: messageDirectionEnum("direction").notNull(),
    channel: messageChannelEnum("channel").default("email"),
    subject: text("subject"),
    body: text("body").notNull(),
    fromEmail: text("from_email"),
    toEmail: text("to_email"),
    messageId: text("message_id").unique(), // email Message-ID header
    threadId: text("thread_id"), // for grouping replies
    reviewStatus: reviewStatusEnum("review_status").default("pending"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    sentAt: timestamp("sent_at"),
    // inbound reply fields
    replyClassification: replyClassificationEnum("reply_classification"),
    aiDraftReply: text("ai_draft_reply"),
    aiDraftSubject: text("ai_draft_subject"),
    metadata: jsonb("metadata"), // provider-specific data (Resend ID, Postmark ID, etc.)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("messages_contact_id_idx").on(t.contactId),
    index("messages_org_id_idx").on(t.orgId),
    index("messages_thread_idx").on(t.threadId),
    index("messages_review_status_idx").on(t.reviewStatus),
  ]
);

// ─── Activities (audit + CRM timeline) ───────────────────────────────────────

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // email_sent | email_opened | replied | stage_changed | note | meeting_booked
    description: text("description"),
    metadata: jsonb("metadata"),
    createdBy: uuid("created_by"), // null = AI, user_id = human
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("activities_contact_id_idx").on(t.contactId),
    index("activities_org_id_idx").on(t.orgId),
    index("activities_created_at_idx").on(t.createdAt),
  ]
);

// ─── Compliance ───────────────────────────────────────────────────────────────

export const suppressionList = pgTable(
  "suppression_list",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    reason: text("reason").notNull(), // unsubscribe | bounce | complaint | manual
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("suppression_email_org_idx").on(t.email, t.orgId)]
);

// ─── Integrations (encrypted OAuth tokens) ───────────────────────────────────

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(), // google_calendar | microsoft_calendar | apollo | twilio
  accessTokenEncrypted: text("access_token_encrypted"),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  expiresAt: timestamp("expires_at"),
  scopes: text("scopes").array(),
  metadata: jsonb("metadata"), // email, calendar_id, etc
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
