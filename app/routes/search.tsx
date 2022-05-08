import { useNavigate, useNavigationType } from "@remix-run/react";
import algoliasearch from "algoliasearch/lite";
import { getAlgoliaResults } from "@algolia/autocomplete-js";
import { Autocomplete } from "~/components/autocomplete";
import Dialog from "@reach/dialog";
import styles from "@reach/dialog/styles.css";
import { Cross2Icon } from "@radix-ui/react-icons";
import { getAlgoliaIndexName } from "~/utils";

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

const searchClient = algoliasearch(
  "HW88ALT84E", // app id
  "1499c17180e21ba003f94140ee00633d" // search-only public key
);

export default function Search() {
  const navigate = useNavigate();
  const navType = useNavigationType();

  const onDismiss = () => {
    /**
     * When linked to /search from a link inside the app,
     * we PUSH, which tells us we have someplace in the
     * app to go back to, and thus, pass -1 to navigate
     *  */
    if (navType === "PUSH") {
      navigate(-1);
    } else {
      // otherwise, just send users to home route, or else going 'back' takes them outside the app, which is unhelpful for the 'onDismiss' event
      navigate("/");
    }
  };

  return (
    <Dialog
      isOpen={true}
      aria-label="Search"
      onDismiss={onDismiss}
      id="searchModal"
      className="rounded-lg"
    >
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
        detachedMediaQuery="none"
        placeholder={"Search"}
        getSources={({ query }: { query: any }) => {
          return [
            {
              sourceId: "recipes",
              getItems() {
                return getAlgoliaResults({
                  searchClient,
                  queries: [
                    {
                      indexName: getAlgoliaIndexName(),
                      query,
                      params: {
                        hitsPerPage: 5,
                      },
                    },
                  ],
                });
              },
              templates: {
                item({ item, components }: { item: any; components: any }) {
                  return (
                    <a className="aa-ItemLink" href={`/recipes/${item.id}`}>
                      <div className="aa-ItemContent">
                        <div className="aa-ItemContentBody">
                          <div className="aa-ItemContentTitle">
                            <components.Highlight
                              hit={item}
                              attribute="title"
                            />
                          </div>
                          <div className="aa-ItemContentDescription">
                            {/* TODO -- figure out how to show categories and ingredients */}
                            {/* <components.Snippet
                                hit={item}
                                attribute="title"
                              />
                              <components.Snippet
                                hit={item}
                                attribute="ingredients[]"
                              /> */}
                          </div>
                        </div>
                      </div>
                      <div className="aa-ItemActions">
                        <button
                          className="aa-ItemActionButton aa-DesktopOnly aa-ActiveOnly"
                          type="button"
                          title="Select"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            fill="currentColor"
                          >
                            <path d="M18.984 6.984h2.016v6h-15.188l3.609 3.609-1.406 1.406-6-6 6-6 1.406 1.406-3.609 3.609h13.172v-4.031z" />
                          </svg>
                        </button>
                      </div>
                    </a>
                  );
                },
              },
            },
          ];
        }}
      />
    </Dialog>
  );
}
