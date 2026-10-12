import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const fixture = "/tests/e2e/fixture.html";

async function importSonner(page: Page) {
  await page.evaluate(async (modulePath) => {
    // This test intentionally exercises a module loaded after DOMContentLoaded.
    await import(modulePath);
  }, "/src/index.ts");
}

test.beforeEach(async ({ page }) => {
  await page.goto(fixture);
});

test("creates a toast when imported after DOMContentLoaded", async ({
  page,
}) => {
  await importSonner(page);

  await page.evaluate(() => window.toast("Late import works"));

  await expect(page.getByText("Late import works")).toBeVisible();
});

test("renders ordinary messages as text rather than HTML", async ({ page }) => {
  await importSonner(page);

  await page.evaluate(() =>
    window.toast('<strong data-review-injected="true">unsafe</strong>'),
  );

  await expect(page.getByText("<strong data-review-injected")).toBeVisible();
  await expect(page.locator("[data-review-injected]")).toHaveCount(0);
});

test("honors an explicit zero duration over the container default", async ({
  page,
}) => {
  await page.locator("#sonner-toast-container").evaluate((container) => {
    container.setAttribute("duration", "80");
  });

  await page.evaluate(async (modulePath) => {
    // Runtime loading is required to cover post-DOMContentLoaded initialization.
    const { toast } = await import(modulePath);
    toast("Persistent toast", { duration: 0 });
  }, "/src/index.ts");

  await page.waitForTimeout(750);
  await expect(page.getByText("Persistent toast")).toBeAttached();
});

test("invokes lifecycle callbacks when a toast closes and leaves the DOM", async ({
  page,
}) => {
  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { Toaster } = await import(modulePath);
    const toaster = new Toaster();
    toaster.create({
      type: "plain",
      message: "Lifecycle toast",
      duration: 0,
      closeButton: true,
      onClose: () => {
        document.body.dataset.onClose = "called";
      },
      onRemove: () => {
        document.body.dataset.onRemove = "called";
      },
    });
  }, "/src/index.ts");

  await page.locator(".sonner-toast-close").click();

  await expect(page.locator("body")).toHaveAttribute("data-on-close", "called");
  await expect(page.locator("body")).toHaveAttribute(
    "data-on-remove",
    "called",
  );
  await expect(page.getByText("Lifecycle toast")).toHaveCount(0);
});

test("reflows an expanded stack when promise content changes height", async ({
  page,
}) => {
  await page.locator("#sonner-toast-container").evaluate((container) => {
    container.setAttribute("expanded", "true");
  });
  await page.addStyleTag({
    content:
      "[data-toast-promise-message] { max-width: 160px; white-space: normal; }",
  });

  const successMessage =
    "Completed with enough detail to wrap across several lines and change the notification height substantially.";

  await page.evaluate(
    async ({ modulePath, success }) => {
      // Runtime loading keeps the test at the package's browser-facing seam.
      const { toast } = await import(modulePath);
      toast("Older notification", { duration: 0 });
      toast.promise(
        Promise.resolve(),
        {
          loading: "Loading",
          success,
          error: "Failed",
        },
        { duration: 0 },
      );
    },
    { modulePath: "/src/index.ts", success: successMessage },
  );

  await expect(page.getByText(successMessage)).toBeVisible();
  await page.waitForTimeout(100);

  const overlap = await page
    .locator("[data-sonner-toast]")
    .evaluateAll((toasts) => {
      const [older, promise] = toasts.map((toast) =>
        toast.getBoundingClientRect(),
      );
      if (!older || !promise) {
        throw new Error("Expected two toasts");
      }
      return (
        Math.min(older.bottom, promise.bottom) -
        Math.max(older.top, promise.top)
      );
    });

  expect(overlap).toBeLessThanOrEqual(0);
});

test("auto-dismisses toasts when the stack is expanded by default", async ({
  page,
}) => {
  await page.locator("#sonner-toast-container").evaluate((container) => {
    container.setAttribute("expanded", "true");
  });

  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    toast("Expanded timeout", { duration: 100 });
  }, "/src/index.ts");
  const toast = page.locator("[data-sonner-toast]", {
    hasText: "Expanded timeout",
  });
  await expect(toast).toHaveAttribute("data-hidden", "false");
  await expect(toast).toHaveAttribute("data-hidden", "true", {
    timeout: 1_000,
  });
});

