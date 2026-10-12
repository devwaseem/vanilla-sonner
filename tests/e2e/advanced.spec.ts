import { expect, test } from "@playwright/test";

const fixture = "/tests/e2e/fixture.html";

async function importSonner(page: import("@playwright/test").Page) {
  await page.evaluate(async (modulePath) => {
    await import(modulePath);
  }, "/src/index.ts");
}

test.beforeEach(async ({ page }) => {
  await page.goto(fixture);
  await importSonner(page);
});

test("supports loading, important announcements, controlled progress, and done", async ({
  page,
}) => {
  await page.evaluate(() => {
    const id = window.toast.loading("Uploading", {
      id: "upload-progress",
      important: true,
      progress: 0.2,
    });
    window.toast.update(id, { progress: 0.6, message: "Uploading 60%" });
  });

  const toast = page.locator("#upload-progress");
  await expect(toast).toHaveAttribute("data-type", "loading");
  await expect(toast).toHaveAttribute("role", "alert");
  await expect(toast).toHaveAttribute("aria-live", "assertive");
  await expect(toast.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "60",
  );

  await page.evaluate(() => {
    window.toast.done("upload-progress", {
      message: "Upload complete",
      duration: 80,
    });
  });
  await expect(toast).toHaveAttribute("data-type", "success");
  await expect(toast.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expect(toast).toHaveAttribute("data-hidden", "true");
});

test("maps structured promise results and suppresses fast delayed promises", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const source = Promise.resolve({ name: "report.csv" });
    const returned = window.toast.promise(
      source,
      {
        loading: { message: "Preparing", description: "Please wait" },
        success: (value: { name: string }) => ({
          message: `Ready: ${value.name}`,
          description: "Download prepared",
          action: { label: "Open", onClick: () => false },
        }),
        error: { message: "Failed", description: "Try again" },
      },
      { id: "structured-promise", duration: 0 },
    );
    const fast = Promise.resolve("fast");
    window.toast.promise(
      fast,
      { loading: "Loading", success: "Done", error: "Failed" },
      { id: "fast-promise", delay: 150 },
    );
    await Promise.all([returned, fast]);
    const { promise: delay, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 180);
    await delay;
    return returned === source;
  });

  expect(result).toBe(true);
  await expect(page.getByText("Ready: report.csv")).toBeVisible();
  await expect(page.getByText("Download prepared")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open" })).toBeVisible();
  await expect(page.locator("#fast-promise")).toHaveCount(0);
});

test("isolates consumer failures and reports typed close reasons", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.toast("Safe callbacks", {
      id: "safe-callbacks",
      duration: 0,
      onClose: (_id, reason) => {
        document.body.dataset.closeReason = reason;
        throw new Error("consumer close failure");
      },
      onRemove: (_id, reason) => {
        document.body.dataset.removeReason = reason;
      },
    });
    window.toast.dismiss("safe-callbacks");
  });

  await expect(page.locator("body")).toHaveAttribute(
    "data-close-reason",
    "programmatic",
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-remove-reason",
    "programmatic",
  );
  await expect(page.locator("#safe-callbacks")).toHaveCount(0);
});

test("recovers safely when promise result mappers throw", async ({ page }) => {
  await page.evaluate(async () => {
    const source = Promise.resolve("value");
    window.toast.promise(
      source,
      {
        loading: "Mapping",
        success: () => {
          throw new Error("success mapper failed");
        },
        error: (error) => ({
          message: "Recovered mapper failure",
          description: error instanceof Error ? error.message : "Unknown",
        }),
      },
      { id: "mapper-recovery", duration: 0 },
    );
    await source;
  });

  await expect(page.getByText("Recovered mapper failure")).toBeVisible();
  await expect(page.getByText("success mapper failed")).toBeVisible();
  await expect(page.locator("#mapper-recovery")).toHaveAttribute(
    "data-type",
    "error",
  );
});

