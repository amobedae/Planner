// ----- theme toggle (remembers your choice) -----
const root = document.documentElement;
const themeBtn = document.querySelector(".theme-toggle");

function currentTheme() {
  return root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
function paintThemeButton() {
  themeBtn.textContent = currentTheme() === "dark" ? "☀️" : "🌙";
}
themeBtn.addEventListener("click", () => {
  root.dataset.theme = currentTheme() === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("theme", root.dataset.theme);
  } catch {}
  paintThemeButton();
});
paintThemeButton();

// ----- mobile menu -----
const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");
menuBtn.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open);
});
navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") navLinks.classList.remove("open");
});

// ----- typing effect -----
const typed = document.querySelector(".typed");
const words = typed.dataset.words.split(",");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduceMotion) {
  typed.textContent = words[0];
} else {
  let w = 0;
  let i = 0;
  let deleting = false;
  (function tick() {
    const word = words[w];
    i += deleting ? -1 : 1;
    typed.textContent = word.slice(0, i);
    let delay = deleting ? 45 : 90;
    if (!deleting && i === word.length) {
      deleting = true;
      delay = 1600;
    } else if (deleting && i === 0) {
      deleting = false;
      w = (w + 1) % words.length;
      delay = 300;
    }
    setTimeout(tick, delay);
  })();
}

// ----- project filters -----
const chips = document.querySelectorAll(".chip");
const projects = document.querySelectorAll(".project");
chips.forEach((chip) =>
  chip.addEventListener("click", () => {
    chips.forEach((c) => c.classList.toggle("active", c === chip));
    const f = chip.dataset.filter;
    projects.forEach((p) => p.classList.toggle("hidden", f !== "all" && !p.dataset.tags.includes(f)));
  }),
);

// ----- reveal sections + highlight the current nav link -----
const sections = document.querySelectorAll(".section");
const links = document.querySelectorAll(".nav-links a");
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("visible");
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id));
    }
  },
  { threshold: 0.25 },
);
sections.forEach((s) => observer.observe(s));

document.getElementById("year").textContent = new Date().getFullYear();
