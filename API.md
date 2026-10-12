# Vanilla Sonner API

This document describes the API introduced in `vanilla-sonner@0.7.0`.

## Setup

Add one default toaster container:

```html
<ol
  id="sonner-toast-container"
  position="bottom-right"
  max-toasts="3"
  duration="4000"
  theme="system"
></ol>
```

Import the JavaScript and stylesheet:

```ts
import { toast } from "vanilla-sonner";
import "vanilla-sonner/style.css";
```

Importing the JavaScript in a server environment is safe. Creating a toaster or toast requires a browser DOM and throws a descriptive error otherwise.

## Toast helpers

Every non-promise helper returns a string identifier:

```ts
const plainId = toast("Saved");
const messageId = toast.message("Update available", "Restart to install it");
const infoId = toast.info("Sync started");
const successId = toast.success("Sync complete");
const warningId = toast.warning("Storage is almost full");
const errorId = toast.error("Sync failed");
```

The helpers have this common shape:

```ts
(message: string, config?: ToastConfig) => string;
```

`toast.message` accepts a title followed by a description.

### Loading

Loading toasts display a spinner and default to `duration: 0`:

```ts
const id = toast.loading("Uploading…");

try {
  await upload();
  toast.update(id, {
    type: "success",
    message: "Upload complete",
    duration: 3000,
  });
} catch {
  toast.update(id, {
    type: "error",
    message: "Upload failed",
    duration: 6000,
  });
}
```

An explicit loading duration overrides the persistent default.

### Promise toasts

`toast.promise` returns the exact promise supplied by the caller:

```ts
const request = fetch("/api/profile");

const response = await toast.promise(request, {
  loading: "Loading profile…",
  success: (result) => `Loaded ${result.url}`,
  error: (error) =>
    error instanceof Error ? error.message : "Could not load profile",
});
```

Loading, success, and error results may be strings or structured updates:

```ts
await toast.promise(saveReport(), {
  loading: {
    message: "Saving report…",
    description: "This normally takes a few seconds",
  },
  success: (report) => ({
    message: `Saved ${report.name}`,
    description: "The report is ready to share",
    action: {
      label: "Open",
      onClick: () => openReport(report),
    },
  }),
  error: (error) => ({
    message: "Save failed",
    description: getErrorMessage(error),
    duration: 8000,
  }),
});
```

A success result defaults to `type: "success"`; an error result defaults to `type: "error"`. A structured result can override the standard type.

Promise completions are generation-safe. If a promise toast is updated or dismissed before its promise settles, the stale result is ignored. Mapper exceptions are isolated: a failing success mapper is passed to the error mapper, and a failing error mapper produces a safe error toast instead of an unhandled rejection.

### Delayed appearance

Use `delay` to avoid flashing a loading toast for fast work:

```ts
toast.promise(loadFromCacheOrNetwork(), messages, {
  delay: 250,
});
```

A delayed promise that settles before the delay expires is never mounted. Ordinary toasts with `delay` mount after the delay unless they are dismissed first.

### Custom templates

```ts
toast.custom(
  "custom-toast-template",
  { filename: "report.csv" },
  { duration: 4000 },
);
```

Custom template values are inserted as HTML. Never pass unsanitized user-controlled values to `toast.custom`.

## Identity, updates, and dismissal

Supplying an existing ID updates the existing `<li>` instead of replacing it:

```ts
const id = toast.info("Connecting…", {
  id: "connection",
  duration: 0,
});

toast.success("Connected", {
  id: "connection",
  duration: 3000,
});
```

Use the explicit lifecycle methods when intent should be clear:

```ts
toast.update(id, {
  type: "success",
  message: "Connected",
  description: "Secure session established",
  duration: 3000,
});

toast.dismiss(id); // animated exit
toast.dismiss(); // all active toasts

toast.remove(id); // immediate removal
toast.remove(); // immediately remove all
```

`update`, `dismiss`, and `remove` return `false` when they find no matching active toast. An update only resets the auto-dismiss timer when it supplies `duration` explicitly. Updating a timed toast into a promise or loading toast cancels the old timer.

