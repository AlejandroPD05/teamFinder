"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CollectibleCard } from "@/components/collectible-card";
import { claimMission, type ClaimState } from "./actions";

/** Botón de reclamar y, al conseguirla, la carta nueva con una entrada breve. */
export function ClaimReward({ missionId, claimable }: { missionId: string; claimable: boolean }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimMission, null);
  return (
    <div className="flex flex-col gap-4">
      <form action={action}>
        <input type="hidden" name="mission" value={missionId} />
        <button type="submit" className="btn-primary" disabled={!claimable || pending}>
          {pending ? "Reclamando…" : "Reclamar carta"}
        </button>
      </form>
      <div role="status" aria-live="polite">
        {state?.ok === false && <p className="text-sm text-danger">{state.message}</p>}
        {state?.ok && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-success">¡Carta nueva: {state.card.name}!</p>
            <CollectibleCard card={state.card} className="card-reveal w-44" priority />
            <Link href="/coleccion" className="text-sm text-muted underline underline-offset-4 hover:text-text">
              Ver mi colección
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
