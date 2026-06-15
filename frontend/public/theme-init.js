(function () {
  try {
    var d = document.documentElement;
    var b = document.body;
    var toxic = [
      "high-contrast",
      "offline-mode",
      "large-text",
      "reduce-motion",
      "compact-mode",
      "sidebar-collapsed",
      "notifications-enabled",
      "notification-sound-enabled",
    ];
    toxic.forEach(function (c) {
      d.classList.remove(c);
    });
    [
      "--jt-primary",
      "--jt-accent",
      "--primary-color",
      "--accent-color",
    ].forEach(function (v) {
      d.style.removeProperty(v);
    });
    var s = localStorage.getItem("theme") || "dark";
    if (s === "system") {
      s = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    d.classList.remove("light", "dark");
    b.classList.remove("light", "dark");
    d.classList.add(s);
    b.classList.add(s);
    if (s === "dark") {
      d.classList.add("dark");
    } else {
      d.classList.remove("dark");
    }
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) {
      m.setAttribute("content", s === "dark" ? "#111827" : "#ffffff");
    }
  } catch (e) {}
})();
