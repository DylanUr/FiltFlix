const API_KEY = "1a16dfaf060dd5e669acadd2de432515";
const GENRE_URL = `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=es-MX`;
const API_URL = `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=es-MX&page=1`;
const SEARCH_URL = (query) =>
  `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=es-MX&query=${encodeURIComponent(query)}&page=1&include_adult=false`;

// ------------------ UTILIDADES DE ALMACENAMIENTO ------------------
const saveAllMovies = (movies) => {
  localStorage.setItem("allMovies", JSON.stringify(movies));
};

const loadAllMovies = () => {
  const data = localStorage.getItem("allMovies");
  return data ? JSON.parse(data) : [];
};

const saveHistory = (history) => {
  localStorage.setItem("seenMovies", JSON.stringify(history));
};

const loadHistory = () => {
  const data = localStorage.getItem("seenMovies");
  return data ? JSON.parse(data) : [];
};

// ------------------ VARIABLES GLOBALES ------------------
let allMovies = loadAllMovies();
let popularMovies = [];
let genreMap = {};
let userHistory = loadHistory();

// ------------------ FUNCIONES DE API ------------------
const fetchGenres = async () => {
  const res = await fetch(GENRE_URL);
  const data = await res.json();
  const map = {};
  data.genres.forEach(g => {
    map[g.id] = g.name;
  });
  return map;
};

const fetchPopularMovies = async (genreMap) => {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const movies = data.results.map(movie => ({
      id: movie.id,
      title: movie.title,
      poster: `https://image.tmdb.org/t/p/w200${movie.poster_path}`,
      genres: (movie.genre_ids || []).map(id => genreMap[id] || "Desconocido")
    }));

    popularMovies = movies;
    return movies;
  } catch (error) {
    console.error("Error al obtener películas:", error);
    return [];
  }
};

const searchMovies = async (query, genreMap) => {
  if (!query) return [];

  try {
    const res = await fetch(SEARCH_URL(query));
    const data = await res.json();
    return data.results.map(movie => ({
      id: movie.id,
      title: movie.title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : '',
      genres: (movie.genre_ids || []).map(id => genreMap[id] || "Desconocido")
    }));
  } catch (error) {
    console.error("Error en búsqueda:", error);
    return [];
  }
};

// ------------------ FUNCIONES DE RENDER ------------------
const renderMovies = (movies) => {
  const container = document.getElementById("movie-list");
  container.innerHTML = movies.map(movie => `
    <div class="movie">
      <img src="${movie.poster}" alt="${movie.title}" />
      <p><strong>${movie.title}</strong></p>
      <p><em>Géneros:</em> ${movie.genres.join(', ')}</p>
      <button onclick="markMovieAsSeen(${movie.id})">Ya la vi</button>
    </div>
  `).join("");
};

const renderSeenMovies = (movies) => {
  const container = document.getElementById("seen-list");
  container.innerHTML = movies.map(movie => `
    <div class="movie">
      <img src="${movie.poster}" alt="${movie.title}" />
      <p><strong>${movie.title}</strong></p>
      <p><em>Géneros:</em> ${movie.genres.join(', ')}</p>
    </div>
  `).join("");
};

const renderRecommended = (movies) => {
  const container = document.getElementById("recommended-list");
  container.innerHTML = movies.map(m => `
    <div class="movie">
      <img src="${m.poster}" alt="${m.title}" />
      <p><strong>${m.title}</strong></p>
      <p><em>Géneros:</em> ${m.genres.join(', ')}</p>
    </div>
  `).join("");
};

// ------------------ FUNCIONALIDAD PRINCIPAL ------------------
const getFavoriteGenres = (movies) => {
  const count = {};
  movies.forEach(m => {
    m.genres.forEach(g => {
      count[g] = (count[g] || 0) + 1;
    });
  });
  return count;
};

const getTopGenres = (genreCount, topN = 2) => {
  return Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([genre]) => genre);
};

const getRecommendedMovies = (allMovies, seenMovies) => {
  const genreCount = getFavoriteGenres(seenMovies);
  const topGenres = getTopGenres(genreCount, 2);

  return allMovies.filter(movie => {
    const hasTopGenre = movie.genres.some(g => topGenres.includes(g));
    const alreadySeen = seenMovies.some(s => s.id === movie.id);
    return hasTopGenre && !alreadySeen;
  });
};

const markMovieAsSeen = (id) => {
  const movie = allMovies.find(m => m.id === id);
  if (!userHistory.some(m => m.id === id)) {
    userHistory.push(movie);
    saveHistory(userHistory);
    renderSeenMovies(userHistory);
    renderRecommended(getRecommendedMovies(allMovies, userHistory));
  }
};

const clearHistory = () => {
  userHistory = [];
  localStorage.removeItem("seenMovies");
  renderSeenMovies(userHistory);
  renderRecommended(getRecommendedMovies(allMovies, userHistory));
};

document.getElementById("clear-history").addEventListener("click", clearHistory);

document.getElementById("search-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;

  const results = await searchMovies(query, genreMap);

  results.forEach(movie => {
    if (!allMovies.some(m => m.id === movie.id)) {
      allMovies.push(movie);
    }
  });

  saveAllMovies(allMovies);
  renderMovies(results);
  renderRecommended(getRecommendedMovies(allMovies, userHistory));
});

// ------------------ INICIALIZAR APP ------------------
const initApp = async () => {
  try {
    genreMap = await fetchGenres();
    const popular = await fetchPopularMovies(genreMap);
    const saved = loadAllMovies();

    const combined = [...popular];
    saved.forEach(m => {
      if (!combined.some(pm => pm.id === m.id)) {
        combined.push(m);
      }
    });

    allMovies = combined;
    saveAllMovies(allMovies);

    renderMovies(popular);
    renderSeenMovies(userHistory);
    renderRecommended(getRecommendedMovies(allMovies, userHistory));
  } catch (err) {
    console.error("Error al iniciar la app:", err);
  }
};

initApp();
