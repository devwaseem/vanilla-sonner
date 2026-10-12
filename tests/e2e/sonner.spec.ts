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