## Controlled progress

Pass a number from `0` through `1`:

```ts
const id = toast.loading("Uploading…", { progress: 0 });

uploader.onProgress((loaded, total) => {
  const progress = loaded / total;
  toast.update(id, {
    progress,
    message: `Uploading… ${Math.round(progress * 100)}%`,
  });
});

toast.done(id, {
  message: "Upload complete",
  duration: 3000,
});
```

Values outside the range are clamped. The progress element uses native `progressbar` semantics. `toast.done` sets progress to `1`, defaults the type to `success`, and resolves duration from the supplied update, success defaults, common defaults, toaster duration, then `3000` milliseconds.

Controlled progress is independent of auto-dismiss timing.

## Timer control

```ts
toast.pause(id);
toast.resume(id);

toast.pause(); // all active toasts
toast.resume();
```

Timers also pause while:

- the pointer is over the stack, unless `pauseOnHover: false`;
- keyboard focus is inside the stack;
- the document is hidden;
- a toast is waiting in a queue;
- a swipe gesture is active.

Every pause reason is tracked independently. A timer resumes only after all active reasons have cleared, using the exact remaining duration.

## Actions

```ts
toast("Message archived", {
  action: {
    label: "Undo",
    onClick: async (id) => {
      await restoreMessage();
      console.log(`Restored from ${id}`);
    },
  },
});
```

An action dismisses the toast after a synchronous or asynchronous handler completes. Return `false` to keep the toast open. Exceptions and rejected action promises are reported to the console without corrupting toast state.

## Accessibility and interaction

Normal toasts use `role="status"` and `aria-live="polite"`. Set `important` only for notifications that must interrupt assistive technology:

```ts
toast.error("Payment failed", { important: true });
```

Important toasts use `role="alert"` and `aria-live="assertive"`.

The default toaster hotkey is `Alt+T`. It focuses the newest visible toast. With focus in the stack:

- Arrow keys move between visible toasts.
- `Escape` dismisses the focused toast.
- `Tab` reaches action and close buttons normally.

Configure or disable the shortcut:

```ts
toast.configure({ hotkey: "Ctrl+Shift+N" });
toast.configure({ hotkey: false });
```

### Swipe dismissal

```ts
toast("Swipe to dismiss", {
  swipeDirections: ["left", "right"],
  swipeThreshold: 0.35,
});
```

The threshold is the fraction of toast width or height that must be crossed. Default directions follow the toast position. Swipe is implemented with Pointer Events and always has keyboard and close-button alternatives. Reduced-motion preferences disable transition durations.

### Dismissibility

```ts
toast("Processing payment", {
  dismissible: false,
  closeOnClick: false,
});
```

`dismissible: false` prevents close-button, click, action, swipe, and keyboard dismissal. Programmatic dismissal, timeout completion, and toaster destruction remain available.

## Lifecycle callbacks

```ts
toast("Saved", {
  onClose(id, reason) {
    // Dismissal has begun.
  },
  onRemove(id, reason) {
    // The element has left the DOM.
  },
});
```

`ToastCloseReason` is:

```ts
type ToastCloseReason =
  | "timeout"
  | "close-button"
  | "action"
  | "programmatic"
  | "swipe"
  | "click"
  | "keyboard"
  | "destroy"
  | "discarded";
```

Callback exceptions are caught and reported without preventing cleanup. Deduplication and updates do not invoke lifecycle callbacks.

## `ToastConfig`