test("pauses and resumes auto-dismiss while the pointer is over the stack", async ({
  page,
}) => {
  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    toast("Pointer pause", { duration: 250 });
  }, "/src/index.ts");

  const toast = page.locator("[data-sonner-toast]", {
    hasText: "Pointer pause",
  });
  await toast.hover({ force: true });
  await page.waitForTimeout(350);
  await expect(toast).toHaveAttribute("data-hidden", "false");

  await page.mouse.move(0, 0);
  await expect(toast).toHaveAttribute("data-hidden", "true", {
    timeout: 750,
  });
});

test("pauses and resumes auto-dismiss while focus is inside a toast", async ({
  page,
}) => {
  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    toast("Focus pause", {
      duration: 250,
      action: {
        label: "Keep open",
        onClick: () => false,
      },
    });
  }, "/src/index.ts");

  const toast = page.locator("[data-sonner-toast]", {
    hasText: "Focus pause",
  });
  await page.getByRole("button", { name: "Keep open" }).focus();
  await page.waitForTimeout(350);
  await expect(toast).toHaveAttribute("data-hidden", "false");

  await page.locator("#outside-focus-target").focus();
  await expect(toast).toHaveAttribute("data-hidden", "true", {
    timeout: 750,
  });
});

test("exposes notifications and controls to assistive technology", async ({
  page,
}) => {
  await importSonner(page);

  await page.evaluate(() => window.toast.success("Accessible notification"));

  const status = page.getByRole("status");
  await expect(status).toContainText("Accessible notification");
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toHaveAttribute("aria-atomic", "true");
  await expect(
    page.getByRole("button", { name: "Close notification" }),
  ).toBeVisible();
  await expect(status.locator('svg:not([aria-hidden="true"])')).toHaveCount(0);
});

test("disables non-essential motion when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    const { promise } = Promise.withResolvers<unknown>();
    toast.promise(
      promise,
      {
        loading: "Waiting",
        success: "Done",
        error: "Failed",
      },
      { duration: 0 },
    );
  }, "/src/index.ts");

  const toast = page.locator("[data-sonner-toast]");
  await expect(toast).toHaveAttribute("data-mounted", "true");

  const motion = await toast.evaluate((element) => ({
    transitionDuration: getComputedStyle(element).transitionDuration,
    spinnerAnimation: getComputedStyle(
      element.querySelector("[data-toast-promise-running]")!,
    ).animationName,
  }));

  expect(motion.transitionDuration).toBe("0s");
  expect(motion.spinnerAnimation).toBe("none");
});

test("keeps a toast open when its action returns false", async ({ page }) => {
  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    toast("Action contract", {
      duration: 0,
      action: {
        label: "Keep notification",
        onClick: () => false,
      },
    });
  }, "/src/index.ts");

  await page.getByRole("button", { name: "Keep notification" }).click();

  await expect(
    page.locator("[data-sonner-toast]", { hasText: "Action contract" }),
  ).toHaveAttribute("data-hidden", "false");
});

test("keeps HTML rendering explicit to custom toast templates", async ({
  page,
}) => {
  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    toast.custom(
      "custom-toast-template",
      {
        content: '<strong data-custom-html="true">Trusted markup</strong>',
      },
      { duration: 0 },
    );
  }, "/src/index.ts");

  await expect(page.locator("[data-custom-html]")).toHaveText("Trusted markup");
});

test("removes overflow toasts from the accessibility tree", async ({
  page,
}) => {
  await page.locator("#sonner-toast-container").evaluate((container) => {
    container.setAttribute("max-toasts", "1");
  });
  await importSonner(page);

  await page.evaluate(() => {
    window.toast("Older hidden notification", { duration: 0 });
    window.toast("Visible notification", { duration: 0 });
  });

  const hiddenToast = page.locator("[data-sonner-toast]", {
    hasText: "Older hidden notification",
  });
  await expect(hiddenToast).toHaveAttribute("aria-hidden", "true");
  await expect(hiddenToast).toHaveAttribute("inert", "");
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("Visible notification");
});

