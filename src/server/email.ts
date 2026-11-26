import { env } from "cloudflare:workers";
import { Data, Effect } from "effect";

// Outgoing email through Cloudflare Email Service (the `EMAIL` send_email
// binding in wrangler.jsonc). The sending domain must be onboarded in the
// dashboard (Compute & AI > Email Service) with its SPF and DKIM records.
// Without the binding (local dev) the message is logged instead of sent.

export interface OutgoingEmail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

export class EmailNotSent extends Data.TaggedError("EmailNotSent")<{ readonly cause: unknown }> {}

export type SendEmail = (message: OutgoingEmail) => Effect.Effect<void, EmailNotSent>;

const FROM = "Homer Family Cookbook <cookbook@homerfamilycookbook.com>";

interface EmailBinding {
  send(message: { from: string; to: string; subject: string; text: string; html: string }): Promise<unknown>;
}

export const sendEmail: SendEmail = (message) =>
  Effect.tryPromise({
    try: async () => {
      const binding = (env as unknown as { EMAIL?: EmailBinding }).EMAIL;
      if (!binding) {
        console.log(`[email not sent: no EMAIL binding] to=${message.to} subject=${message.subject}\n${message.text}`);
        return;
      }
      await binding.send({ from: FROM, ...message });
    },
    catch: (cause) => new EmailNotSent({ cause }),
  });
