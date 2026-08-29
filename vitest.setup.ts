// Global Vitest setup.
//
// Les matchers de @testing-library/jest-dom (toBeInTheDocument, toBeVisible,
// toHaveClass, etc.) ne sont PAS importés par défaut, pour deux raisons :
//   1. aucun test du dépôt n'utilise ces matchers pour l'instant ;
//   2. sous certaines combinaisons (vitest 3.x + @testing-library/jest-dom 7.x
//      dans des environnements sandbox), l'import bloque le worker et fige
//      toute la suite de tests (y compris les tests unitaires Node).
//
// Pour les futurs tests de composants qui en ont besoin, importez jest-dom
// directement dans le fichier de test concerné :
//   import "@testing-library/jest-dom/vitest";
//
// Ré-activation globale (environnements où l'import ne bloque pas) :
//   export const ENABLE_JEST_DOM = "1";
//   if (process.env.ENABLE_JEST_DOM === "1") {
//     await import("@testing-library/jest-dom/vitest");
//   }
