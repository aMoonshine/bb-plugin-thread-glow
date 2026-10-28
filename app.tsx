import { useEffect, useRef } from "react";
import { definePluginApp, experimental_useSidebarThreads, useBbContext, useSidebarSplitLayout } from "@get-bb/plugin-sdk/app";

const KEY = "thread-glow.completed.v1";
const CLASS = "thread-glow-completed";
const HEADER_CLASS = "thread-glow-pane-header";
const PANE_TITLE = 'div[class~="-my-1"][class~="-ml-2"][class~="rounded-md"]';

function closeButtonForTitle(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof Element) || target.closest("button, a, input, textarea, [contenteditable='true']")) return null;
  const title = target.closest<HTMLElement>(PANE_TITLE);
  const pane = title?.closest<HTMLElement>("[data-split-pane-id]");
  if (!title || !pane || !title.querySelector("p")) return null;
  return Array.from(pane.querySelectorAll<HTMLButtonElement>('button[aria-label="Close pane"]'))
    .find(button => button.closest("[data-split-pane-id]") === pane && !button.disabled) ?? null;
}

function Monitor() {
  const { threads, status } = experimental_useSidebarThreads();
  const { threadId } = useBbContext();
  const split = useSidebarSplitLayout();
  const focusedThreadId = split?.panes.find(pane => pane.isFocused)?.threadId ?? threadId;
  const focusedThreadRef = useRef(focusedThreadId);
  focusedThreadRef.current = focusedThreadId;
  const previous = useRef(new Map<string, string>());
  const completed = useRef(new Set<string>());
  const ready = useRef(false);
  const paneThreads = useRef(new Map<string, string>());
  const paintRef = useRef<() => void>(() => {});

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(saved)) completed.current = new Set(saved.filter((v): v is string => typeof v === "string"));
    } catch { /* Ignore invalid saved state. */ }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...completed.current])); } catch {} };
    const paint = () => {
      document.querySelectorAll<HTMLElement>('[data-sidebar-thread-id]').forEach(row => {
        const marked = completed.current.has(row.dataset.sidebarThreadId ?? "");
        if (row.classList.contains(CLASS) !== marked) row.classList.toggle(CLASS, marked);
      });
      document.querySelectorAll<HTMLElement>("[data-split-pane-id]").forEach(pane => {
        const thread = paneThreads.current.get(pane.dataset.splitPaneId ?? "");
        const marked = !!thread && completed.current.has(thread);
        const header = Array.from(pane.querySelectorAll<HTMLElement>('div[class~="-my-1"][class~="-ml-2"][class~="rounded-md"]'))
          .find(el => el.closest("[data-split-pane-id]") === pane && !!el.querySelector("p"));
        if (header && header.classList.contains(HEADER_CLASS) !== marked) header.classList.toggle(HEADER_CLASS, marked);
      });
    };
    paintRef.current = paint;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const row = target.closest<HTMLElement>('[data-sidebar-thread-id]');
      const id = row?.dataset.sidebarThreadId;
      if (id && completed.current.delete(id)) { save(); paint(); }
    };
    const onMiddleDown = (event: MouseEvent) => {
      if (event.button === 1 && closeButtonForTitle(event.target)) event.preventDefault();
    };
    const onMiddleClick = (event: MouseEvent) => {
      if (event.button !== 1) return;
      const close = closeButtonForTitle(event.target);
      if (!close) return;
      event.preventDefault();
      close.click();
    };
    const style = document.createElement("style");
    style.textContent = `.group\\/thread-row:has(a.${CLASS}) { background-color: rgba(255, 128, 48, .38) !important; } .${HEADER_CLASS} { background-color: rgba(255, 128, 48, .38) !important; }`;
    document.head.appendChild(style);
    const observer = new MutationObserver(paint);
    observer.observe(document.body, { childList: true, subtree: true });
    const onFocus = () => {
      const id = focusedThreadRef.current;
      if (id && completed.current.delete(id)) { save(); paint(); }
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("mousedown", onMiddleDown, true);
    document.addEventListener("auxclick", onMiddleClick, true);
    window.addEventListener("focus", onFocus);
    paint();
    return () => { observer.disconnect(); document.removeEventListener("click", onClick, true); document.removeEventListener("mousedown", onMiddleDown, true); document.removeEventListener("auxclick", onMiddleClick, true); window.removeEventListener("focus", onFocus); document.querySelectorAll(`.${CLASS}, .${HEADER_CLASS}`).forEach(el => el.classList.remove(CLASS, HEADER_CLASS)); paintRef.current = () => {}; style.remove(); };
  }, []);

  useEffect(() => {
    if (!focusedThreadId || !completed.current.delete(focusedThreadId)) return;
    try { localStorage.setItem(KEY, JSON.stringify([...completed.current])); } catch {}
    paintRef.current();
  }, [focusedThreadId]);

  useEffect(() => {
    if (status !== "ready") return;
    for (const t of threads) {
      const before = previous.current.get(t.id);
      if (ready.current && before === "active" && t.status === "idle" && !(t.id === focusedThreadRef.current && document.hasFocus())) completed.current.add(t.id);
      if (t.status === "active" || t.status === "error") completed.current.delete(t.id);
      previous.current.set(t.id, t.status);
    }
    ready.current = true;
    try { localStorage.setItem(KEY, JSON.stringify([...completed.current])); } catch {}
    paintRef.current();
  }, [threads, status]);

  useEffect(() => {
    paneThreads.current = new Map((split?.panes ?? []).filter(pane => pane.threadId !== null).map(pane => [pane.paneId, pane.threadId as string]));
    paintRef.current();
  }, [split]);
  return null;
}

export default definePluginApp(app => {
  app.slots.experimental_appOverlay({ id: "monitor", component: Monitor });
});
