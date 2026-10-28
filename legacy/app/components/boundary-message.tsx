import { PropsWithChildren } from "react";

type Props = {};

export default function BoundaryMessage({
  children,
}: PropsWithChildren<Props>) {
  return (
    <div className="rounded bg-red-300 py-2 px-4 text-zinc-900">{children}</div>
  );
}
