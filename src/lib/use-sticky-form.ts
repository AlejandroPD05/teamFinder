import { startTransition, useEffect, useRef, type FormEvent } from "react";

/**
 * Envío de formularios con acciones de servidor sin perder lo escrito. Con `<form action>`, React vacía el formulario
 * al terminar la acción, también cuando vuelve con errores de validación, y se perdían textos, casillas y selecciones.
 * Aquí se envía a mano (`onSubmit` + `startTransition`); sin JavaScript sigue funcionando con `action`.
 *
 * - `outcome`: «error» lleva el foco al primer campo con `aria-invalid="true"` (o al formulario si no hay ninguno
 *   marcado), «ok» vacía el formulario si `resetOnSuccess`. Se recalcula con cada respuesta (`state`).
 */
export function useStickyForm<S>(
  action: (fd: FormData) => void,
  state: S,
  outcome: "ok" | "error" | null,
  { resetOnSuccess = false }: { resetOnSuccess?: boolean } = {},
) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = ref.current;
    if (!form || outcome === null) return;
    if (outcome === "error") form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    else if (resetOnSuccess) form.reset();
  }, [state, outcome, resetOnSuccess]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(data));
  };
  return { ref, action, onSubmit };
}

/** Resultado de un estado `{ ok, … } | null` para `useStickyForm`. */
export const outcomeOf = (s: { ok: boolean } | null | undefined) => (s ? (s.ok ? "ok" : "error") : null);