| Option            | Type                      | Default         | Behavior                                                 |
| ----------------- | ------------------------- | --------------- | -------------------------------------------------------- |
| `id`              | `string`                  | generated       | Stable identity; an active match updates in place.       |
| `toasterId`       | `string`                  | default toaster | Routes a global helper call to a named toaster.          |
| `duration`        | `number`                  | toaster default | Auto-dismiss milliseconds; `0` is persistent.            |
| `delay`           | `number`                  | `0`             | Milliseconds before mounting.                            |
| `action`          | `ToastAction`             | none            | Action button and handler.                               |
| `closeButton`     | `boolean`                 | toaster default | Shows the close button when dismissible.                 |
| `theme`           | `light \| dark \| system` | toaster default | Per-toast theme override.                                |
| `position`        | `ToastPosition`           | toaster default | Physical or logical position.                            |
| `richColors`      | `boolean`                 | toaster default | Type-specific colors.                                    |
| `important`       | `boolean`                 | `false`         | Uses assertive alert semantics.                          |
| `progress`        | `number`                  | none            | Controlled progress from `0` through `1`.                |
| `dismissible`     | `boolean`                 | `true`          | Allows user-initiated dismissal.                         |
| `closeOnClick`    | `boolean`                 | `false`         | Dismisses when non-interactive toast content is clicked. |
| `pauseOnHover`    | `boolean`                 | `true`          | Pauses its timer while the stack is hovered.             |
| `swipeDirections` | `ToastSwipeDirection[]`   | position-aware  | Allowed drag directions.                                 |
| `swipeThreshold`  | `number`                  | `0.35`          | Required width/height fraction.                          |
| `unstyled`        | `boolean`                 | toaster default | Removes built-in surface decoration.                     |
| `dedupe`          | `boolean \| "message"`    | toaster default | Prevents duplicate type/message pairs.                   |
| `data`            | `Record<string, unknown>` | none            | Metadata exposed through snapshots.                      |
| `onClose`         | callback                  | none            | Called when closing begins.                              |
| `onRemove`        | callback                  | none            | Called after DOM removal.                                |

`ToastPosition` accepts `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right`, and logical `top-start`, `top-end`, `bottom-start`, `bottom-end` values. Logical positions follow the container's computed text direction.

## Toaster configuration

Configure the default toaster before or after its first toast:

```ts
toast.configure({
  maxToasts: 3,
  overflow: "queue",
  position: "bottom-end",
  theme: "system",
  dense: false,
  stack: "collapse",
  newestOnTop: true,
  defaults: {
    default: { duration: 4000 },
    success: { duration: 2500 },
    error: { duration: 8000, important: true },
    loading: { duration: 0 },
  },
});
```

### `ToasterConfig`

| Option         | Default                                | Behavior                                                        |
| -------------- | -------------------------------------- | --------------------------------------------------------------- |
| `id`           | container ID                           | Registers a named toaster.                                      |
| `maxToasts`    | container `max-toasts` or `3`          | Maximum visible toasts per position group.                      |
| `overflow`     | `hide`                                 | `hide`, `queue`, `discard-oldest`, or `discard-newest`.         |
| `position`     | container `position` or `bottom-right` | Default position.                                               |
| `duration`     | container `duration` or `0`            | Default duration.                                               |
| `closeButton`  | container setting                      | Default close button.                                           |
| `theme`        | container setting                      | Default theme.                                                  |
| `richColors`   | container setting                      | Default rich colors.                                            |
| `expanded`     | container setting                      | Keeps stacks expanded.                                          |
| `stack`        | `collapse`                             | `expand` or `collapse`. Collapsed stacks expand on hover/focus. |
| `newestOnTop`  | `true`                                 | Controls which toast is at the visual front.                    |
| `dense`        | `false`                                | Uses compact gaps and padding.                                  |
| `unstyled`     | `false`                                | Removes built-in toast surface decoration.                      |
| `hotkey`       | `Alt+T`                                | Focus shortcut, or `false`.                                     |
| `ariaLabel`    | `Notifications`                        | Accessible label for the region.                                |
| `historyLimit` | `100`                                  | Maximum closed snapshots; `0` disables history.                 |
| `dedupe`       | `false`                                | Message dedupe or a custom resolver.                            |
| `defaults`     | none                                   | Common and per-type `ToastConfig` defaults.                     |
| `beforeCreate` | none                                   | Creation filter/transform hook.                                 |

### Overflow policies

