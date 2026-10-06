"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";

/**
 * Fenêtre de grâce (ms) : un focus éditeur survenant moins de 800 ms après
 * une interaction avec la barre de styles ne la replie pas. Ex. typique :
 * un bouton de style qui redonne le focus à l'éditeur via `chain().focus()`
 * juste après le clic. Exporté pour les tests unitaires.
 */
export const TOOLBAR_GUARD_MS = 800;

/** Breakpoint mobile — aligné sur le `md:` de Tailwind v4 (768 px, borne 767.98). */
const MOBILE_QUERY = "(max-width: 767.98px)";

export interface CollapsibleToolbarResult {
  /** La barre de styles est-elle visible ? */
  toolbarOpen: boolean;
  /** Bascule manuelle (poignée « 🎨 Styles ▼/▲ »). */
  toggleToolbar: () => void;
  /**
   * Enregistre une interaction récente avec la barre : tout focus éditeur
   * dans les TOOLBAR_GUARD_MS qui suivent ne déclenchera pas le repli.
   */
  touchToolbar: () => void;
  /** État réactif du breakpoint mobile — informatif, non consommé pour
   *  l'instant (les flips de breakpoint basculent déjà toolbarOpen). */
  isMobile: boolean;
}

/**
 * Barre de styles repliable de l'éditeur rétro.
 *
 * - Mobile : repliée par défaut pour libérer l'écran (la barre complète fait
 *   ~530 px de haut sur un téléphone, elle écrase la zone d'écriture).
 * - Auto-repli « à l'ancienne » : quand l'utilisateur reprend la frappe
 *   (focus éditeur), la barre se replie — sauf si elle vient d'être utilisée.
 * - Desktop : JAMAIS masquée (comportement historique préservé).
 *
 * `editor` peut être null au premier rendu de `useEditor` : l'abonnement
 * au focus est (re)fait quand l'instance devient disponible.
 *
 * NB : le repli par défaut sur mobile ne « flash » pas car TipTap force
 * `immediatelyRender = false` sous Next.js (écran « Chargement de
 * l'éditeur… » au 1er rendu, le matchMedia s'applique avant le 1er rendu
 * réel de la toolbar). Ne pas passer `immediatelyRender: true` à useEditor
 * sans revoir ce point.
 */
export function useCollapsibleToolbar(editor: Editor | null): CollapsibleToolbarResult {
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const isMobileRef = useRef(false);
  const lastTouchRef = useRef(0);

  // Détection mobile (matchMedia) + règle « desktop = barre toujours ouverte ».
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(MOBILE_QUERY);

    const apply = (mobile: boolean) => {
      isMobileRef.current = mobile;
      setIsMobile(mobile);
      // Mobile : repliée par défaut pour gagner de la place.
      // Desktop : jamais masquée, même si le viewport change.
      setToolbarOpen(!mobile);
    };

    const handleChange = (event: MediaQueryListEvent) => apply(event.matches);

    apply(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  // Auto-repli à la reprise de la frappe : focus éditeur sur mobile, hors
  // fenêtre de grâce. Le handler lit des refs → pas de closure périmée,
  // malgré les re-renders fréquents de l'éditeur.
  useEffect(() => {
    if (!editor) return;

    const handleFocus = () => {
      if (isMobileRef.current && Date.now() - lastTouchRef.current > TOOLBAR_GUARD_MS) {
        setToolbarOpen(false);
      }
    };

    editor.on("focus", handleFocus);
    return () => {
      editor.off("focus", handleFocus);
    };
  }, [editor]);

  const toggleToolbar = useCallback(() => {
    setToolbarOpen((open) => !open);
  }, []);

  const touchToolbar = useCallback(() => {
    lastTouchRef.current = Date.now();
  }, []);

  return { toolbarOpen, toggleToolbar, touchToolbar, isMobile };
}
