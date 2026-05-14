"use client";

import { useEffect, useState } from "react";

import { subscribeInventory } from "@/lib/storage";

import {
  loadRequests,
  reconcileAwaitingRequests,
  subscribeRequests,
  type InternalRequest,
} from "./requests";

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

    // Cualquier cambio en el inventario (alta manual, edición, recepción
    // de PO, etc.) dispara una reconciliación que flippea pedidos que
    // ahora tienen stock suficiente. reconcileAwaitingRequests llama a
    // saveRequests si hay cambios, lo que ya gatilla el subscribeRequests
    // y refresca el estado.
    const onInventoryChange = () => {
      reconcileAwaitingRequests();
    };

    const unsubRequests = subscribeRequests(compute);
    const unsubInventory = subscribeInventory(onInventoryChange);

    // Primera pasada de reconciliación al montar (por si hubo cambios
    // mientras /requests no estaba abierto).
    reconcileAwaitingRequests();

    return () => {
      unsubRequests();
      unsubInventory();
    };
  }, []);

  return { requests, hydrated };
}
