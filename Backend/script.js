// ---------- ESTADO GLOBAL ----------
const state = {
  allMovies: [],      // Todas las películas disponibles
  seenMovies: [],     // Películas marcadas como vistas por el usuario
  genreMap: {},       // Mapeo de id de género a nombre de género
};

// ---------- FUNCIONES PURAS ----------

// Calcula la cantidad de veces que aparece cada género en las películas vistas
const getFavoriteGenres = (movies) => //pura, inmutable; recibe array, devuelve un objeto sin efectos secundarios,
  movies.reduce((acc, movie) => {     //crean nuevos objetos y arrays sin mutar parámetros.
    movie.genres.forEach(g => {       //de orden superior, usa reduce y dentro forEach.
      acc[g] = (acc[g] || 0) + 1;
    });
    return acc;
  }, {});

// Devuelve los géneros más frecuentes 
const getTopGenres = (genreCount, topN = 6) => //recibe objeto, devuelve array nuevo sin modificar nada externo.
  Object.entries(genreCount)                   //de orden superior, usa Object.entries.
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([genre]) => genre);

// Recomienda películas basadas en los géneros favoritos del usuario
const recommendMovies = (() => { // casi pura, pero tiene memoización con cache interna, que es un efecto colateral controlado.
  let cache = new Map();         // de orden superior, usa funciones como map, filter, some
  return (all, seen) => {        // usa memoización para evitar cálculos repetidos, mediante un closure con cache de tipo Map
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

// Actualiza el estado global y vuelve a renderizar la app
const updateState = (key, value) => {
  state[key] = value;
  renderApp();
};

// Marca una película como vista y la guarda en localStorage
const markAsSeen = (id) => { // inmutable, modifica el estado global y localStorage.
  const movie = state.allMovies.find(m => m.id === id);
  if (!state.seenMovies.some(m => m.id === id)) {
    const updated = [...state.seenMovies, movie];
    localStorage.setItem("seenMovies", JSON.stringify(updated));
    updateState("seenMovies", updated);
  }
};

// Limpia el historial de películas vistas
const clearHistory = () => {
  localStorage.removeItem("seenMovies");
  updateState("seenMovies", []);
};

// Carga las películas vistas desde localStorage
const loadSeenMovies = () =>
  JSON.parse(localStorage.getItem("seenMovies") || "[]");

// ---------- FETCH Y FORMATEO ----------

// Obtiene el mapeo de géneros desde la API
const fetchGenres = async () => { // pura, async retornan datos sin modificar estado externo.
  const res = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=1a16dfaf060dd5e669acadd2de432515&language=es-MX`);
  const data = await res.json();
  return data.genres.reduce((acc, g) => {
    acc[g.id] = g.name;
    return acc;
  }, {});
};

// Obtiene películas populares y en tendencia, y las formatea
const fetchPopularAndTrending = async (genreMap) => { // pura, async retorna datos sin modificar estado externo.
  const urls = [
    `https://api.themoviedb.org/3/movie/popular?api_key=1a16dfaf060dd5e669acadd2de432515&language=es-MX&page=1`,
    `https://api.themoviedb.org/3/trending/movie/week?api_key=1a16dfaf060dd5e669acadd2de432515&language=es-MX`
  ];

  const results = await Promise.all(urls.map(url => fetch(url).then(res => res.json())));
  const combined = [...results[0].results, ...results[1].results];

  // Elimina duplicados por id
  const uniqueMovies = Array.from(new Map(
    combined.map(m => [m.id, m])
  ).values());

  // Formatea las películas
  return uniqueMovies.map(movie => ({
    id: movie.id,
    title: movie.title,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : "",
    genres: movie.genre_ids.map(id => genreMap[id] || "Desconocido")
  }));
};

// Busca películas por texto y las formatea
const searchMovies = async (query, genreMap) => { // pura, async retorna datos sin modificar estado externo.
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

// Crea un elemento de tarjeta de película
const createMovieCard = (movie, showButton = false) => { // pura, retorna un elemento DOM sin efectos secundarios.
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

// Renderiza una sección de películas en el DOM
const renderSection = (id, movies, showButton = false) => { // pura, actualiza el DOM sin efectos secundarios externos.
  const container = document.getElementById(id);
  container.innerHTML = "";
  movies.forEach(movie => container.appendChild(createMovieCard(movie, showButton)));
};

// Renderiza toda la aplicación
const renderApp = () => { // pura, actualiza el DOM sin efectos secundarios externos.
  renderSection("movie-list", state.allMovies, true);
  renderSection("seen-list", state.seenMovies);
  renderSection("recommended-list", recommendMovies(state.allMovies, state.seenMovies));
};

// ---------- INICIALIZACIÓN Y EVENTOS ----------

// Maneja el evento de búsqueda
document.getElementById("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;

  window.location.href = `resultados.html?query=${encodeURIComponent(query)}`;
});

// Maneja el evento para limpiar el historial
document.getElementById("clear-history").addEventListener("click", clearHistory);

// Inicializa la aplicación: carga géneros, películas y películas vistas
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