test("returns stable identifiers and deduplicates matching toasts in place", async ({
  page,
}) => {
  const result = await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    const firstId = toast("Starting", {
      id: "upload-status",
      duration: 0,
    });
    const firstElement = document.getElementById(firstId);
    const secondId = toast.success("Finished", {
      id: "upload-status",
      duration: 0,
    });
    return {
      firstId,
      secondId,
      sameElement: firstElement === document.getElementById(secondId),
    };
  }, "/src/index.ts");

  expect(result).toEqual({
    firstId: "upload-status",
    secondId: "upload-status",
    sameElement: true,
  });
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(1);
  await expect(page.locator("[data-sonner-toast]")).toHaveAttribute(
    "data-type",
    "success",
  );
  await expect(page.getByText("Finished")).toBeVisible();
});

test("dismisses one toast by identifier or all active toasts", async ({
  page,
}) => {
  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    const firstId = toast("First dismissible toast", { duration: 0 });
    toast("Second dismissible toast", { duration: 0 });
    toast.dismiss(firstId);
  }, "/src/index.ts");

  const first = page.locator("[data-sonner-toast]", {
    hasText: "First dismissible toast",
  });
  const second = page.locator("[data-sonner-toast]", {
    hasText: "Second dismissible toast",
  });
  await expect(first).toHaveAttribute("data-hidden", "true");
  await expect(second).toHaveAttribute("data-hidden", "false");

  await page.evaluate(() => window.toast.dismiss());
  await expect(second).toHaveAttribute("data-hidden", "true");
});

test("updates an active toast in place and reports missing identifiers", async ({
  page,
}) => {
  const result = await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    const id = toast.message("Upload", "Waiting", { duration: 0 });
    const element = document.getElementById(id);
    const updated = toast.update(id, {
      type: "success",
      message: "Upload complete",
      closeButton: true,
    });
    return {
      id,
      updated,
      missing: toast.update("missing-toast", { message: "Ignored" }),
      sameElement: element === document.getElementById(id),
    };
  }, "/src/index.ts");

  expect(result.updated).toBe(true);
  expect(result.missing).toBe(false);
  expect(result.sameElement).toBe(true);
  const toast = page.locator(`#${result.id}`);
  await expect(toast).toHaveAttribute("data-type", "success");
  await expect(toast).toContainText("Upload complete");
  await expect(
    toast.getByRole("button", { name: "Close notification" }),
  ).toBeVisible();
});

test("applies complete helper configuration per toast position", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    toast.info("Top-left configured", {
      id: "top-left-configured",
      duration: 0,
      closeButton: false,
      theme: "dark",
      position: "top-left",
      richColors: true,
      onClose: () => {
        document.body.dataset.configuredClosed = "true";
      },
    });
    toast("Default-position toast", {
      id: "default-position",
      duration: 0,
    });
    toast("System-themed toast", {
      id: "system-themed",
      duration: 0,
      theme: "system",
      position: "top-right",
    });
  }, "/src/index.ts");

  const configured = page.locator("#top-left-configured");
  await expect(configured).toHaveAttribute("data-x-position", "left");
  await expect(configured).toHaveAttribute("data-y-position", "top");
  await expect(configured).toHaveAttribute("data-theme", "dark");
  await expect(configured).toHaveAttribute("data-rich-colors", "true");
  await expect(configured).toHaveAttribute("data-front", "true");
  await expect(configured.getByRole("button")).toHaveCount(0);

  const defaultPosition = page.locator("#default-position");
  await expect(defaultPosition).toHaveAttribute("data-x-position", "right");
  await expect(defaultPosition).toHaveAttribute("data-y-position", "bottom");
  await expect(defaultPosition).toHaveAttribute("data-front", "true");

  await expect(page.locator("#system-themed")).toHaveAttribute(
    "data-theme",
    "dark",
  );

  await page.evaluate(() => window.toast.dismiss("top-left-configured"));
  await expect(page.locator("body")).toHaveAttribute(
    "data-configured-closed",
    "true",
  );
});

test("keeps hover bounds independent across position groups", async ({
  page,
}) => {
  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    toast("Top left", { id: "hover-top-left", position: "top-left" });
    toast("Bottom right", {
      id: "hover-bottom-right",
      position: "bottom-right",
    });

    const container = document.getElementById("sonner-toast-container")!;
    container.dispatchEvent(new MouseEvent("mouseenter"));
    const topLeft = document
      .getElementById("hover-top-left")!
      .getBoundingClientRect();
    const bottomRight = document
      .getElementById("hover-bottom-right")!
      .getBoundingClientRect();
    container.dispatchEvent(
      new MouseEvent("mouseout", {
        clientX: (topLeft.right + bottomRight.left) / 2,
        clientY: (topLeft.bottom + bottomRight.top) / 2,
      }),
    );
  }, "/src/index.ts");

  await expect(page.locator("#hover-top-left")).toHaveAttribute(
    "data-expanded",
    "false",
  );
  await expect(page.locator("#hover-bottom-right")).toHaveAttribute(
    "data-expanded",
    "false",
  );
});

