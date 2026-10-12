# vanilla-sonner

A lightweight port of [Sonner](https://github.com/emilkowalski/sonner) for vanilla JavaScript.

vanilla-sonner brings elegant and customizable toast notifications to your web applications without any framework dependencies.

See the [complete API reference](API.md), [changelog](CHANGELOG.md), and [0.6.0 migration guide](MIGRATION.md#060).

## ✨ Features

- **Framework agnostic:** one browser-first API with no component framework dependency.
- **Complete lifecycle control:** stable IDs, in-place updates, animated dismissal, immediate removal, pause/resume, teardown, and bounded history.
- **Async workflows:** loading states, structured promise results, delayed appearance, controlled progress, and stale-result protection.
- **Flexible capacity:** per-position limits with hide, queue, discard-oldest, or discard-newest policies.
- **Accessible interaction:** polite or important live regions, keyboard navigation, focus shortcuts, swipe dismissal, reduced motion, and exact timer pausing.
- **Scoped configuration:** named toaster instances, per-type defaults, dedupe and creation hooks, logical RTL positions, themes, rich colors, dense stacks, and unstyled parts.

## 🚀 Installation

### via npm

```bash
npm install vanilla-sonner
```

via CDN:

```html
<head>
  ...

  <link
    href="https://cdn.jsdelivr.net/npm/vanilla-sonner@latest/dist/vanilla-sonner.min.css"
    rel="stylesheet"
  />

  <script src="https://cdn.jsdelivr.net/npm/vanilla-sonner@latest/dist/vanilla-sonner.umd.min.js"></script>

  <!-- If you're using ES Modules -->
  <script
    src="https://cdn.jsdelivr.net/npm/vanilla-sonner@latest/dist/vanilla-sonner.es.min.mjs"
    type="module"
  ></script>

  ...
</head>
```

via Manually:

```html
<head>
  ...

  <link href="path/to/dist/vanilla-sonner.min.css" rel="stylesheet" />

  <script src="path/to/dist/vanilla-sonner.umd.min.js"></script>

  <!-- If you're using ES Modules -->
  <script src="path/to/dist/vanilla-sonner.es.min.mjs" type="module"></script>

  ...
</head>
```

## 💻 Usage

To get started, you'll need to include the toaster container in your HTML and then use the toast function in your JavaScript.

### Add the Toaster Container

Place an `<ol>` element with the `id="sonner-toast-container"` in your index.html (or main application file). This element serves as the main container for all toasts and allows for global configuration via data attributes.

```html
<body>
  ...

  <!-- The main toaster container -->
  <ol
    id="sonner-toast-container"
    position="bottom-right"
    max-toasts="3"
    rich-colors="true"
    theme="light"
  ></ol>

  ...
</body>
```

## Import and Use Toasts

After setting up your container, import the toast function into your JavaScript file and use it to display notifications. If you're including the script directly in your HTML, toast will be globally available on the window object.

```js
import { toast } from "vanilla-sonner"; // If using ES Modules
import "vanilla-sonner/style.css"; // Required styles

// Basic toast
toast("My first vanilla toast!");

// Toast with a description
toast.message("Update available", "New version 1.2.0 available for download.");

// Success toast
toast.success("Event created successfully!");

// Info toast
toast.info("5 tasks completed!");

// Warning toast
toast.warning("Please save your changes before closing!");

// Error toast
toast.error("Something went wrong!");

// Custom toast (requires a <template id="..."> in your HTML)
toast.custom(
  "custom-toast-template",
  { wifiName: "Pineapple" },
  { duration: 3000 },
);
```

## Lifecycle Control

Every non-promise helper returns the toast's string identifier. Pass an `id` to create-or-update the same toast without replacing its DOM element:

```js
const id = toast.info("Uploading…", {
  id: "profile-upload",
  duration: 0,
});

toast.update(id, {
  type: "success",
  message: "Upload complete",
  description: "Your profile photo is ready.",
  duration: 3000,
});

toast.dismiss(id); // dismiss one toast
toast.dismiss(); // dismiss every active toast
```

Loading and controlled progress use the same identifier:

```js
const uploadId = toast.loading("Uploading…", { progress: 0 });
toast.update(uploadId, { progress: 0.5, message: "Uploading… 50%" });
toast.done(uploadId, { message: "Upload complete", duration: 3000 });
```

Omitting `duration` from `toast.update()` preserves the toast's current timer. Supplying `duration` starts a new timer; use `0` to keep the toast open until dismissed.

Promise toasts accept result mappers and return the original promise, so they remain awaitable:

```js
const request = fetch("/api/profile");

const response = await toast.promise(request, {
  loading: "Loading profile…",
  success: (result) => `Loaded ${result.url}`,
  error: (error) => `Could not load profile: ${error.message}`,
});
```

## Custom Toasts (`toast.custom`)

Custom toasts let you render arbitrary HTML using a `<template>` in your page. Under the hood, vanilla-sonner takes the template’s HTML and replaces `{{ key }}` placeholders using the `data` object you pass to `toast.custom`.

### 1) Add a template to your HTML

```html
<template id="custom-toast-template">
  <div style="display:flex;align-items:center;gap:.5rem">
    <strong>Connected</strong> to <u>{{ wifiName }}</u>
  </div>
</template>
```

### 2) Call `toast.custom(templateId, data, options)`

```js
toast.custom(
  "custom-toast-template",
  { wifiName: "Pineapple" },
  {
    duration: 4000,
    action: {
      label: "Disconnect",
      onClick: () => {
        // return false to keep the toast open
        // return true/undefined to auto-dismiss after click
        return false;
      },
    },
  },
);
```

### Placeholder behavior (important)

- Placeholders are simple `{{ key }}` tokens (no nested paths), where `key` is a word character name (letters/numbers/underscore).
- Vanilla-sonner injects an `id` key automatically (the toast element id), so `{{ id }}` is always available.
- Values are inserted as HTML (via `innerHTML`), so do not pass untrusted user input into `data` unless you sanitize it first.

### All options for `toast.custom`

`toast.custom(templateId, data, options?)`

| Parameter    | Type                     | Required | Description                                                                                                                              |
| ------------ | ------------------------ | -------: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `templateId` | `string`                 |      Yes | The `id` of a `<template>` element in the DOM.                                                                                           |
| `data`       | `Record<string, string>` |      Yes | Keys used to replace placeholders in your template.                                                                                      |
| `options`    | `ToastConfig`            |       No | Per-toast configuration such as `id`, `duration`, `closeButton`, `theme`, `position`, `richColors`, `action`, `onClose`, and `onRemove`. |

Per-toast options override toaster container defaults. Supplying the same `options.id` again updates the existing custom toast in place.

## Toaster Container Attributes

Configure the global behavior of your toasts by adding the following attributes to the `<ol id="sonner-toast-container">` element:

| Attribute    | Description                                                                                                 | Default        | Accepted Values                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| position     | Sets the default position of the toasts.                                                                    | bottom-right   | bottom-right, top-left, top-center, top-right, bottom-left, bottom-center, bottom-right |
| max-toasts   | The maximum number of toasts to display at once. Older toasts will be hidden if this limit is exceeded.     | 3              | Any integer                                                                             |
| duration     | The default duration (in milliseconds) for which a toast remains visible. Set to 0 for indefinite duration. | 0 (indefinite) | Any integer (milliseconds)                                                              |
| close-button | If true, a close button will be displayed on each toast.                                                    | false          | true, false                                                                             |
| rich-colors  | If true, toasts will use type-specific background and border colors (success, info, warning, error).        | false          | true, false                                                                             |
| theme        | Sets the default theme for toasts .                                                                         | light          | system, light, dark                                                                     |
| expanded     | If true, toasts will appear in an expanded state by default.                                                | false          | true, false                                                                             |

## API Reference

See [`API.md`](API.md) for the complete contracts and examples, including:

- every `ToastConfig` and `ToasterConfig` option;
- loading, structured promise results, progress, delay, and timer control;
- queue and overflow semantics;
- swipe, keyboard, accessibility, RTL, and styling behavior;
- scoped/named toaster instances and teardown;
- duplicate filtering, snapshots, and lifecycle reasons.

Create an isolated toaster for a separate application surface:

```js
import { createToaster } from "vanilla-sonner";

const alerts = createToaster("#critical-alerts", {
  id: "alerts",
  position: "top-center",
  defaults: {
    error: { important: true, duration: 0 },
  },
});

alerts.error("Connection lost");
```

## 🛠️ Development

To set up the project for development:

Clone the repository:

```bash
git clone https://github.com/devwaseem/vanilla-sonner.git
cd vanilla-sonner
```

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

This generates the dist folder, containing the compiled JavaScript and CSS files.

## Run the example

You can open example/index.html directly in your browser, or use a local development server. If you have vite installed, you can run:

```bash
vite dev # from the root directory
```

Then, navigate to [http://localhost:5173/example/index.html](http://localhost:5173/example/index.html) (port might vary).

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/devwaseem/vanilla-sonner/blob/main/LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue. If you'd like to contribute code, please fork the repository and submit a pull request.
