const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

/* Keep the counter directly beneath the responsive, wrapping header. */
(() => {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const updateHeaderOffset = () => {
    document.documentElement.style.setProperty(
      "--site-header-height",
      `${Math.ceil(header.getBoundingClientRect().height)}px`
    );
  };

  updateHeaderOffset();
  window.addEventListener("resize", updateHeaderOffset);
  if ("ResizeObserver" in window) {
    new ResizeObserver(updateHeaderOffset).observe(header);
  }
})();

/* Scheduled teaching total. The 2,512 anchor includes Thursday 10 September
   2026, so the first new additions are Wednesday 16 and Thursday 17. */
(() => {
  const dayMilliseconds = 86400000;
  const anchorDay = Date.UTC(2026, 8, 10) / dayMilliseconds;
  const londonCalendar = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const numberFormat = new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1
  });

  function scheduledHours(now = new Date()) {
    const parts = Object.fromEntries(
      londonCalendar.formatToParts(now).map(part => [part.type, part.value])
    );
    const currentDay = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day)
    ) / dayMilliseconds;
    const elapsedDays = Math.max(0, currentDay - anchorDay);
    const occurrences = firstDay => elapsedDays < firstDay
      ? 0
      : 1 + Math.floor((elapsedDays - firstDay) / 7);

    return 2512 + (occurrences(6) * 4.5) + (occurrences(7) * 5.5);
  }

  function updateHoursTaught() {
    const value = numberFormat.format(scheduledHours());
    document.querySelectorAll("[data-hours-taught]").forEach(element => {
      element.textContent = value;
    });
  }

  updateHoursTaught();
  window.setInterval(updateHoursTaught, 15000);
  window.addEventListener("pageshow", updateHoursTaught);
  document.addEventListener("visibilitychange", updateHoursTaught);
  window.HookedOnBassHours = Object.freeze({ scheduledHours });
})();
