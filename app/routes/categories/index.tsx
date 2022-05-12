import { MetaFunction } from "@remix-run/node";

export default function CategoriesIndex() {
  return (
    <section>
      <p className="text-md my-6 text-zinc-500">Choose a recipe category</p>
    </section>
  );
}

export const meta: MetaFunction = () => {
  return {
    title: `Recipes by Category`,
    description: `Browse recipes for each category`,
  };
};
