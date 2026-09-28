/**
 * Tests for `useCollapsibleToolbar` — collapsible style toolbar of the retro
 * post editor (mobile UX).
 *
 * Strategy: the hook is self-contained apart from two browser dependencies,
 * which we replace with controllable doubles:
 *
 *   1. `window.matchMedia` — jsdom does not implement it. `mockMatchMedia()`
 *      installs a fake MediaQueryList whose `matches` flag drives the initial
 *      mobile/desktop state, and whose captured "change" listener can be
 *      fired (`setMobile()`) to simulate crossing the 767px breakpoint
 *      mid-session.
 *
 *   2. The TipTap `Editor` — the hook only uses `editor.on("focus")` /
 *      `editor.off("focus")`. A `{ on, off }` double lets us capture the
 *      registered handler and fire it on demand (`focusEditor()`).
 *
 * `vi.useFakeTimers()` freezes `Date.now()` so the 800 ms grace window opened
 * by `touchToolbar()` can be probed at the exact millisecond boundary without
 * real sleeps.
 *
 * We deliberately do NOT smoke-test `<RetroEditor />` here — it mounts the
 * whole TipTap + Supabase stack, far beyond this hook's unit scope.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { Editor } from "@tiptap/core";

import { TOOLBAR_GUARD_MS, useCollapsibleToolbar } from "./useCollapsibleToolbar";

// ---------------------------------------------------------------------------
// matchMedia mock
// ---------------------------------------------------------------------------

/** Breakpoint the hook must query — aligned on Tailwind v4's `md:` (768px, borne 767.98px). */
const MOBILE_QUERY = "(max-width: 767.98px)";

interface MediaController {
  /** The fake matchMedia implementation (to assert which query was asked). */
  matchMedia: ReturnType<typeof vi.fn>;
  mql: {
    matches: boolean;
    media: string;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };
  /** Flip the breakpoint and fire the captured "change" listener. */
  setMobile(mobile: boolean): void;
}

function mockMatchMedia(initialMobile: boolean): MediaController {
  let changeListener: ((event: MediaQueryListEvent) => void) | undefined;

  const mql = {
    matches: initialMobile,
    media: MOBILE_QUERY,
    addEventListener: vi.fn((type: string, listener: unknown) => {
      if (type === "change") {
        changeListener = listener as (event: MediaQueryListEvent) => void;
      }
    }),
    removeEventListener: vi.fn(),
  };

  const matchMedia = vi.fn(() => mql);
  // DOM-typed view of the same mock, matching the lib.d.ts declaration for
  // stubbing purposes (the Mock itself stays exposed for assertions).
  const matchMediaStub = matchMedia as unknown as typeof window.matchMedia;

  // The hook calls `window.matchMedia(...)`. Depending on how the vitest jsdom
  // environment wires `window` to the global sandbox, the global stub may or
  // may not be reachable through `window` — mirror it there as well.
  vi.stubGlobal("matchMedia", matchMediaStub);
  if (window.matchMedia !== matchMediaStub) {
    window.matchMedia = matchMediaStub;
  }

  return {
    matchMedia,
    mql,
    setMobile(mobile: boolean) {
      mql.matches = mobile;
      changeListener?.({ matches: mobile } as MediaQueryListEvent);
    },
  };
}

// ---------------------------------------------------------------------------
// Fake TipTap editor
// ---------------------------------------------------------------------------

interface FakeEditor {
  editor: Editor;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
}

function makeFakeEditor(): FakeEditor {
  const on = vi.fn();
  const off = vi.fn();
  return { on, off, editor: { on, off } as unknown as Editor };
}

/** Latest "focus" handler registered on the fake editor. */
function lastFocusHandler(fake: FakeEditor): () => void {
  const registrations = fake.on.mock.calls.filter((call) => call[0] === "focus");
  const last = registrations[registrations.length - 1];
  if (!last) {
    throw new Error('no "focus" handler registered on the fake editor');
  }
  return last[1] as () => void;
}

/** Simulate the editor regaining focus (as when the user resumes typing). */
function focusEditor(fake: FakeEditor): void {
  act(() => {
    lastFocusHandler(fake)();
  });
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function renderToolbarHook(initialEditor: Editor | null) {
  return renderHook((editor: Editor | null) => useCollapsibleToolbar(editor), {
    initialProps: initialEditor,
  });
}

/** Original `window.matchMedia` descriptor, captured before each mock install. */
let originalMatchMediaDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  originalMatchMediaDescriptor = Object.getOwnPropertyDescriptor(window, "matchMedia");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  // Restore `window.matchMedia` exactly as we found it (own property, or
  // nothing at all) so every test starts from a pristine environment.
  if (originalMatchMediaDescriptor) {
    Object.defineProperty(window, "matchMedia", originalMatchMediaDescriptor);
    originalMatchMediaDescriptor = undefined;
  } else {
    delete (window as { matchMedia?: unknown }).matchMedia;
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCollapsibleToolbar — exported contract", () => {
  it("TOOLBAR_GUARD_MS is 800 ms", () => {
    // Documents the grace-window duration the editor's style buttons rely on
    // (they call editor.chain().focus() right after the click).
    expect(TOOLBAR_GUARD_MS).toBe(800);
  });
});

