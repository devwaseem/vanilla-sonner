# Migration Guide

## 0.6.0

Version 0.6.0 intentionally changes content rendering and removes duplicate distribution artifacts. Review the following items when upgrading from 0.5.x.

### Move intentional HTML to `toast.custom()`

Standard toast APIs now render all supplied content as text. This closes an HTML-injection path, but markup previously passed to `toast()`, `toast.message()`, the level helpers, promise messages, or action labels will now be displayed literally.

Before:

```js
toast("<strong>Saved</strong>");
```

For plain text, remove the markup:

```js
toast("Saved");
```

For intentional trusted markup, use an explicit custom template:

```html
<template id="saved-toast">
  <strong>{{ message }}</strong>
</template>
```

```js
toast.custom("saved-toast", { message: "Saved" });
```

`toast.custom()` inserts replacement values as HTML. Do not pass untrusted values unless they have been sanitized first.

### Update direct ESM artifact URLs

The duplicate `.js` ESM artifact has been removed. Package imports are unchanged, but direct CDN or filesystem URLs must use the `.mjs` filename.

Before:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/vanilla-sonner@0.5.2/dist/vanilla-sonner.es.min.js"
></script>
```

After:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/vanilla-sonner@0.6.0/dist/vanilla-sonner.es.min.mjs"
></script>
```

The stylesheet remains available as `dist/vanilla-sonner.min.css`. The duplicate unminified filename `dist/vanilla-sonner.css` has been removed.

### Remove timer workarounds

Paused timers now resume with exactly their remaining duration. Remove application-level workarounds that compensated for the previous additional one-second delay.

Expanded-by-default toasts also auto-dismiss normally unless `duration` is `0`.

### Remove lifecycle callback workarounds

`Toaster.create()` now invokes supplied `onClose` and `onRemove` callbacks. Remove any duplicate manual invocation added to compensate for the previous behavior.

### Action callback typing

Action callbacks may explicitly return `false` to keep a toast open:

```ts
toast("Connection lost", {
  action: {
    label: "Retry",
    onClick: () => false,
  },
});
```

This behavior existed at runtime and is now represented correctly in the generated declarations.
