import { useDelayedRender } from "~/useDelayedRender";
import { useState, useEffect } from "react";
import { Form, NavLink } from "@remix-run/react";

export default function MobileMenu({
  userLoggedIn,
}: {
  userLoggedIn: boolean;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { mounted: isMenuMounted, rendered: isMenuRendered } = useDelayedRender(
    isMenuOpen,
    {
      enterDelay: 20,
      exitDelay: 300,
    }
  );

  function toggleMenu() {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      document.body.style.overflow = "";
    } else {
      setIsMenuOpen(true);
      document.body.style.overflow = "hidden";
    }
  }

  useEffect(() => {
    return function cleanup() {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      <button
        className="burger visible md:hidden"
        aria-label="Toggle menu"
        type="button"
        onClick={toggleMenu}
      >
        <MenuIcon data-hide={isMenuOpen} />
        <CrossIcon data-hide={!isMenuOpen} />
      </button>
      {isMenuMounted && (
        <nav>
          <ul
            className={`menu
           relative flex flex-col
          ${isMenuRendered ? "menuRendered" : ""}
          `}
          >
            <li
              className="text-md border-b border-gray-300 font-semibold text-gray-900 "
              style={{ transitionDelay: "150ms" }}
            >
              <NavLink to="/" className="flex w-auto pb-4" onClick={toggleMenu}>
                🏠 Home
              </NavLink>
            </li>
            <li
              className="text-md border-b border-gray-300 font-semibold text-gray-900 "
              style={{ transitionDelay: "175ms" }}
            >
              <NavLink
                to="/search"
                className="flex w-auto pb-4"
                onClick={toggleMenu}
              >
                🔎 Search
              </NavLink>
            </li>
            <li
              className="text-md border-b border-gray-300 font-semibold text-gray-900 "
              style={{ transitionDelay: "200ms" }}
            >
              <NavLink
                to="/categories"
                className="flex w-auto pb-4"
                onClick={toggleMenu}
              >
                📚 Categories
              </NavLink>
            </li>
            {userLoggedIn ? (
              <>
                <li
                  className="text-md border-b border-gray-300 font-semibold text-gray-900 "
                  style={{ transitionDelay: "225ms" }}
                >
                  <NavLink to="/favorites" onClick={toggleMenu}>
                    ❤️ Favorites
                  </NavLink>
                </li>
                <li
                  className="text-md border-b border-gray-300 font-semibold text-gray-900 "
                  style={{ transitionDelay: "225ms" }}
                >
                  <NavLink to="/recently-viewed" onClick={toggleMenu}>
                    ⏲ Recently Viewed
                  </NavLink>
                </li>
                <li
                  className="text-md border-b border-gray-300 font-semibold text-gray-900 "
                  style={{ transitionDelay: "250ms" }}
                >
                  <NavLink to="/recipes/new" onClick={toggleMenu}>
                    📝 Add Recipe
                  </NavLink>
                </li>
                <li
                  className="text-md border-b border-gray-300 font-semibold text-gray-900 "
                  style={{ transitionDelay: "250ms" }}
                >
                  <Form action="/logout" method="post">
                    <button type="submit" onClick={toggleMenu}>
                      🔒 Logout
                    </button>
                  </Form>
                </li>
              </>
            ) : (
              <li
                className="border-b border-gray-300  "
                style={{ transitionDelay: "250ms" }}
              >
                <Form action="/login" method="post">
                  <button
                    type="submit"
                    onClick={toggleMenu}
                    className="text-md font-semibold text-gray-900"
                  >
                    🔓 Login
                  </button>
                </Form>
              </li>
            )}
          </ul>
        </nav>
      )}
    </>
  );
}

function MenuIcon(props: JSX.IntrinsicElements["svg"]) {
  return (
    <svg
      className="absolute h-5 w-5 text-gray-900"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      {...props}
    >
      <path
        d="M2.5 7.5H17.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 12.5H17.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon(props: JSX.IntrinsicElements["svg"]) {
  return (
    <svg
      className="absolute h-5 w-5 text-gray-900"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      shapeRendering="geometricPrecision"
      {...props}
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}