- `hide`: preserves the historical behavior. Only the newest capacity is visible; hidden toast timers continue.
- `queue`: keeps the oldest capacity visible. Waiting timers are paused and resume when promoted.
- `discard-oldest`: immediately removes the oldest toast when capacity is exceeded.
- `discard-newest`: rejects the newly created toast when capacity is exceeded.

```ts
const removed = toast.clearQueue(); // number of waiting toasts removed
```

Capacity is calculated independently for every effective position.

### Duplicate filtering and creation hooks

```ts
toast.configure({ dedupe: "message" });
```

Per-toast `dedupe: false` disables a toaster-level duplicate rule for that call.

For application-specific logic:

```ts
toast.configure({
  dedupe(next, active) {
    const match = active.find(
      (item) => item.data?.operationId === next.data?.operationId,
    );
    return match?.id ?? false;
  },
  beforeCreate(next) {
    if (next.message === "internal-only") return false;
    return { ...next, richColors: true };
  },
});
```

A dedupe resolver returns an existing ID or `false`. `beforeCreate` returns transformed options or `false` to suppress creation. Consumer hook exceptions are isolated and reported.

## Multiple and named toasters

```html
<ol id="notifications"></ol>
<ol id="critical-alerts"></ol>
```

```ts
import { createToaster, toast } from "vanilla-sonner";

const notifications = createToaster("#notifications", {
  id: "notifications",
  position: "bottom-end",
});

const alerts = createToaster(document.querySelector("#critical-alerts")!, {
  id: "alerts",
  position: "top-center",
  defaults: {
    error: { important: true, duration: 0 },
  },
});

notifications.success("Saved");
alerts.error("Connection lost");
toast.for("alerts").warning("Retrying…");
toast.info("Routed from the global facade", { toasterId: "alerts" });
```

`createToaster` returns a complete, isolated `ToastAPI` with its own configuration, queue, timers, and history.

Destroy an instance when its application surface is removed:

```ts
alerts.destroy();
```

Destruction aborts event listeners, disconnects observers, cancels delayed mounts, immediately removes active toasts with reason `destroy`, and unregisters the named instance. Calling a destroyed scoped API throws.

## Inspection

```ts
toast.isActive(id); // boolean
toast.getActive(); // ToastSnapshot[]
toast.getHistory(); // ToastSnapshot[]
```

Snapshots are copies and include identity, content, type, position, progress, state, timestamps, close reason, and copied metadata. Active states are `delayed`, `queued`, `visible`, or `closing`. History is recorded when closing starts and is bounded by `historyLimit`.

## Styling hooks

Stable part attributes are available without depending on generated markup classes:

- `[data-sonner-part="toast"]`
- `[data-sonner-part="content"]`
- `[data-sonner-part="close-button"]`
- `[data-sonner-part="action-button"]`
- `[data-sonner-part="progress-track"]`
- `[data-sonner-part="progress-bar"]`

Useful state attributes include `data-type`, `data-theme`, `data-rich-colors`, `data-state`, `data-mounted`, `data-hidden`, `data-expanded`, `data-front`, `data-x-position`, `data-y-position`, and `data-swiping`.

The default stylesheet uses CSS custom properties including `--width`, `--padding`, `--gap`, `--x-offset`, and `--y-offset`. Physical offsets account for `env(safe-area-inset-*)`. Progress direction follows RTL containers.

`unstyled: true` removes the built-in surface background, border, shadow, padding, font, and color while preserving lifecycle positioning, interaction, accessibility, and stable part selectors.

## Container attributes

Existing HTML configuration remains supported:

| Attribute      | Values                          |
| -------------- | ------------------------------- |
| `position`     | Physical toast positions        |
| `max-toasts`   | Positive integer                |
| `duration`     | Milliseconds; `0` is persistent |
| `close-button` | `true` or `false`               |
| `rich-colors`  | `true` or `false`               |
| `theme`        | `light`, `dark`, or `system`    |
| `expanded`     | `true` or `false`               |

Use `toast.configure` or `createToaster` for the advanced queue, ordering, hotkey, defaults, hooks, dense, and history options.
