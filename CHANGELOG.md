# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-10-12

### Added

- Return stable string identifiers from non-promise helpers, deduplicate explicit identifiers in place, and add `toast.update()`, `toast.done()`, `toast.dismiss()`, and immediate `toast.remove()` lifecycle controls.
- Add persistent `toast.loading()` notifications, controlled progress, delayed appearance, structured promise results, and original-promise return values.
- Add programmatic pause/resume controls, exact document-visibility pausing, typed close reasons, async actions, dismissibility, click dismissal, and pointer swipe gestures.
- Add configurable queue, hide, discard-oldest, and discard-newest overflow policies with queue clearing, per-position capacity, ordering, and common or per-type defaults.
- Add `createToaster()` for scoped and named instances, routing through `toast.for()` or `toasterId`, and deterministic instance destruction.
- Add active/history snapshots, metadata, bounded history, active checks, message deduplication, custom dedupe resolvers, and `beforeCreate` filters.
- Add configurable keyboard focus shortcuts, arrow-key navigation, assertive important announcements, logical RTL positions, dense/expanded stacks, unstyled surfaces, and stable part selectors.
- Add installed-package contracts for ESM, CommonJS, stylesheet exports, generated types, and server-safe imports.
- Add the complete [API reference](API.md) and advanced Playwright coverage.

### Changed

- Make module import side-effect safe outside the browser by creating the default toaster lazily.
- Pass a `ToastCloseReason` to lifecycle callbacks while preserving one-argument callback compatibility.
- Isolate consumer callback, action, mapper, dedupe, and creation-hook failures from internal cleanup.
- Pause queued toast timers until their notification becomes visible.

### Fixed

- Ignore stale promise completions after an in-place update or dismissal.
- Preserve existing timers unless an update explicitly supplies a new duration, and cancel timed removal when a toast becomes loading or promise-backed.
- Keep per-position hover bounds independent so unrelated stacks do not affect one another.

## [0.6.0] - 2026-10-12

### Security

- Render messages, descriptions, promise states, and action labels as text instead of interpreting them as HTML. Intentional HTML remains available through the explicitly unsafe `toast.custom()` API.

### Added

- Add Playwright end-to-end coverage for initialization, content safety, duration overrides, lifecycle callbacks, dynamic layout, timers, accessibility, reduced motion, actions, and custom templates.
- Add strict TypeScript checking and compiler-generated declarations.
- Add live-region semantics, an accessible close-button name, keyboard-focus pause behavior, hidden-toast isolation, and reduced-motion support.
- Add a [0.6.0 migration guide](MIGRATION.md#060).

### Changed

- Recompute toast dimensions when dynamic content changes.
- Preserve exact remaining duration while pointer or keyboard focus pauses auto-dismiss.
- Publish one ESM bundle, one UMD bundle, and one stylesheet instead of byte-identical duplicate artifacts.
- Publish the ESM browser artifact as `vanilla-sonner.es.min.mjs`.
- Resolve toaster defaults without mutating caller-owned options.

### Fixed

- Initialize correctly when the module is imported after `DOMContentLoaded`.
- Respect an explicit `duration: 0` when the container specifies a default duration.
- Invoke consumer-provided `onClose` and `onRemove` callbacks.
- Keep expanded-by-default toasts eligible for auto-dismiss.
- Allow action callbacks to return `false` in generated public types.
- Remove the extra one-second delay previously added after resuming a timer.

### Removed

- Remove handwritten declaration generation and duplicate package-file copying.
- Remove the duplicate `vanilla-sonner.es.min.js` and `vanilla-sonner.css` artifacts.

[0.6.0]: https://github.com/devwaseem/vanilla-sonner/compare/v0.5.2...v0.6.0
[0.7.0]: https://github.com/devwaseem/vanilla-sonner/compare/v0.6.0...v0.7.0
