import { Button } from "~/components/ui/button";

export default function Home() {
  return (
    <div className="relative flex min-h-screen max-w-2xl flex-col bg-white">
      {/* <div className="h-48">image</div> */}
      <h1 className="mb-4 text-3xl text-teal-700 ">Welcome!</h1>

      <p className="mb-4 text-lg text-zinc-700">
        In 2020 Kathy Homer (hi mom!) assembled in PDF a collection of family
        recipes from present day back several generations. With these recipes as
        the starting point, I built the Homer Family Cookbook app.
      </p>
      <p className="mb-4 text-lg text-zinc-700">
        Use the Search to try recipe names (spatzle), ingredient names (flour),
        or recipe categories (side).
      </p>
      <Button variant={"outline"}>Test this</Button>
      <p className="mb-4 text-lg text-zinc-700">
        Create an account to:
        <ul className="list-disc pl-6 pt-2">
          <li>
            <p>Save "favorite" Recipes</p>
          </li>
          <li>
            <p>Find recently viewed recipes </p>
          </li>
          <li>
            <p>Add notes to a recipe.</p>
          </li>
        </ul>
      </p>
    </div>
  );
}
