"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "./NavBar";

export function NavBarConditional() {
  const pathname = usePathname();
  // Hide the app NavBar on the marketing landing page
  if (pathname === "/") return null;
  return <NavBar />;
}
