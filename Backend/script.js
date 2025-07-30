const state = {
  allMovies: [],
  seenMovies: [],
  genreMap: {},
};

// ---------- FUNCIONES PURAS ----------

const getFavoriteGenres = (movies) =>
  movies.reduce((acc, movie) => {
    movie.genres.forEach(g => {
      acc[g] = (acc[g] || 0) + 1;
    });
    return acc;
  }, {});

const getTopGenres = (genreCount, topN = 6) =>
  Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([genre]) => genre);

const recommendMovies = (() => {
  let cache = new Map();
  return (all, seen) => {
    const key = seen.map(m => m.id).sort().join(",");
    if (cache.has(key)) return cache.get(key);

    const genreCount = getFavoriteGenres(seen);
    const topGenres = getTopGenres(genreCount);

    const recs = all.filter(
      m => m.genres.some(g => topGenres.includes(g)) &&
           !seen.some(s => s.id === m.id)
    );

    cache.set(key, recs);
    return recs;
  };
})();

// ---------- FUNCIONES DE ESTADO Y EFECTOS ----------

const updateState = (key, value) => {
  state[key] = value;
  renderApp();
};

const markAsSeen = (id) => {
  const movie = state.allMovies.find(m => m.id === id);
  if (!state.seenMovies.some(m => m.id === id)) {
    const updated = [...state.seenMovies, movie];
    localStorage.setItem("seenMovies", JSON.stringify(updated));
    updateState("seenMovies", updated);
  }
};

const clearHistory = () => {
  localStorage.removeItem("seenMovies");
  updateState("seenMovies", []);
};

const loadSeenMovies = () =>
  JSON.parse(localStorage.getItem("seenMovies") || "[]");

// ---------- FETCH Y FORMATEO ----------

const fetchGenres = async () => {
  const res = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=1a16dfaf060dd5e669acadd2de432515&language=es-MX`);
  const data = await res.json();
  return data.genres.reduce((acc, g) => {
    acc[g.id] = g.name;
    return acc;
  }, {});
};

const fetchPopularAndTrending = async (genreMap) => {
  const urls = [
    `https://api.themoviedb.org/3/movie/popular?api_key=1a16dfaf060dd5e669acadd2de432515&language=es-MX&page=1`,
    `https://api.themoviedb.org/3/trending/movie/week?api_key=1a16dfaf060dd5e669acadd2de432515&language=es-MX`
  ];

  const results = await Promise.all(urls.map(url => fetch(url).then(res => res.json())));
  const combined = [...results[0].results, ...results[1].results];

  const uniqueMovies = Array.from(new Map(
    combined.map(m => [m.id, m])
  ).values());

  return uniqueMovies.map(movie => ({
    id: movie.id,
    title: movie.title,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : "",
    genres: movie.genre_ids.map(id => genreMap[id] || "Desconocido")
  }));
};



const searchMovies = async (query, genreMap) => {
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=1a16dfaf060dd5e669acadd2de432515&language=es-MX&query=${encodeURIComponent(query)}&page=1`);
  const data = await res.json();
  return data.results.map(movie => ({
    id: movie.id,
    title: movie.title,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : "",
    genres: movie.genre_ids.map(id => genreMap[id] || "Desconocido")
  }));
};

// ---------- RENDER DECLARATIVO ----------

const createMovieCard = (movie, showButton = false) => {
  const div = document.createElement("div");
  div.className = "movie";
  div.innerHTML = `
    <img src="${movie.poster}" alt="${movie.title}" />
    <p><strong>${movie.title}</strong></p>
    <p><em>Géneros:</em> ${movie.genres.join(', ')}</p>
  `;

  if (showButton) {
    const btn = document.createElement("button");
    btn.textContent = "Ya la vi";
    btn.addEventListener("click", () => markAsSeen(movie.id));
    div.appendChild(btn);
  }

  return div;
};

const renderSection = (id, movies, showButton = false) => {
  const container = document.getElementById(id);
  container.innerHTML = "";
  movies.forEach(movie => container.appendChild(createMovieCard(movie, showButton)));
};

const renderApp = () => {
  renderSection("movie-list", state.allMovies, true);
  renderSection("seen-list", state.seenMovies);
  renderSection("recommended-list", recommendMovies(state.allMovies, state.seenMovies));
};



// ---------- INICIALIZACIÓN Y EVENTOS ----------

document.getElementById("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;

  window.location.href = `resultados.html?query=${encodeURIComponent(query)}`;
});

document.getElementById("clear-history").addEventListener("click", clearHistory);

const init = async () => {
  const genreMap = await fetchGenres();
  const popular = await fetchPopularAndTrending(genreMap);
  const seen = loadSeenMovies();

  state.genreMap = genreMap;
  state.allMovies = popular;
  state.seenMovies = seen;

  renderApp();
};

init();
