const form = document.getElementById("availability-form");
const formStatus = document.getElementById("form-status");
const slotsContainer = document.getElementById("slots");
const suggestionsContainer = document.getElementById("suggestions");

async function fetchSlots() {
  const response = await fetch("/api/slots");
  return response.json();
}

async function fetchSuggestions() {
  const response = await fetch("/api/suggestions");
  return response.json();
}

function renderSlots(slots) {
  slotsContainer.innerHTML = "";

  if (!slots.length) {
    slotsContainer.innerHTML =
      "<p class=\"muted\">Пока нет доступности. Добавьте первую запись.</p>";
    return;
  }

  slots
    .slice()
    .reverse()
    .forEach((slot) => {
      const card = document.createElement("div");
      card.className = "slot";
      card.innerHTML = `
        <h3>${slot.name}</h3>
        <p>${slot.day}</p>
        <p>${slot.start} – ${slot.end} (${slot.timezone})</p>
        <p>${slot.notes || "Без комментариев"}</p>
      `;
      slotsContainer.appendChild(card);
    });
}

function renderSuggestions(suggestions) {
  suggestionsContainer.innerHTML = "";

  if (!suggestions.length) {
    suggestionsContainer.innerHTML =
      "<p class=\"muted\">Добавьте больше доступности, чтобы увидеть лучшие окна.</p>";
    return;
  }

  suggestions.forEach((suggestion) => {
    const card = document.createElement("div");
    card.className = "suggestion";
    card.innerHTML = `
      <div>
        <strong>${suggestion.day}</strong>
        <div class="muted">${suggestion.time}</div>
      </div>
      <span>${suggestion.count} игроков</span>
    `;
    suggestionsContainer.appendChild(card);
  });
}

async function refresh() {
  const [slots, suggestions] = await Promise.all([
    fetchSlots(),
    fetchSuggestions(),
  ]);
  renderSlots(slots);
  renderSuggestions(suggestions);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "Сохраняем...";

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  const response = await fetch("/api/slots", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    formStatus.textContent = error.error || "Ошибка сохранения.";
    return;
  }

  form.reset();
  formStatus.textContent = "Доступность сохранена!";
  await refresh();
});

refresh();
