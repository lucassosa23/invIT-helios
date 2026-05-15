"use client";

import { useEffect, useState } from "react";

import {
  loadRequests,
  reconcileAwaitingRequests,
  subscribeRequests,
} from "./requests-storage";
import type { InternalRequest } from "./requests";
import { subscribeInventory } from "@/lib/storage";

export function useRequests(): {
  requests: InternalRequest[];
  hydrated: boolean;
} {
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const compute = () => {
      setRequests(loadRequests());
      setHydrated(true);
    };
    compute();

    const onInventoryChange = () => {
      reconcileAwaitingRequests();
    };

    const unsubRequests = subscribeRequests(compute);
    const unsubInventory = subscribeInventory(onInventoryChange);

    reconcileAwaitingRequests();

    return () => {
      unsubRequests();
      unsubInventory();
    };
  }, []);

  return { requests, hydrated };
}