test("maps promise results while returning the original promise", async ({
  page,
}) => {
  const result = await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    const success = Promise.withResolvers<{ name: string }>();
    const returned = toast.promise(
      success.promise,
      {
        loading: "Uploading",
        success: (file: { name: string }) => `${file.name} uploaded`,
        error: "Upload failed",
      },
      { id: "promise-success", duration: 0 },
    );
    const samePromise = returned === success.promise;
    success.resolve({ name: "report.csv" });
    const value = await returned;

    const failure = Promise.withResolvers<never>();
    toast.promise(
      failure.promise,
      {
        loading: "Connecting",
        success: "Connected",
        error: (error: unknown) =>
          `Connection failed: ${error instanceof Error ? error.message : "Unknown"}`,
      },
      { id: "promise-error", duration: 0 },
    );
    failure.reject(new Error("Offline"));
    await failure.promise.catch(() => undefined);

    return { samePromise, value };
  }, "/src/index.ts");

  expect(result).toEqual({
    samePromise: true,
    value: { name: "report.csv" },
  });
  await expect(page.getByText("report.csv uploaded")).toBeVisible();
  await expect(page.getByText("Connection failed: Offline")).toBeVisible();
});

test("ignores stale promise completions after an in-place update", async ({
  page,
}) => {
  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    const deferred = Promise.withResolvers<string>();
    toast.promise(
      deferred.promise,
      {
        loading: "Pending result",
        success: (value: string) => `Late result: ${value}`,
        error: "Failed",
      },
      { id: "stale-promise", duration: 0 },
    );
    toast.update("stale-promise", {
      type: "success",
      message: "Completed manually",
    });
    deferred.resolve("server response");
    await deferred.promise;
  }, "/src/index.ts");

  await expect(page.getByText("Completed manually")).toBeVisible();
  await expect(page.getByText("Late result: server response")).toHaveCount(0);
});

test("pauses an existing timer when deduplicating to a promise", async ({
  page,
}) => {
  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    toast("Before promise", { id: "promise-reuse", duration: 150 });
    window.setTimeout(() => {
      void toast.promise(
        new Promise<string>((resolve) => {
          window.setTimeout(() => resolve("finished"), 250);
        }),
        {
          loading: "Waiting for promise",
          success: (value: string) => value,
          error: "Failed",
        },
        { id: "promise-reuse" },
      );
    }, 50);
  }, "/src/index.ts");

  await page.waitForTimeout(220);
  await expect(page.locator("#promise-reuse")).toHaveAttribute(
    "data-hidden",
    "false",
  );
  await expect(page.getByText("Waiting for promise")).toBeVisible();
  await expect(page.getByText("finished")).toBeVisible();
  await expect(page.locator("#promise-reuse")).toHaveAttribute(
    "data-hidden",
    "true",
  );
});

test("resets auto-dismiss only when an update supplies duration", async ({
  page,
}) => {
  await page.evaluate(async (modulePath) => {
    // Runtime loading keeps the test at the package's browser-facing seam.
    const { toast } = await import(modulePath);
    toast("Original timer", { id: "preserved-timer", duration: 300 });
  }, "/src/index.ts");
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.toast.update("preserved-timer", { message: "Timer preserved" });
  });
  await expect(page.locator("#preserved-timer")).toHaveAttribute(
    "data-hidden",
    "true",
    { timeout: 250 },
  );

  await page.evaluate(() => {
    window.toast("Reset timer", { id: "reset-timer", duration: 150 });
    window.toast.update("reset-timer", {
      message: "Timer extended",
      duration: 400,
    });
  });
  await page.waitForTimeout(200);
  await expect(page.locator("#reset-timer")).toHaveAttribute(
    "data-hidden",
    "false",
  );
  await expect(page.locator("#reset-timer")).toHaveAttribute(
    "data-hidden",
    "true",
    { timeout: 350 },
  );
});