describe("useCollapsibleToolbar — initial breakpoint state", () => {
  it("desktop: toolbar open, isMobile false", () => {
    mockMatchMedia(false);
    const { result } = renderToolbarHook(makeFakeEditor().editor);

    expect(result.current.toolbarOpen).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });

  it("mobile: toolbar auto-collapsed to free screen space, isMobile true", () => {
    mockMatchMedia(true);
    const { result } = renderToolbarHook(makeFakeEditor().editor);

    expect(result.current.toolbarOpen).toBe(false);
    expect(result.current.isMobile).toBe(true);
  });

  it("queries the (max-width: 767.98px) breakpoint and subscribes to its change event", () => {
    const media = mockMatchMedia(false);
    renderToolbarHook(makeFakeEditor().editor);

    expect(media.matchMedia).toHaveBeenCalledWith(MOBILE_QUERY);
    expect(media.mql.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});

describe("useCollapsibleToolbar — manual toggle", () => {
  it("mobile: toggle re-displays the toolbar, a second toggle hides it again", () => {
    mockMatchMedia(true);
    const { result } = renderToolbarHook(makeFakeEditor().editor);
    expect(result.current.toolbarOpen).toBe(false);

    act(() => {
      result.current.toggleToolbar();
    });
    expect(result.current.toolbarOpen).toBe(true);

    act(() => {
      result.current.toggleToolbar();
    });
    expect(result.current.toolbarOpen).toBe(false);
  });
});

describe("useCollapsibleToolbar — auto-collapse on editor focus (mobile)", () => {
  it("collapses on editor focus when the toolbar was not just used", () => {
    mockMatchMedia(true);
    const fake = makeFakeEditor();
    const { result } = renderToolbarHook(fake.editor);

    // The user re-opens the toolbar, then resumes typing without touching it.
    act(() => {
      result.current.toggleToolbar();
    });
    expect(result.current.toolbarOpen).toBe(true);

    focusEditor(fake);
    expect(result.current.toolbarOpen).toBe(false);
  });

  it("focus on an already-collapsed toolbar keeps it collapsed (no-op)", () => {
    mockMatchMedia(true);
    const fake = makeFakeEditor();
    const { result } = renderToolbarHook(fake.editor);
    expect(result.current.toolbarOpen).toBe(false);

    focusEditor(fake);
    expect(result.current.toolbarOpen).toBe(false);
  });
});

describe("useCollapsibleToolbar — grace window after toolbar use (touchToolbar)", () => {
  it("touchToolbar alone does not change visibility — it only opens the grace window", () => {
    mockMatchMedia(true);
    const { result } = renderToolbarHook(makeFakeEditor().editor);
    expect(result.current.toolbarOpen).toBe(false);

    act(() => {
      result.current.touchToolbar();
    });
    expect(result.current.toolbarOpen).toBe(false);
  });

  it("editor focus inside the grace window does NOT collapse (style buttons chain().focus())", () => {
    mockMatchMedia(true);
    const fake = makeFakeEditor();
    const { result } = renderToolbarHook(fake.editor);

    act(() => {
      result.current.toggleToolbar(); // open the toolbar
      result.current.touchToolbar(); // user clicks "Bold" → editor regains focus
    });
    expect(result.current.toolbarOpen).toBe(true);

    // Immediate focus (0 ms) and focus at 799 ms: both within the 800 ms grace.
    focusEditor(fake);
    expect(result.current.toolbarOpen).toBe(true);

    vi.advanceTimersByTime(799);
    focusEditor(fake);
    expect(result.current.toolbarOpen).toBe(true);

    // Past the grace window, resuming typing collapses the toolbar again.
    vi.advanceTimersByTime(2); // 801 ms since the touch
    focusEditor(fake);
    expect(result.current.toolbarOpen).toBe(false);
  });

  it("boundary: focus exactly at TOOLBAR_GUARD_MS stays open (strict >), at 801 ms it collapses", () => {
    mockMatchMedia(true);
    const fake = makeFakeEditor();
    const { result } = renderToolbarHook(fake.editor);

    act(() => {
      result.current.toggleToolbar();
      result.current.touchToolbar();
    });

    vi.advanceTimersByTime(TOOLBAR_GUARD_MS); // exactly 800 ms elapsed
    focusEditor(fake);
    expect(result.current.toolbarOpen).toBe(true);

    vi.advanceTimersByTime(1); // 801 ms elapsed
    focusEditor(fake);
    expect(result.current.toolbarOpen).toBe(false);
  });
});

describe("useCollapsibleToolbar — desktop behaviour", () => {
  it("editor focus never collapses the toolbar on desktop", () => {
    mockMatchMedia(false);
    const fake = makeFakeEditor();
    const { result } = renderToolbarHook(fake.editor);
    expect(result.current.toolbarOpen).toBe(true);

    focusEditor(fake);
    focusEditor(fake);
    expect(result.current.toolbarOpen).toBe(true);
  });
});

describe("useCollapsibleToolbar — live breakpoint changes", () => {
  it("mobile → desktop crossing forces the toolbar open", () => {
    const media = mockMatchMedia(true);
    const { result } = renderToolbarHook(makeFakeEditor().editor);
    expect(result.current.toolbarOpen).toBe(false);

    act(() => {
      media.setMobile(false);
    });
    expect(result.current.toolbarOpen).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });

  it("desktop → mobile crossing collapses the toolbar", () => {
    const media = mockMatchMedia(false);
    const { result } = renderToolbarHook(makeFakeEditor().editor);
    expect(result.current.toolbarOpen).toBe(true);

    act(() => {
      media.setMobile(true);
    });
    expect(result.current.toolbarOpen).toBe(false);
    expect(result.current.isMobile).toBe(true);
  });

  // Pins the ref-over-closure design: the focus handler reads isMobileRef,
  // not the isMobile state captured at subscription time (effect deps are
  // [editor] only). A regression to a stale state closure would leave the
  // handler convinced it is still on desktop → no auto-collapse after a
  // live breakpoint flip (e.g. rotating the phone mid-session).
  it("focus AFTER a desktop→mobile flip collapses (no stale isMobile closure)", () => {
    const media = mockMatchMedia(false); // desktop at mount → handler subscribes while "desktop"
    const fake = makeFakeEditor();
    const { result } = renderToolbarHook(fake.editor);
    expect(result.current.toolbarOpen).toBe(true);

    act(() => {
      media.setMobile(true);
    });
    expect(result.current.toolbarOpen).toBe(false);

    act(() => {
      result.current.toggleToolbar(); // user re-displays the toolbar on the now-mobile viewport
    });
    expect(result.current.toolbarOpen).toBe(true);

    focusEditor(fake); // typing resumes → must auto-collapse per the NEW breakpoint
    expect(result.current.toolbarOpen).toBe(false);
  });
});

describe("useCollapsibleToolbar — editor lifecycle", () => {
  it("tolerates a null editor (first useEditor render) and subscribes once it exists", () => {
    mockMatchMedia(true);
    const fake = makeFakeEditor();
    const { result, rerender } = renderToolbarHook(null);

    // No crash on the initial null render, and no premature subscription.
    expect(result.current.toolbarOpen).toBe(false);
    expect(fake.on).not.toHaveBeenCalled();

    // useEditor resolves → the hook (re)runs its editor effect.
    rerender(fake.editor);
    expect(fake.on).toHaveBeenCalledWith("focus", expect.any(Function));

    // The late subscription is live: a focus outside the grace window collapses.
    act(() => {
      result.current.toggleToolbar();
    });
    focusEditor(fake);
    expect(result.current.toolbarOpen).toBe(false);
  });

  it("swapping editor instances re-subscribes: old handler off'd, new one on'd", () => {
    mockMatchMedia(false);
    const a = makeFakeEditor();
    const b = makeFakeEditor();
    const { rerender } = renderToolbarHook(a.editor);

    rerender(b.editor);

    expect(a.on).toHaveBeenCalledTimes(1);
    expect(a.off).toHaveBeenCalledTimes(1);
    expect(a.off.mock.calls[0][0]).toBe("focus");
    // The off'd handler is the exact reference that had been registered on `a`.
    expect(a.off.mock.calls[0][1]).toBe(a.on.mock.calls[0][1]);

    expect(b.on).toHaveBeenCalledWith("focus", expect.any(Function));
    // Fresh handler, not the stale `a` closure.
    expect(b.on.mock.calls[0][1]).not.toBe(a.on.mock.calls[0][1]);
  });

  it("does not re-subscribe when the editor instance is unchanged", () => {
    mockMatchMedia(false);
    const fake = makeFakeEditor();
    const { rerender } = renderToolbarHook(fake.editor);

    rerender(fake.editor);
    rerender(fake.editor);

    expect(fake.on).toHaveBeenCalledTimes(1);
    expect(fake.off).not.toHaveBeenCalled();
  });
});

describe("useCollapsibleToolbar — cleanup on unmount (StrictMode safety)", () => {
  it("removes the media listener and the focus handler by exact registered reference", () => {
    const media = mockMatchMedia(false);
    const fake = makeFakeEditor();
    const { unmount } = renderToolbarHook(fake.editor);

    unmount();

    // Media query listener removed with the exact registered reference.
    expect(media.mql.addEventListener).toHaveBeenCalledTimes(1);
    expect(media.mql.removeEventListener).toHaveBeenCalledTimes(1);
    expect(media.mql.removeEventListener.mock.calls[0][0]).toBe("change");
    expect(media.mql.removeEventListener.mock.calls[0][1]).toBe(
      media.mql.addEventListener.mock.calls[0][1],
    );

    // Editor focus handler removed with the exact registered reference.
    expect(fake.off).toHaveBeenCalledTimes(1);
    expect(fake.off.mock.calls[0][0]).toBe("focus");
    expect(fake.off.mock.calls[0][1]).toBe(fake.on.mock.calls[0][1]);
  });
});
