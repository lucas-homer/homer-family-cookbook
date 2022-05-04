import {
  Fragment,
  createElement,
  useEffect,
  useRef,
  ReactElement,
} from "react";
import { render } from "react-dom";
import { autocomplete } from "@algolia/autocomplete-js";

export function Autocomplete(props: Record<string, unknown>) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const search = autocomplete({
      container: containerRef.current,
      renderer: { createElement, Fragment },
      render({ children }, root) {
        render(children as ReactElement, root);
      },
      ...props,
    });

    return () => search.destroy();
  }, [props]);

  return <div ref={containerRef} className="search-box-wrapper" />;
}
