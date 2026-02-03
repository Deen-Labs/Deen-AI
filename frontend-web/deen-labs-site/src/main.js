const loader = document.getElementById("loader");

window.addEventListener("load", () => {
  // Delay keeps the animation visible even on fast connections.
  setTimeout(() => loader.classList.add("is-hidden"), 900);
});
