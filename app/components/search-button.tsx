import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { NavLink } from "@remix-run/react";

export default function SearchButton() {
  return (
    <NavLink
      to="/search"
      className="absolute top-2 right-2 flex flex-nowrap items-center gap-2 rounded-full bg-zinc-100 px-2 py-2 text-zinc-500 opacity-75  md:hidden"
    >
      <div>
        <MagnifyingGlassIcon height={24} width={24} />
      </div>
      <span>Search</span>
    </NavLink>
  );
}