test("pauses timers manually and while the document is hidden", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.toast("Manual pause", { id: "manual-pause", duration: 120 });
    window.toast.pause("manual-pause");
  });
  await page.waitForTimeout(180);
  await expect(page.locator("#manual-pause")).toHaveAttribute(
    "data-hidden",
    "false",
  );
  await page.evaluate(() => window.toast.resume("manual-pause"));
  await expect(page.locator("#manual-pause")).toHaveAttribute(
    "data-hidden",
    "true",
  );

  await page.evaluate(() => {
    window.toast("Visibility pause", {
      id: "visibility-pause",
      duration: 120,
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(180);
  await expect(page.locator("#visibility-pause")).toHaveAttribute(
    "data-hidden",
    "false",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#visibility-pause")).toHaveAttribute(
    "data-hidden",
    "true",
  );
});

test("queues excess toasts and clears only the waiting queue", async ({
  page,
}) => {
  const cleared = await page.evaluate(() => {
    window.toast.configure({ maxToasts: 1, overflow: "queue" });
    window.toast("First", { id: "queue-first", duration: 0 });
    window.toast("Second", { id: "queue-second", duration: 0 });
    window.toast("Third", { id: "queue-third", duration: 0 });
    return window.toast.clearQueue();
  });

  expect(cleared).toBe(2);
  await expect(page.locator("#queue-first")).toHaveAttribute(
    "data-state",
    "visible",
  );
  await expect(page.locator("#queue-second")).toHaveCount(0);
  await expect(page.locator("#queue-third")).toHaveCount(0);
  expect(
    await page.evaluate(() => window.toast.getActive().map(({ id }) => id)),
  ).toEqual(["queue-first"]);
});

test("promotes queued toasts and starts their timers only when visible", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.toast.configure({ maxToasts: 1, overflow: "queue" });
    window.toast("Blocking", { id: "queue-blocking", duration: 0 });
    window.toast("Timed queued", { id: "queue-timed", duration: 100 });
  });
  await page.waitForTimeout(160);
  await expect(page.locator("#queue-timed")).toHaveAttribute(
    "data-state",
    "queued",
  );
  await expect(page.locator("#queue-timed")).toHaveAttribute(
    "data-hidden",
    "true",
  );

  await page.evaluate(() => window.toast.dismiss("queue-blocking"));
  await expect(page.locator("#queue-timed")).toHaveAttribute(
    "data-state",
    "visible",
  );
  await expect(page.locator("#queue-timed")).toHaveAttribute(
    "data-hidden",
    "true",
  );
});

test("applies explicit overflow discard policies", async ({ page }) => {
  const result = await page.evaluate(async (modulePath) => {
    const { createToaster } = await import(modulePath);
    const oldestContainer = document.createElement("ol");
    oldestContainer.id = "discard-oldest";
    document.body.appendChild(oldestContainer);
    const oldest = createToaster(oldestContainer, {
      maxToasts: 1,
      overflow: "discard-oldest",
    });
    oldest("Old", { id: "old", duration: 0 });
    oldest("New", { id: "new", duration: 0 });

    const newestContainer = document.createElement("ol");
    newestContainer.id = "discard-newest";
    document.body.appendChild(newestContainer);
    const newest = createToaster(newestContainer, {
      maxToasts: 1,
      overflow: "discard-newest",
    });
    newest("Keep", { id: "keep", duration: 0 });
    newest("Discard", { id: "discard", duration: 0 });
    return {
      oldest: oldest.getActive().map(({ id }: { id: string }) => id),
      newest: newest.getActive().map(({ id }: { id: string }) => id),
    };
  }, "/src/index.ts");

  expect(result.oldest).toEqual(["new"]);
  expect(result.newest).toEqual(["keep"]);
});

test("applies ordering and per-type defaults", async ({ page }) => {
  await page.evaluate(() => {
    window.toast.configure({
      maxToasts: 2,
      newestOnTop: false,
      defaults: {
        error: { closeButton: true, duration: 0, important: true },
      },
    });
    window.toast.error("First error", { id: "first-error" });
    window.toast.error("Second error", { id: "second-error" });
  });

  await expect(page.locator("#first-error")).toHaveAttribute(
    "data-front",
    "true",
  );
  await expect(page.locator("#first-error")).toHaveAttribute("role", "alert");
  await expect(page.locator("#first-error .sonner-toast-close")).toBeVisible();
});

test("supports named scoped toasters and deterministic teardown", async ({
  page,
}) => {
  const result = await page.evaluate(async (modulePath) => {
    const { createToaster, toast } = await import(modulePath);
    const container = document.createElement("ol");
    container.id = "alerts";
    document.body.appendChild(container);
    const alerts = createToaster(container, {
      id: "alerts",
      position: "top-left",
    });
    const first = alerts.error("Scoped alert", { duration: 0 });
    const second = toast.for("alerts").success("Routed alert", {
      duration: 0,
    });
    const third = toast.info("Config-routed alert", {
      toasterId: "alerts",
      duration: 0,
    });
    const activeBeforeDestroy = alerts.getActive().length;
    alerts.destroy();
    let destroyedError = "";
    try {
      alerts("After destroy");
    } catch (error) {
      destroyedError = error instanceof Error ? error.message : String(error);
    }
    return { first, second, third, activeBeforeDestroy, destroyedError };
  }, "/src/index.ts");

  expect(result.activeBeforeDestroy).toBe(3);
  expect(result.destroyedError).toContain("destroyed");
  await expect(page.locator("#alerts [data-sonner-toast]")).toHaveCount(0);
});

