/**
 * Smoke test for the static "Aide & Explication" page
 * (`app/(site)/explication/page.tsx`).
 *
 * The page is pure presentational JSX (no "use client", no hooks, no fetch,
 * no context): it renders a fixed `SECTIONS` array of 11 numbered sections,
 * each as one <h2>. There is no logic to unit-test, so we lock the rendered
 * shape instead of behaviour:
 *
 *   1. exactly 11 section headings, in numerical order 1 → 11;
 *   2. key factual copy survives (retro font names, the 16:9 cropper aspect,
 *      the voice-recorder label + its player, the blur-effect hint);
 *   3. the page renders its welcome marquee, guide title, and closing footer.
 *
 * We assert on `container`'s full `textContent` (not `getByText`) on purpose:
 * the factual strings live inside nested spans/lists, so a flat text scan is
 * the unambiguous, render-faithful check. Note the source says the recorder
 * button reads "Enregistrer" and "tu l'arrêtes" (lowercase "arrêtes"), so we
 * assert "Enregistrer" — NOT the capitalised "Arrêter", which is absent.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ExplicationPage from "./page";

afterEach(() => {
   cleanup();
   vi.restoreAllMocks();
});

describe("explication /<ExplicationPage />", () => {
   it("renders the 11 numbered sections, in order", () => {
     const { container } = render(<ExplicationPage />);

      // Only SECTIONS map to <h2> (items are <li>/<strong>, intros/notes are
      // <div>/<p>), so there must be exactly 11 section headings.
     const headings = container.querySelectorAll("h2");
     expect(headings).toHaveLength(11);

      // Leading numerals must run 1..11 (guards both count and ordering).
      const numerals = Array.from(headings).map((h) => {
        const m = (h.textContent ?? "").match(/(\d+)\.\s/);
        return m ? Number(m[1]) : NaN;
      });
     expect(numerals).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

      // Each heading keeps its expected French title (substrings chosen to
      // avoid apostrophes so text-encoding can't interfere with the check).
      const labels = [
         "Le blog",
         "Le menu",
         "Écrire un joli message",
         "effets magiques",
         "Ajouter des photos",
         "mode HTML",
         "Public ou Privé",
         "coups de cœur",
         "Le Blab",
         "compteur de visites",
         "publier",
      ];
     labels.forEach((label, i) => {
         expect(headings[i]?.textContent).toContain(label);
      });
   });

   it("keeps the key factual copy from the retro guide", () => {
     const { container } = render(<ExplicationPage />);
     const text = container.textContent ?? "";

      // Rétro fonts offered by the editor (§ "La police du texte").
     expect(text).toContain("Comic Sans");
     expect(text).toContain("Dancing Script");
     expect(text).toContain("Courier New");
     expect(text).toContain("Georgia");
     expect(text).toContain("Arial");

      // Image-cropper aspect ratios (§ Recadrer).
     expect(text).toContain("16:9");

      // Voice recorder (§ Voix): its label and the bar-style player it adds.
     expect(text).toContain("Enregistrer");
     expect(text).toContain("lecteur à barre");

      // Blur effect hint (§ Flou).
     expect(text).toContain("souris");
   });

   it("renders the welcome marquee, the guide title, and closing footer", () => {
     const { container } = render(<ExplicationPage />);
     const text = container.textContent ?? "";

       // The marquee letters are space-separated ("B I E N  V E N U E") so
       // "BIEN" won't appear contiguously in textContent — assert class instead.
     expect(container.querySelector(".marquee")).toBeTruthy();

     expect(text).toContain("Le petit guide du Skyblog");
     expect(text).toContain("Bon écrit à toi");
   });
});
