const peopleData = [
  {
    id: "bunin",
    name: "Иван Бунин",
    role: "писатель, лауреат Нобелевской премии",
    place: "Воронеж",
    coords: [51.6608, 39.2003],
    note: "Будущий классик русской литературы родился в Воронеже в 1870 году.",
  },
  {
    id: "platonov",
    name: "Андрей Платонов",
    role: "писатель и мыслитель",
    place: "Воронеж",
    coords: [51.6608, 39.2003],
    note: "Автор прозы о человеке и эпохе, прославивший Воронеж на всю страну.",
  },
  {
    id: "marshak",
    name: "Самуил Маршак",
    role: "поэт и переводчик",
    place: "Воронеж",
    coords: [51.6608, 39.2003],
    note: "Один из главных детских писателей XX века.",
  },
  {
    id: "basov",
    name: "Николай Басов",
    role: "физик, Нобелевский лауреат",
    place: "Воронеж",
    coords: [51.6608, 39.2003],
    note: "Лауреат Нобелевской премии за работы в области квантовой электроники.",
  },
  {
    id: "feoktistov",
    name: "Константин Феоктистов",
    role: "инженер и космонавт",
    place: "Воронеж",
    coords: [51.6608, 39.2003],
    note: "Один из создателей космических кораблей и участник полёта «Восход-1».",
  },
  {
    id: "koltsov",
    name: "Алексей Кольцов",
    role: "поэт",
    place: "Воронеж",
    coords: [51.6608, 39.2003],
    note: "Основоположник лирики о жизни простого народа.",
  },
  {
    id: "nikitin",
    name: "Иван Никитин",
    role: "поэт",
    place: "Воронеж",
    coords: [51.6608, 39.2003],
    note: "Поэт-реалист, чьи строки связаны с историей города.",
  },
  {
    id: "venevitinov",
    name: "Дмитрий Веневитинов",
    role: "поэт и философ",
    place: "Новоживотинное",
    coords: [51.7917, 39.0833],
    note: "Представитель кружка философов, родился в дворянской усадьбе области.",
  },
  {
    id: "cherenkov",
    name: "Павел Черенков",
    role: "физик, Нобелевский лауреат",
    place: "Новая Чигла",
    coords: [51.225, 40.495],
    note: "Открыл эффект, ставший основой современного детектора излучения.",
  },
  {
    id: "peskov",
    name: "Василий Песков",
    role: "журналист и путешественник",
    place: "Орлово",
    coords: [51.728, 39.3006],
    note: "Популяризатор науки и природы, автор " +
      "очерков о родных местах.",
  },
];

const map = L.map("map", {
  scrollWheelZoom: false,
}).setView([51.6608, 39.2003], 7.5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 12,
  minZoom: 6,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const markers = new Map();
const listContainer = document.getElementById("people");
const searchInput = document.getElementById("search");
const pointsCount = document.getElementById("points-count");
const filterCount = document.getElementById("filter-count");

function buildPopup(person) {
  return `
    <div class="popup">
      <strong>${person.name}</strong><br />
      <span>${person.role}</span><br />
      <span>${person.place}</span>
    </div>
  `;
}

function createMarker(person) {
  const marker = L.circleMarker(person.coords, {
    radius: 8,
    color: "#38bdf8",
    weight: 2,
    fillColor: "#38bdf8",
    fillOpacity: 0.8,
  }).addTo(map);

  marker.bindPopup(buildPopup(person));
  marker.on("click", () => selectPerson(person.id));

  markers.set(person.id, marker);
}

function renderList(people) {
  listContainer.innerHTML = "";

  if (!people.length) {
    listContainer.innerHTML =
      '<p class="muted">Ничего не найдено. Попробуйте другое имя.</p>';
    return;
  }

  people.forEach((person) => {
    const card = document.createElement("article");
    card.className = "person-card";
    card.dataset.id = person.id;
    card.innerHTML = `
      <h3>${person.name}</h3>
      <p>${person.role}</p>
      <p>${person.place}</p>
      <p>${person.note}</p>
    `;

    card.addEventListener("click", () => {
      selectPerson(person.id);
      const marker = markers.get(person.id);
      if (marker) {
        marker.openPopup();
        map.setView(marker.getLatLng(), 8.5, { animate: true });
      }
    });

    listContainer.appendChild(card);
  });
}

function selectPerson(id) {
  document.querySelectorAll(".person-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.id === id);
  });
}

function applyFilter() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = peopleData.filter((person) => {
    const haystack = `${person.name} ${person.place} ${person.role}`.toLowerCase();
    return haystack.includes(query);
  });

  markers.forEach((marker, id) => {
    if (filtered.some((person) => person.id === id)) {
      marker.addTo(map);
    } else {
      marker.remove();
    }
  });

  renderList(filtered);
  filterCount.textContent = filtered.length.toString();
}

peopleData.forEach((person) => createMarker(person));
pointsCount.textContent = peopleData.length.toString();
filterCount.textContent = peopleData.length.toString();
renderList(peopleData);

searchInput.addEventListener("input", applyFilter);
