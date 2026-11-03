/**
 * Utility functions for client-side Web / Push Notifications management.
 */

export function dismissExpenseNotification(slipOrExpenseId: string) {
  if (typeof window === "undefined") return;

  const rawId = slipOrExpenseId.replace(/^apt-exp-/, "").replace(/^apt-inst-/, "");
  const targetTags = [
    `expense-${slipOrExpenseId}`,
    `expense-${rawId}`,
    `apt-exp-${rawId}`,
    `apt-inst-${rawId}`,
  ];

  // 1. Close via ServiceWorker registration if available
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        return reg.getNotifications();
      })
      .then((notifications) => {
        notifications.forEach((notification) => {
          const matchTag = targetTags.includes(notification.tag);
          const matchData =
            notification.data &&
            (notification.data.slipId === slipOrExpenseId ||
              notification.data.slipId === rawId ||
              notification.data.id === slipOrExpenseId ||
              notification.data.id === rawId ||
              (Array.isArray(notification.data.slipIds) &&
                (notification.data.slipIds.includes(slipOrExpenseId) ||
                  notification.data.slipIds.includes(rawId))));

          if (matchTag || matchData) {
            try {
              notification.close();
            } catch {}
          }
        });
      })
      .catch((err) => {
        console.warn("[dismissExpenseNotification] error closing notifications:", err);
      });
  }

  // 2. Clean up from localStorage notified list if present today
  try {
    const today = new Date();
    const todayStr =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");
    const storageKey = `notified_expenses_${todayStr}`;
    const notifiedRaw = localStorage.getItem(storageKey);
    if (notifiedRaw) {
      const notifiedIds: string[] = JSON.parse(notifiedRaw);
      const filtered = notifiedIds.filter(
        (id) => id !== slipOrExpenseId && id !== rawId
      );
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    }
  } catch {}
}
