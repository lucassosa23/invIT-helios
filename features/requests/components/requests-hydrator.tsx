"use client";

import { useEffect } from "react";

import { saveRequests } from "../lib/requests-storage";
import type { InternalRequest } from "../lib/requests";

/** Shim transitorio: sincroniza localStorage de requests con la DB
 *  en cada navegación. Lo consumen monthly-plan, reports, search,
 *  command palette y our-purchases que todavía leen localStorage.
 *  Se borra cuando termine esa migración. */
export function RequestsHydrator({
  requests,
}: {
  requests: InternalRequest[];
}) {
  useEffect(() => {
    saveRequests(requests);
  }, [requests]);

  return null;
}