test("supports immediate removal, active checks, metadata, and bounded history", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    window.toast.configure({ historyLimit: 1 });
    window.toast("One", { id: "history-one", data: { source: "sync" } });
    const active = window.toast.isActive("history-one");
    const snapshot = window.toast.getActive()[0];
    const removed = window.toast.remove("history-one");
    window.toast("Two", { id: "history-two" });
    window.toast.remove("history-two");
    return {
      active,
      snapshot,
      removed,
      history: window.toast.getHistory(),
    };
  });

  expect(result.active).toBe(true);
  expect(result.snapshot?.data).toEqual({ source: "sync" });
  expect(result.removed).toBe(true);
  expect(result.history).toHaveLength(1);
  expect(result.history[0]?.id).toBe("history-two");
  await expect(page.locator("#history-one")).toHaveCount(0);
});

test("honors dismissibility, click dismissal, keyboard focus, and escape", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.toast("Pinned", {
      id: "pinned",
      closeButton: true,
      dismissible: false,
      closeOnClick: true,
      duration: 0,
    });
    window.toast("Keyboard", {
      id: "keyboard-toast",
      duration: 0,
    });
  });

  await expect(page.locator("#pinned .sonner-toast-close")).not.toBeVisible();
  await page.locator("#pinned").click();
  await expect(page.locator("#pinned")).toHaveAttribute("data-hidden", "false");

  await page.keyboard.press("Alt+t");
  await expect(page.locator("#keyboard-toast")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#keyboard-toast")).toHaveAttribute(
    "data-hidden",
    "true",
  );
});

test("dismisses with an accessible pointer swipe", async ({ page }) => {
  await page.evaluate(() => {
    window.toast("Swipe me", {
      id: "swipe-toast",
      duration: 0,
      swipeDirections: ["right"],
      swipeThreshold: 0.25,
      position: "top-left",
      onClose: (_id, reason) => {
        document.body.dataset.swipeReason = reason;
      },
    });
  });

  const toast = page.locator("#swipe-toast");
  await expect(toast).toHaveAttribute("data-mounted", "true");
  await expect
    .poll(async () => (await toast.boundingBox())?.y ?? -1)
    .toBeGreaterThan(0);
  const box = await toast.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width, box.y + box.height / 2, {
    steps: 4,
  });
  await page.mouse.up();

  await expect(toast).toHaveAttribute("data-hidden", "true");
  await expect(page.locator("body")).toHaveAttribute(
    "data-swipe-reason",
    "swipe",
  );
});

test("supports dedupe and before-create filtering", async ({ page }) => {
  const result = await page.evaluate(async (modulePath) => {
    const { createToaster } = await import(modulePath);
    const container = document.createElement("ol");
    container.id = "filtered";
    document.body.appendChild(container);
    const filtered = createToaster(container, {
      dedupe: "message",
      beforeCreate: (next: { message?: string }) => {
        if (next.message === "blocked") return false;
        if (next.message === "transformed") {
          return { ...next, id: "hook-target" };
        }
        return next;
      },
    });
    const first = filtered.info("duplicate", { duration: 0 });
    const second = filtered.info("duplicate", { duration: 0 });
    const target = filtered.info("initial", {
      id: "hook-target",
      duration: 0,
    });
    const transformed = filtered.info("transformed", { duration: 0 });
    filtered("blocked");
    return {
      first,
      second,
      target,
      transformed,
      active: filtered.getActive().length,
    };
  }, "/src/index.ts");

  expect(result.second).toBe(result.first);
  expect(result.transformed).toBe(result.target);
  expect(result.active).toBe(2);
  await expect(page.getByText("transformed")).toBeVisible();
  await expect(page.getByText("initial")).toHaveCount(0);
});

test("exposes stable parts, RTL logical positions, dense unstyled stacks, and safe offsets", async ({
  page,
}) => {
  await page.evaluate(async (modulePath) => {
    const { createToaster } = await import(modulePath);
    const container = document.createElement("ol");
    container.id = "rtl-toaster";
    container.dir = "rtl";
    document.body.appendChild(container);
    const rtl = createToaster(container, {
      position: "top-start",
      dense: true,
      unstyled: true,
      stack: "expand",
    });
    rtl("RTL toast", { id: "rtl-toast", duration: 0, progress: 0.5 });
  }, "/src/index.ts");

  const container = page.locator("#rtl-toaster");
  const toast = page.locator("#rtl-toast");
  await expect(container).toHaveAttribute("data-dense", "true");
  await expect(container).toHaveAttribute("data-stack", "expand");
  await expect(toast).toHaveAttribute("data-x-position", "right");
  await expect(toast).toHaveAttribute("data-expanded", "true");
  await expect(toast).toHaveAttribute("data-sonner-part", "toast");
  await expect(toast.locator('[data-sonner-part="content"]')).toHaveCount(1);
  await expect(toast.locator('[data-sonner-part="progress-bar"]')).toHaveCount(
    1,
  );
  await expect(toast).toHaveCSS("box-shadow", "none");
  await expect(toast).toHaveCSS("right", /^(12px|env\(|max\()/);
});
