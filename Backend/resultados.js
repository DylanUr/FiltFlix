const API_KEY = "1a16dfaf060dd5e669acadd2de432515";
const GENRE_URL = `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=es-MX`;

const getGenres = async () => {
  const res = await fetch(GENRE_URL);
  const data = await res.json();
  return data.genres.reduce((acc, g) => ({ ...acc, [g.id]: g.name }), {});
};

const getQuery = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("query") || "";
};

const searchMovies = async (query, genreMap) => {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=es-MX&query=${encodeURIComponent(query)}&page=1`
  );
  const data = await res.json();
  return data.results.map(movie => ({
    id: movie.id,
    title: movie.title,
    poster: movie.poster_path
      ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
      : "https://via.placeholder.com/200x300?text=Sin+imagen",
    genres: movie.genre_ids.map(id => genreMap[id] || "Desconocido"),
  }));
};

const renderResults = (movies) => {
  const container = document.getElementById("results-list");
  container.innerHTML = "";

  if (movies.length === 0) {
    container.innerHTML = "<p>No se encontraron resultados.</p>";
    return;
  }

  movies.forEach(m => {
    const div = document.createElement("div");
    div.className = "movie";
    div.innerHTML = `
      <img src="${m.poster}" alt="${m.title}">
      <p><strong>${m.title}</strong></p>
      <p><em>Géneros:</em> ${m.genres.join(", ")}</p>
    `;

    const btn = document.createElement("button");
    btn.textContent = "Ya la vi";
    btn.addEventListener("click", () => markAsSeen(m));

    div.appendChild(btn);
    container.appendChild(div);
  });
};

const markAsSeen = (movie) => {
  const history = JSON.parse(localStorage.getItem("seenMovies") || "[]");
  if (!history.some(m => m.id === movie.id)) {
    const updated = [...history, movie];
    localStorage.setItem("seenMovies", JSON.stringify(updated));
  } else {
  }
};


(async () => {
  const query = getQuery();
  if (!query) {
    document.getElementById("results-list").innerHTML = "<p>No se encontró nada.</p>";
    return;
  }

  const genres = await getGenres();
  const movies = await searchMovies(query, genres);
  renderResults(movies);
})();
