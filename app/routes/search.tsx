import { Link, useNavigate } from "@remix-run/react";
import algoliasearch from "algoliasearch/lite";
import { getAlgoliaResults } from "@algolia/autocomplete-js";
import { Autocomplete } from "~/components/autocomplete";
import Dialog from "@reach/dialog";
import styles from "@reach/dialog/styles.css";
import { Cross2Icon } from "@radix-ui/react-icons";

export const links = () => {
  return [
    {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/@algolia/autocomplete-theme-classic",
    },
    {
      rel: "stylesheet",
      href: styles,
    },
  ];
};

const searchClient = algoliasearch("", "");

export default function Search() {
  const navigate = useNavigate();
  const onDismiss = () => {
    navigate(-1);
  };

  return (
    <Dialog
      isOpen={true}
      aria-label="Search"
      onDismiss={onDismiss}
      id="searchModal"
      className="rounded-lg"
    >
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-xl">Search the Site</h2>
          <button onClick={onDismiss} className="flex flex-nowrap items-center">
            <span className="mr-1 pb-0.5">esc</span>
            <Cross2Icon width={24} height={24} />
          </button>
        </div>
        <p className="mb-4">
          You can search for recipes, categories, or ingredients.
        </p>

        <Autocomplete
          placeholder={"Search"}
          getSources={() => {
            return [];
          }}
        />
      </div>
    </Dialog>
  );
}
