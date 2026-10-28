import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { createInviteFn, listInvitesFn, revokeInviteFn } from "~/server/auth/functions";
import type { InviteStatus, InviteSummary, Role } from "~/server/auth/invites";

const DEFAULT_DAYS = 14;

// Admin-only (the server functions call requireAdmin). Invite links are shown
// once, right after creation: only a hash of the token is stored.
export const Route = createFileRoute("/admin/invites")({
  loader: () => listInvitesFn(),
  head: () => ({ meta: [{ title: "Invites | Homer Family Cookbook" }] }),
  component: InvitesPage,
});

type Errors = Readonly<Record<string, string>>;

function InvitesPage() {
  const invites = Route.useLoaderData();
  return (
    <section className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h3 className="mb-8 text-3xl font-bold">Invites</h3>
      <p className="mb-8 max-w-prose text-zinc-700">
        Signing up needs an invite. Create one, then send the link to the person yourself (by text or email). The link
        works once and is only shown here right after you create it.
      </p>
      <CreateInvite />
      <InviteList invites={invites} />
    </section>
  );
}

function CreateInvite() {
  const router = useRouter();
  const createInvite = useServerFn(createInviteFn);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setLink(null);
    setCopied(false);
    try {
      const result = await createInvite({
        data: {
          email: String(form.get("email") ?? ""),
          role: form.get("role") === "ADMIN" ? "ADMIN" : "MEMBER",
          expiresInDays: Number(form.get("expiresInDays")),
        },
      });
      if (!result.ok) {
        setErrors(result.fieldErrors);
        return;
      }
      setErrors({});
      setLink({ url: `${window.location.origin}/join/${result.value.token}`, expiresAt: result.value.expiresAt });
      formElement.reset();
      await router.invalidate();
    } catch {
      setErrors({ form: "Could not create the invite. Please try again." });
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
  }

  return (
    <div className="mb-12">
      <form method="post" className="flex flex-col gap-4 md:max-w-sm" noValidate onSubmit={onSubmit}>
        <div className="flex flex-col">
          <label htmlFor="email" className="text-md mb-2 font-bold uppercase">
            Email <span className="text-sm font-normal normal-case text-zinc-500">(optional: locks the invite)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            className="rounded-lg bg-zinc-50 p-2"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p className="text-red-600" role="alert" id="email-error">
              {errors.email}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <label htmlFor="role" className="text-md mb-2 font-bold uppercase">
            Role
          </label>
          <select id="role" name="role" defaultValue="MEMBER" className="rounded-lg bg-zinc-50 p-2">
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          {errors.role && (
            <p className="text-red-600" role="alert">
              {errors.role}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <label htmlFor="expiresInDays" className="text-md mb-2 font-bold uppercase">
            Expires after (days)
          </label>
          <input
            id="expiresInDays"
            name="expiresInDays"
            type="number"
            min={1}
            max={90}
            defaultValue={DEFAULT_DAYS}
            className="rounded-lg bg-zinc-50 p-2"
            aria-invalid={errors.expiresInDays ? true : undefined}
            aria-describedby={errors.expiresInDays ? "expires-error" : undefined}
          />
          {errors.expiresInDays && (
            <p className="text-red-600" role="alert" id="expires-error">
              {errors.expiresInDays}
            </p>
          )}
        </div>
        {errors.form && (
          <p className="text-red-600" role="alert">
            {errors.form}
          </p>
        )}
        <div className="flex justify-end">
          <button
            className="rounded-lg bg-teal-700 px-4 py-2 font-semibold capitalize tracking-widest text-zinc-50 hover:bg-teal-800 disabled:opacity-60"
            type="submit"
            disabled={pending}
          >
            {pending ? "Creating…" : "Create invite"}
          </button>
        </div>
      </form>

      {link && (
        <div className="mt-6 rounded-lg border border-teal-700 bg-teal-50 p-4" role="status">
          <p className="mb-2 font-bold">Invite link (copy it now; it won't be shown again)</p>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              readOnly
              value={link.url}
              onFocus={(event) => event.currentTarget.select()}
              className="flex-1 rounded-lg bg-white p-2 font-mono text-sm"
              aria-label="Invite link"
            />
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-zinc-50 hover:bg-teal-800"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-sm text-zinc-600">Expires {formatDate(link.expiresAt)}.</p>
        </div>
      )}
    </div>
  );
}

const statusStyles: Record<InviteStatus, string> = {
  pending: "bg-teal-100 text-teal-800",
  used: "bg-zinc-200 text-zinc-700",
  expired: "bg-red-100 text-red-800",
};

const roleLabel: Record<Role, string> = { ADMIN: "Admin", MEMBER: "Member" };

function InviteList({ invites }: { invites: ReadonlyArray<InviteSummary> }) {
  const router = useRouter();
  const revokeInvite = useServerFn(revokeInviteFn);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function revoke(id: string) {
    if (!window.confirm("Revoke this invite? The link will stop working.")) return;
    setBusyId(id);
    setError(null);
    try {
      const result = await revokeInvite({ data: { id } });
      if (!result.ok) setError(result.fieldErrors.form ?? "Could not revoke the invite.");
      await router.invalidate();
    } catch {
      setError("Could not revoke the invite.");
    } finally {
      setBusyId(null);
    }
  }

  if (invites.length === 0) return <p className="text-zinc-600">No invites yet.</p>;

  return (
    <div>
      <h4 className="mb-4 text-xl font-bold">All invites</h4>
      {error && (
        <p className="mb-4 text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-300 uppercase text-zinc-600">
            <tr>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Expires / used</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id} className="border-b border-zinc-200">
                <td className="py-2 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[invite.status]}`}>
                    {invite.status}
                  </span>
                </td>
                <td className="py-2 pr-4">{invite.email ?? <span className="text-zinc-500">Anyone with the link</span>}</td>
                <td className="py-2 pr-4">{roleLabel[invite.role]}</td>
                <td className="py-2 pr-4">
                  {formatDate(invite.createdAt)}
                  {invite.createdByName && <span className="text-zinc-500"> by {invite.createdByName}</span>}
                </td>
                <td className="py-2 pr-4">
                  {invite.status === "used"
                    ? `Used ${formatDate(invite.usedAt!)}${invite.usedByName ? ` by ${invite.usedByName}` : ""}`
                    : formatDate(invite.expiresAt)}
                </td>
                <td className="py-2 text-right">
                  {invite.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => revoke(invite.id)}
                      disabled={busyId === invite.id}
                      className="font-semibold text-red-700 hover:underline disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Fixed locale and time zone so the server render and hydration agree.
const formatDate = (iso: string) =>
  `${new Date(iso).toLocaleString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })} UTC`;
