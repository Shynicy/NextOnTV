const state = {
  startDate: "",
  days: [],
  channels: [],
  matchFilterMode: "all", // 'all' | 'wishlist' | 'watched_movies' | 'watched_series'
  matchDay: "all",
  matchTimeSlot: "all",
  matchChannel: "",
  matchOnlyUnwatched: false,
  includeSky: false,
  streamStatusMode: "all", // 'all' | 'wishlist' | 'watching' | 'watched'
  streamPlatforms: new Set(), // empty = all platforms
  streamMediaType: "all", // 'all' | 'movie' | 'series'
  streamOnlyUnwatched: false,
  libStatus: "all",
  libType: "all",
  libSort: "az", // 'az' | 'za' | 'year_desc' | 'year_asc'
  libViewMode: "cards", // 'cards' | 'compact'
  libQuery: "",
  libraryItems: [],
  selectedLibraryIds: new Set(),
  matchesList: [],
  searchResults: [],
  modalSearchResults: [],
  selectedSearchIndices: new Set(),
  selectedModalIndices: new Set(),
  ignoreNextClickUntil: 0,
  exploreResults: [],
  exploreDay: "all",
  exploreMediaType: "all",
  exploreTimeSlot: "primetime",
  exploreChannel: "",
  exploreQuery: "",
  searchMediaType: "all", // 'all' | 'movie' | 'series'
  searchRawResults: [],
  searchLastQuery: "",
  reminders: [],
  mobileUrl: window.location.origin,
  publicUrl: "",
  syncCode: "shynicy_nextontv",
  isCloudMode: false,
};

const WEEKDAYS_IT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const MONTHS_IT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

// Built-in client-side sagas for 4G/5G direct search fallback
const SAGA_DEFINITIONS = [
  {
    id: "fast_furious",
    names: ["fast and furious", "fast & furious", "the fast and the furious", "fast furious", "f&f"],
  },
  {
    id: "harry_potter",
    names: ["harry potter", "harry poter", "potter"],
  },
  {
    id: "lotr",
    names: ["il signore degli anelli", "signore degli anelli", "lord of the rings", "lotr"],
  },
  {
    id: "pirates",
    names: ["pirati dei caraibi", "pirates of the caribbean", "la maledizione della prima luna"],
  },
  {
    id: "back_to_future",
    names: ["ritorno al futuro", "back to the future"],
  },
  {
    id: "rocky",
    names: ["rocky", "rocky balboa", "creed"],
  },
  {
    id: "bad_boys",
    names: ["bad boys", "bad boy"],
  },
];

const CLIENT_SAGAS = [
  { it: "Harry Potter e la pietra filosofale", orig: "Harry Potter and the Sorcerer's Stone", type: "movie", year: "2001", saga: "harry_potter", rank: 1, aliases: ["harry potter 1", "pietra filosofale"], poster: "https://m.media-amazon.com/images/M/MV5BNTU1MzgyMDMtMzBlZS00YzczLThmYWEtMjU3YmFlOWEyMjE1XkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Harry Potter e la camera dei segreti", orig: "Harry Potter and the Chamber of Secrets", type: "movie", year: "2002", saga: "harry_potter", rank: 2, aliases: ["harry potter 2", "camera dei segreti"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/b/b2/Harry_Potter_e_la_camera_dei_segreti.jpg/500px-Harry_Potter_e_la_camera_dei_segreti.jpg?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Harry Potter e il prigioniero di Azkaban", orig: "Harry Potter and the Prisoner of Azkaban", type: "movie", year: "2004", saga: "harry_potter", rank: 3, aliases: ["harry potter 3", "prigioniero di azkaban"], poster: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Prisoner_of_Azkaban_ARC.jpg/500px-Prisoner_of_Azkaban_ARC.jpg?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Harry Potter e il calice di fuoco", orig: "Harry Potter and the Goblet of Fire", type: "movie", year: "2005", saga: "harry_potter", rank: 4, aliases: ["harry potter 4", "calice di fuoco"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/1/17/Harry_Potter_e_il_calice_di_fuoco_%28film%29.jpg/500px-Harry_Potter_e_il_calice_di_fuoco_%28film%29.jpg?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Harry Potter e l'Ordine della Fenice", orig: "Harry Potter and the Order of the Phoenix", type: "movie", year: "2007", saga: "harry_potter", rank: 5, aliases: ["harry potter 5", "ordine della fenice"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/7/72/Harry_Potter_e_l%27Ordine_della_Fenice.png/500px-Harry_Potter_e_l%27Ordine_della_Fenice.png?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Harry Potter e il principe mezzosangue", orig: "Harry Potter and the Half-Blood Prince", type: "movie", year: "2009", saga: "harry_potter", rank: 6, aliases: ["harry potter 6", "principe mezzosangue"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/5/51/Harry_Potter_e_il_principe_mezzosangue_%28film%29.png/500px-Harry_Potter_e_il_principe_mezzosangue_%28film%29.png?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Harry Potter e i Doni della Morte - Parte 1", orig: "Harry Potter and the Deathly Hallows: Part 1", type: "movie", year: "2010", saga: "harry_potter", rank: 7, aliases: ["harry potter 7", "doni della morte 1", "doni della morte parte 1"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/2/2e/Harry_Potter_e_i_Doni_della_Morte_-_Parte_1_screenshot.jpeg/500px-Harry_Potter_e_i_Doni_della_Morte_-_Parte_1_screenshot.jpeg?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Harry Potter e i Doni della Morte - Parte 2", orig: "Harry Potter and the Deathly Hallows: Part 2", type: "movie", year: "2011", saga: "harry_potter", rank: 8, aliases: ["harry potter 8", "doni della morte 2", "doni della morte parte 2"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/2/2e/Harry_Potter_e_i_Doni_della_Morte_-_Parte_1_screenshot.jpeg/500px-Harry_Potter_e_i_Doni_della_Morte_-_Parte_1_screenshot.jpeg?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Fast and Furious", orig: "The Fast and the Furious", type: "movie", year: "2001", saga: "fast_furious", rank: 1, aliases: ["fast and furious 1", "fast & furious 1", "fast 1", "the fast and the furious", "the fast and the furious 1"], poster: "https://m.media-amazon.com/images/M/MV5BZGRiMDE1NTMtMThmZS00YjE4LWI1ODQtNjRkZGZlOTg2MGE1XkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "2 Fast 2 Furious", orig: "2 Fast 2 Furious", type: "movie", year: "2003", saga: "fast_furious", rank: 2, aliases: ["fast and furious 2", "fast & furious 2", "fast 2", "2fast2furious", "2 fast 2 furious"], poster: "https://m.media-amazon.com/images/M/MV5BOTQzYzEwNWMtOTAwYy00YWYwLWE1NTEtZTkxOGQxZTM0M2VhXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "The Fast and the Furious: Tokyo Drift", orig: "The Fast and the Furious: Tokyo Drift", type: "movie", year: "2006", saga: "fast_furious", rank: 3, aliases: ["fast and furious 3", "fast & furious 3", "fast 3", "tokyo drift"], poster: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/Tfatf-tokyodrift-logo.svg/500px-Tfatf-tokyodrift-logo.svg.png?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Fast & Furious - Solo parti originali", orig: "Fast & Furious", type: "movie", year: "2009", saga: "fast_furious", rank: 4, aliases: ["fast and furious 4", "fast & furious 4", "fast 4", "solo parti originali"], poster: "https://m.media-amazon.com/images/M/MV5BM2Y1YzhkNzUtMzhmZC00OTFkLWJjZDktMWYzZmQ0Y2Y5ODcwXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Fast & Furious 5", orig: "Fast Five", type: "movie", year: "2011", saga: "fast_furious", rank: 5, aliases: ["fast and furious 5", "fast & furious 5", "fast 5", "fast five"], poster: "https://m.media-amazon.com/images/M/MV5BMTUxNTk5MTE0OF5BMl5BanBnXkFtZTcwMjA2NzY3NA@@._V1_UX400_.jpg" },
  { it: "Fast & Furious 6", orig: "Fast & Furious 6", type: "movie", year: "2013", saga: "fast_furious", rank: 6, aliases: ["fast and furious 6", "fast & furious 6", "fast 6"], poster: "https://m.media-amazon.com/images/M/MV5BMTM3NTg2NDQzOF5BMl5BanBnXkFtZTcwNjc2NzQzOQ@@._V1_UX400_.jpg" },
  { it: "Fast & Furious 7", orig: "Furious 7", type: "movie", year: "2015", saga: "fast_furious", rank: 7, aliases: ["fast and furious 7", "fast & furious 7", "fast 7", "furious 7"], poster: "https://m.media-amazon.com/images/M/MV5BMTQxOTA2NDUzOV5BMl5BanBnXkFtZTgwNzY2MTMxMzE@._V1_UX400_.jpg" },
  { it: "Fast & Furious 8", orig: "The Fate of the Furious", type: "movie", year: "2017", saga: "fast_furious", rank: 8, aliases: ["fast and furious 8", "fast & furious 8", "fast 8", "the fate of the furious", "fate of the furious"], poster: "https://m.media-amazon.com/images/M/MV5BMjMxODI2NDM5Nl5BMl5BanBnXkFtZTgwNjgzOTk1MTI@._V1_UX400_.jpg" },
  { it: "Fast & Furious - Hobbs & Shaw", orig: "Fast & Furious Presents: Hobbs & Shaw", type: "movie", year: "2019", saga: "fast_furious", rank: 9, aliases: ["fast and furious hobbs and shaw", "hobbs and shaw", "hobbs & shaw"], poster: "https://m.media-amazon.com/images/M/MV5BNmU4OTA5NGYtMTFjMS00MzgxLWFjNTMtYjdlMThlYzc4M2M4XkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Fast & Furious 9 - The Fast Saga", orig: "F9: The Fast Saga", type: "movie", year: "2021", saga: "fast_furious", rank: 10, aliases: ["fast and furious 9", "fast & furious 9", "fast 9", "f9"], poster: "https://m.media-amazon.com/images/M/MV5BODJkMTQ5ZmQtNzQxYy00ZWNlLWI0ZGYtYjU1NzdiMjcyNDRmXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Fast X", orig: "Fast X", type: "movie", year: "2023", saga: "fast_furious", rank: 11, aliases: ["fast and furious 10", "fast & furious 10", "fast 10", "fast x"], poster: "https://m.media-amazon.com/images/M/MV5BYzEwZjczOTktYzU1OS00YjJlLTgyY2UtNWEzODBlN2RjZDEwXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Il Signore degli Anelli - La Compagnia dell'Anello", orig: "The Lord of the Rings: The Fellowship of the Ring", type: "movie", year: "2001", saga: "lotr", rank: 1, aliases: ["signore degli anelli 1", "compagnia dell anello"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/1/1b/Il_Signore_degli_Anelli_060.JPG/500px-Il_Signore_degli_Anelli_060.JPG?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Il Signore degli Anelli - Le due torri", orig: "The Lord of the Rings: The Two Towers", type: "movie", year: "2002", saga: "lotr", rank: 2, aliases: ["signore degli anelli 2", "due torri"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/5/5a/ISDA_Battaglia_del_Fosso_di_Helm.PNG/500px-ISDA_Battaglia_del_Fosso_di_Helm.PNG?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Il Signore degli Anelli - Il ritorno del re", orig: "The Lord of the Rings: The Return of the King", type: "movie", year: "2003", saga: "lotr", rank: 3, aliases: ["signore degli anelli 3", "ritorno del re"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/2/22/ISDA_Ultima_Battaglia.PNG/500px-ISDA_Ultima_Battaglia.PNG?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "La maledizione della prima luna", orig: "Pirates of the Caribbean: The Curse of the Black Pearl", type: "movie", year: "2003", saga: "pirates", rank: 1, aliases: ["pirati dei caraibi 1", "prima luna"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/e/ee/Piratideicaraibi_lamaledizionedellaprimaluna.jpg/500px-Piratideicaraibi_lamaledizionedellaprimaluna.jpg?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Pirati dei Caraibi - La maledizione del forziere fantasma", orig: "Pirates of the Caribbean: Dead Man's Chest", type: "movie", year: "2006", saga: "pirates", rank: 2, aliases: ["pirati dei caraibi 2", "forziere fantasma"], poster: "https://m.media-amazon.com/images/M/MV5BMTcwODc1MTMxM15BMl5BanBnXkFtZTYwMDg1NzY3._V1_UX400_.jpg" },
  { it: "Pirati dei Caraibi - Ai confini del mondo", orig: "Pirates of the Caribbean: At World's End", type: "movie", year: "2007", saga: "pirates", rank: 3, aliases: ["pirati dei caraibi 3", "ai confini del mondo"], poster: "https://m.media-amazon.com/images/M/MV5BMjIyNjkxNzEyMl5BMl5BanBnXkFtZTYwMjc3MDE3._V1_UX400_.jpg" },
  { it: "Pirati dei Caraibi - Oltre i confini del mare", orig: "Pirates of the Caribbean: On Stranger Tides", type: "movie", year: "2011", saga: "pirates", rank: 4, aliases: ["pirati dei caraibi 4", "oltre i confini del mare"], poster: "https://m.media-amazon.com/images/M/MV5BMjE5MjkwODI3Nl5BMl5BanBnXkFtZTcwNjcwMDk4NA@@._V1_UX400_.jpg" },
  { it: "Pirati dei Caraibi - La vendetta di Salazar", orig: "Pirates of the Caribbean: Dead Men Tell No Tales", type: "movie", year: "2017", saga: "pirates", rank: 5, aliases: ["pirati dei caraibi 5", "vendetta di salazar"], poster: "https://m.media-amazon.com/images/M/MV5BMTYyMTcxNzc5M15BMl5BanBnXkFtZTgwOTg2ODE2MTI@._V1_UX400_.jpg" },
  { it: "Ritorno al futuro", orig: "Back to the Future", type: "movie", year: "1985", saga: "back_to_future", rank: 1, aliases: ["ritorno al futuro 1", "back to the future 1"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/2/2d/Marty_e_DocEmmet.png/500px-Marty_e_DocEmmet.png?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Ritorno al futuro - Parte II", orig: "Back to the Future Part II", type: "movie", year: "1989", saga: "back_to_future", rank: 2, aliases: ["ritorno al futuro 2", "back to the future 2"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/7/71/Ritorno_al_futuro_2.jpg/500px-Ritorno_al_futuro_2.jpg?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Ritorno al futuro - Parte III", orig: "Back to the Future Part III", type: "movie", year: "1990", saga: "back_to_future", rank: 3, aliases: ["ritorno al futuro 3", "back to the future 3"], poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/6/60/Ritorno_al_futuro_3.jpg/500px-Ritorno_al_futuro_3.jpg?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Rocky", orig: "Rocky", type: "movie", year: "1976", saga: "rocky", rank: 1, aliases: ["rocky 1", "rocky i", "rocky balboa 1"], poster: "https://m.media-amazon.com/images/M/MV5BNTBkMjg2MjYtYTZjOS00YzQxLWEzZGQtZDAyNDAtZmZiAUY4Mzg2XkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Rocky II", orig: "Rocky II", type: "movie", year: "1979", saga: "rocky", rank: 2, aliases: ["rocky 2", "rocky ii", "rocky balboa 2"], poster: "https://m.media-amazon.com/images/M/MV5BMjA4NjQ1MTkxN15BMl5BanBnXkFtZTgwNTU5NzM2MDE@._V1_UX400_.jpg" },
  { it: "Rocky III", orig: "Rocky III", type: "movie", year: "1982", saga: "rocky", rank: 3, aliases: ["rocky 3", "rocky iii", "rocky balboa 3"], poster: "https://m.media-amazon.com/images/M/MV5BMTY0MDgwODU1OV5BMl5BanBnXkFtZTgwNjU5NzM2MDE@._V1_UX400_.jpg" },
  { it: "Rocky IV", orig: "Rocky IV", type: "movie", year: "1985", saga: "rocky", rank: 4, aliases: ["rocky 4", "rocky iv", "rocky balboa 4"], poster: "https://m.media-amazon.com/images/M/MV5BMTY2OTI5NTg4Nl5BMl5BanBnXkFtZTgwODU5NzM2MDE@._V1_UX400_.jpg" },
  { it: "Rocky V", orig: "Rocky V", type: "movie", year: "1990", saga: "rocky", rank: 5, aliases: ["rocky 5", "rocky v", "rocky balboa 5"], poster: "https://m.media-amazon.com/images/M/MV5BMTYwNDk2OTQxNV5BMl5BanBnXkFtZTgwNzU5NzM2MDE@._V1_UX400_.jpg" },
  { it: "Rocky Balboa", orig: "Rocky Balboa", type: "movie", year: "2006", saga: "rocky", rank: 6, aliases: ["rocky 6", "rocky vi", "rocky balboa"], poster: "https://m.media-amazon.com/images/M/MV5BNzg5ZjM1OGQtNmY3NS00MzkxLTg2ODQtY2Y4NzI0NTU2M2VlXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Creed - Nato per combattere", orig: "Creed", type: "movie", year: "2015", saga: "rocky", rank: 7, aliases: ["creed 1", "creed", "rocky 7", "rocky vii"], poster: "https://m.media-amazon.com/images/M/MV5BODg5NDM3ODUxN15BMl5BanBnXkFtZTgwNWQ0MzQ5NjE@._V1_UX400_.jpg" },
  { it: "Creed II", orig: "Creed II", type: "movie", year: "2018", saga: "rocky", rank: 8, aliases: ["creed 2", "creed ii", "rocky 8", "rocky viii"], poster: "https://m.media-amazon.com/images/M/MV5BYmEyNWZhNzctZTQzYS00NWVkLTg3MmQtZDU0NDZhY2VmNDRhXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Creed III", orig: "Creed III", type: "movie", year: "2023", saga: "rocky", rank: 9, aliases: ["creed 3", "creed iii", "rocky 9", "rocky ix"], poster: "https://m.media-amazon.com/images/M/MV5BYWY1ZDY4MmQtYjhiYS00N2QwLThkNGUtMmNiNmVhGFiZTk2XkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Bad Boys", orig: "Bad Boys", type: "movie", year: "1995", saga: "bad_boys", rank: 1, aliases: ["bad boys 1", "bad boys i"], poster: "https://upload.wikimedia.org/wikipedia/en/a/a8/Bad_Boys.jpg" },
  { it: "Bad Boys II", orig: "Bad Boys II", type: "movie", year: "2003", saga: "bad_boys", rank: 2, aliases: ["bad boys 2", "bad boys ii"], poster: "https://upload.wikimedia.org/wikipedia/en/f/f4/Bad_Boys_II_Official_Theatrical_Poster.png" },
  { it: "Bad Boys for Life", orig: "Bad Boys for Life", type: "movie", year: "2020", saga: "bad_boys", rank: 3, aliases: ["bad boys 3", "bad boys iii", "bad boys per sempre"], poster: "https://upload.wikimedia.org/wikipedia/en/9/90/Bad_Boys_for_Life_poster.jpg" },
  { it: "Bad Boys: Ride or Die", orig: "Bad Boys: Ride or Die", type: "movie", year: "2024", saga: "bad_boys", rank: 4, aliases: ["bad boys 4", "bad boys iv", "ride or die"], poster: "https://upload.wikimedia.org/wikipedia/en/8/8b/Bad_Boys_Ride_or_Die_%282024%29_poster.jpg" },
  { it: "Il Gladiatore", orig: "Gladiator", type: "movie", year: "2000", poster: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Il_gladiatore.png/500px-Il_gladiatore.png?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Deadpool & Wolverine", orig: "Deadpool & Wolverine", type: "movie", year: "2024", poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/a/ad/Deadpool_%26_Wolverine.png/500px-Deadpool_%26_Wolverine.png?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Law & Order - Unità vittime speciali", orig: "Law & Order: Special Victims Unit", type: "series", year: "1999", poster: "https://static.tvmaze.com/uploads/images/medium_portrait/1/4042.jpg" },
  { it: "Una mamma per amica", orig: "Gilmore Girls", type: "series", year: "2000", poster: "https://static.tvmaze.com/uploads/images/medium_portrait/4/11417.jpg" },
  { it: "E alla fine arriva mamma", orig: "How I Met Your Mother", type: "series", year: "2005", poster: "https://static.tvmaze.com/uploads/images/medium_portrait/235/589999.jpg" },
  { it: "Il Trono di Spade", orig: "Game of Thrones", type: "series", year: "2011", poster: "https://static.tvmaze.com/uploads/images/medium_portrait/190/476117.jpg" },
  { it: "La casa di carta", orig: "Money Heist", type: "series", year: "2017", poster: "https://static.tvmaze.com/uploads/images/medium_portrait/249/624264.jpg" },
  { it: "Buffy l'ammazzavampiri", orig: "Buffy the Vampire Slayer", type: "series", year: "1997", poster: "https://static.tvmaze.com/uploads/images/medium_portrait/1/4445.jpg" },
  { it: "I Simpson", orig: "The Simpsons", type: "series", year: "1989", poster: "https://static.tvmaze.com/uploads/images/medium_portrait/484/1211349.jpg" },
  { it: "L'ispettore Barnaby", orig: "Midsomer Murders", type: "series", year: "1997", poster: "https://thumb.wikimedia.org/wikipedia/it/thumb/0/01/L%27ispettore_Barnaby.png/500px-L%27ispettore_Barnaby.png?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail" },
  { it: "Supernatural", orig: "Supernatural", type: "series", year: "2005", poster: "https://static.tvmaze.com/uploads/images/medium_portrait/476/1191593.jpg" },
  { it: "NCIS - Unità anticrimine", orig: "NCIS", type: "series", year: "2003", poster: "https://static.tvmaze.com/uploads/images/medium_portrait/1/4763.jpg" },
  { it: "Ken il guerriero", orig: "Fist of the North Star", type: "series", year: "1984", aliases: ["ken il guerriero", "hokuto no ken", "fist of the north star"], poster: "https://static.tvmaze.com/uploads/images/medium_portrait/43/109033.jpg" },
  { it: "L'attacco dei giganti", orig: "Attack on Titan", type: "series", year: "2013", aliases: ["l attacco dei giganti", "attacco dei giganti", "shingeki no kyojin", "attack on titan"], poster: "https://static.tvmaze.com/uploads/images/medium_portrait/4/11919.jpg" },
  { it: "Lupin", orig: "Lupin", type: "series", year: "2021", aliases: ["lupin 2021", "lupin serie tv", "lupin netflix"], poster: "https://static.tvmaze.com/uploads/images/medium_portrait/646/1617244.jpg" },
  { it: "Lupin III", orig: "Lupin III", type: "series", year: "1971", aliases: ["lupin 3", "le avventure di lupin iii", "le avventure di lupin 3", "lupin prima serie"], poster: "https://static.tvmaze.com/uploads/images/medium_portrait/38/96191.jpg" },
  { it: "Le nuove avventure di Lupin III", orig: "Shin Rupan Sansei", type: "series", year: "1977", aliases: ["lupin giacca rossa", "lupin seconda serie"], poster: "https://m.media-amazon.com/images/M/MV5BMjA5MjYwNDktYzM5ZC00Y2UyLTg2ODQtY2Y4NzI0NTU2M2VlXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin, l'incorreggibile Lupin", orig: "Rupan Sansei: Part III", type: "series", year: "1984", aliases: ["lupin giacca rosa", "lupin terza serie"], poster: "https://m.media-amazon.com/images/M/MV5BMjA5MjYwNDktYzM5ZC00Y2UyLTg2ODQtY2Y4NzI0NTU2M2VlXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin e le profezie di Nostradamus", orig: "Lupin III - Kutabare! Nostradamus", type: "movie", year: "1995", aliases: ["le profezie di nostradamus", "profezie di nostradamus", "lupin nostradamus", "lupin iii le profezie di nostradamus", "lupin 3 le profezie di nostradamus", "farewell to nostradamus"], poster: "https://m.media-amazon.com/images/M/MV5BMDI1MDU2MjQtODEwNi00MTEwLTkwOTUtYWZjZWNkYWJlY2ZmXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin III - Il castello di Cagliostro", orig: "The Castle of Cagliostro", type: "movie", year: "1979", aliases: ["il castello di cagliostro", "castello di cagliostro", "cagliostro", "lupin cagliostro"], poster: "https://m.media-amazon.com/images/M/MV5BYjQwZWNkMTYtYTU2Ny00YzgyLTljYTMtNjc0MjRkNWY5NDM4XkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin III - La pietra della saggezza", orig: "The Mystery of Mamo", type: "movie", year: "1978", aliases: ["la pietra della saggezza", "pietra della saggezza", "mystery of mamo"], poster: "https://m.media-amazon.com/images/M/MV5BMTkzM2E4YjUtYmQ4Yi00NWZmLThiYmYtZjhhNzk3OGRhMjBlXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin III - La leggenda dell'oro di Babilonia", orig: "Legend of the Gold of Babylon", type: "movie", year: "1985", aliases: ["oro di babilonia", "babilonia", "la leggenda dell oro di babilonia"], poster: "https://m.media-amazon.com/images/M/MV5BYTQ4YmVjNTctYTE2MS00NTUyLWE0MjMtOTFkMDQ1NGE2OTU4XkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin III - La cospirazione dei Fuma", orig: "The Fuma Conspiracy", type: "movie", year: "1987", aliases: ["cospirazione dei fuma", "fuma"], poster: "https://m.media-amazon.com/images/M/MV5BYTAwZWRmZjktMGU4MC00Zjk5LWI4YWUtMjE4MDdmMjBhYThkXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin III - Trappola mortale", orig: "Lupin III: Dead or Alive", type: "movie", year: "1996", aliases: ["trappola mortale", "dead or alive"], poster: "https://m.media-amazon.com/images/M/MV5BMzRlZDRkMzEtODgzNi00ZGQ4LWIwMDgtMzY0YWE5NzU2MTA2XkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin III - The First", orig: "Lupin III: The First", type: "movie", year: "2019", aliases: ["the first", "lupin the first"], poster: "https://m.media-amazon.com/images/M/MV5BM2UwMjlmZWEtZjBiMi00ZmJmLTg1MDAtOWQ4NjFjMTY5MzhkXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin the Third - La donna chiamata Fujiko Mine", orig: "The Woman Called Fujiko Mine", type: "series", year: "2012", aliases: ["la donna chiamata fujiko mine", "fujiko mine"], poster: "https://m.media-amazon.com/images/M/MV5BYmY2ODI1YTYtZDQ4Zi00NDU0LWFkMzktOGEyMzJjYzU0OTc0XkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin III vs Detective Conan", orig: "Lupin the 3rd vs Detective Conan: The Movie", type: "movie", year: "2013", aliases: ["lupin vs detective conan", "lupin conan", "lupin terzo vs detective conan"], poster: "https://m.media-amazon.com/images/M/MV5BNDRlNmFjMzYtMDYzZi00NDI4LWE1MDItZGJmNmEwZTRhOWFhXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin III - Green vs Red", orig: "Lupin III: Green vs. Red", type: "movie", year: "2008", aliases: ["green vs red", "lupin green vs red"], poster: "https://m.media-amazon.com/images/M/MV5BZDk5NDRlNDMtNGNiNy00ZjZkLWI2NGEtMjM5ZDliNGJjNjBmXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin III - Walther P38", orig: "Lupin III: Island of Assassins", type: "movie", year: "1997", aliases: ["walther p38", "island of assassins"], poster: "https://m.media-amazon.com/images/M/MV5BODg3ZjY2MTItODhlNy00YzkzLTk5ODgtMGI3MjI2MWI0ZmYyXkEyXkFqcGc@._V1_UX400_.jpg" },
  { it: "Lupin Zero", orig: "Lupin Zero", type: "series", year: "2022", aliases: ["lupin zero"], poster: "https://static.tvmaze.com/uploads/images/medium_portrait/435/1088890.jpg" },
];

function getPosterQualityRank(url) {
  if (!url || typeof url !== "string") return 0;
  const u = url.toLowerCase();
  if (u.includes(".svg") || u.includes("logo_") || u.includes("flag_") || u.includes("icon_") || u.includes("symbol")) return 1;
  if (u.includes("screenshot")) return 2;
  if (u.includes("special:filepath") || u.includes("/wikipedia/commons/")) return 3;
  if (u.includes("/wikipedia/it/")) return 4;
  if (u.includes("/wikipedia/en/") || u.includes("static.tvmaze.com") || u.includes("anilist.co")) return 5;
  if (u.includes("m.media-amazon.com") || u.includes("imdb")) return 6;
  return 3;
}

const ROMAN_NUMERALS_MAP = {
  i: "1", ii: "2", iii: "3", iv: "4", v: "5",
  vi: "6", vii: "7", viii: "8", ix: "9", x: "10",
  xi: "11", xii: "12"
};

function convertRomanNumeralsClient(normStr) {
  if (!normStr) return "";
  return normStr
    .split(/\s+/)
    .map((w) => ROMAN_NUMERALS_MAP[w] || w)
    .join(" ");
}

const STOP_WORDS_CLIENT = new Set([
  "the", "il", "lo", "la", "l", "i", "gli", "le", "a", "an", "and", "e", "ed", "n",
  "di", "dei", "del", "della", "delle", "dello", "degli", "da", "dal", "dalla",
  "of", "in", "on", "per", "con", "su", "un", "uno", "una", "al", "alla", "ai", "agli", "alle"
]);

function cleanSearchInputClient(q) {
  return String(q || "")
    .replace(/['’`\-:–—.,!?/\\()"*•·]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function coreSearchInputClient(q) {
  const cleaned = cleanSearchInputClient(q);
  const words = cleaned.split(" ").filter(Boolean).filter((w) => {
    const plain = w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return !STOP_WORDS_CLIENT.has(plain);
  });
  return words.length >= 2 ? words.join(" ") : cleaned;
}

function cleanTokensClient(text) {
  const norm = normalizeTitleClient(text);
  const normArabic = convertRomanNumeralsClient(norm);
  const tokens = normArabic.split(" ").filter(Boolean);
  const core = tokens.filter((t) => !STOP_WORDS_CLIENT.has(t));
  return { tokens, core };
}

function wordMatchClient(qw, cw) {
  if (qw === cw) return true;
  if (qw.length >= 3 && cw.length >= 3) {
    if ((qw.length >= 4 && cw.startsWith(qw)) || (cw.length >= 4 && qw.startsWith(cw))) return true;
    if (Math.min(qw.length, cw.length) >= 5 && (qw.includes(cw) || cw.includes(qw))) return true;
    if (cw === `${qw}s` || qw === `${cw}s`) return true;
    const minL = Math.min(qw.length, cw.length);
    const maxD = minL >= 6 ? 2 : (minL >= 4 ? 1 : 0);
    if (maxD > 0 && damerauLevenshteinClient(qw, cw, maxD) <= maxD) return true;
  }
  return false;
}

function scoreCandidateListClient(query, primaryCands, aliasCands) {
  const { tokens: qTokens, core: qCore } = cleanTokensClient(query);
  const qStr = qTokens.join(" ");
  const qCoreStr = qCore.join(" ");
  if (!qStr && !qCoreStr) return 0;

  const entries = [
    ...(primaryCands || []).map((c) => ({ isAlias: false, cand: c })),
    ...(aliasCands || []).map((c) => ({ isAlias: true, cand: c })),
  ];

  let bestScore = 0;
  for (const { isAlias, cand } of entries) {
    if (!cand) continue;
    const { tokens: cTokens, core: cCore } = cleanTokensClient(cand);
    if (cTokens.length === 0) continue;
    const cStr = cTokens.join(" ");
    const cCoreStr = cCore.join(" ");

    let s = 0;
    if (qStr && qStr === cStr) {
      s = 1000;
    } else if (qCoreStr && qCoreStr === cCoreStr) {
      s = 970;
    } else if ((qStr && cStr.includes(qStr)) || (qCoreStr && cCoreStr.includes(qCoreStr))) {
      const isStart = cStr.startsWith(qStr) || (qCoreStr && cCoreStr.startsWith(qCoreStr));
      const isEnd = cStr.endsWith(qStr) || (qCoreStr && cCoreStr.endsWith(qCoreStr));
      const extraWords = Math.abs(cCore.length - qCore.length);
      if (isStart && extraWords >= 1 && extraWords <= 3) {
        const remTokens = cCore.length > qCore.length ? cCore.slice(qCore.length) : [];
        const firstRem = remTokens[0] || "";
        if (extraWords === 1 && /^\d+$/.test(firstRem)) {
          s = 965;
        } else if (
          firstRem &&
          (/^\d+$/.test(firstRem) ||
            ["parte", "part", "capitolo", "chapter", "vol", "volume", "for", "ride", "forever"].includes(firstRem) ||
            cand.includes(":") ||
            cand.includes("-"))
        ) {
          s = Math.max(935, 955 - (extraWords - 1) * 6);
        } else {
          s = Math.max(780, 945 - extraWords * 7);
        }
      } else {
        const phraseScore = isStart ? 940 : isEnd ? 920 : 900;
        s = Math.max(780, phraseScore - extraWords * 8);
      }
    } else if (qCore.length > 0) {
      let matchedCount = 0;
      const matchedIndices = [];
      for (const qw of qCore) {
        let foundIdx = -1;
        for (let ci = 0; ci < cTokens.length; ci++) {
          if (wordMatchClient(qw, cTokens[ci])) {
            matchedCount++;
            foundIdx = ci;
            break;
          }
        }
        if (foundIdx !== -1) matchedIndices.push(foundIdx);
      }
      if (matchedCount > 0) {
        const coverage = matchedCount / qCore.length;
        if (coverage === 1.0) {
          let inOrder = true;
          for (let i = 1; i < matchedIndices.length; i++) {
            if (matchedIndices[i] < matchedIndices[i - 1]) {
              inOrder = false;
              break;
            }
          }
          const orderScore = inOrder ? 840 : 760;
          const extraWords = Math.abs(cCore.length - qCore.length);
          s = Math.max(650, orderScore - extraWords * 10);
        } else if (coverage >= 0.5) {
          const extraWords = Math.abs(cCore.length - qCore.length);
          s = Math.max(200, Math.round(coverage * 600) - extraWords * 15);
        } else {
          const extraWords = Math.abs(cCore.length - qCore.length);
          s = Math.max(100, Math.round(coverage * 500) - extraWords * 10);
        }
      }
    }

    if (s > 0 && isAlias) {
      s = Math.max(90, s - 5);
    }
    if (s > bestScore) bestScore = s;
  }
  return bestScore;
}

function computeRelevanceScoreClient(query, item, bridgeQueries = [], suggestions = []) {
  const primaries = [item.title_it, item.title_original];
  const aliases = Array.isArray(item.aliases) ? item.aliases : [];
  let bestScore = scoreCandidateListClient(query, primaries, aliases);

  if (Array.isArray(suggestions) && suggestions.length > 0) {
    for (const sug of suggestions) {
      const sugScore = scoreCandidateListClient(sug, primaries, aliases);
      if (sugScore > 0) {
        bestScore = Math.max(bestScore, Math.max(120, sugScore - 40));
      }
    }
  }

  if (bestScore === 0 && Array.isArray(bridgeQueries) && bridgeQueries.length > 0) {
    for (const bq of bridgeQueries) {
      const bs = scoreCandidateListClient(bq, primaries, aliases);
      if (bs > 0) {
        bestScore = Math.max(bestScore, Math.min(820, Math.max(120, bs - 180)));
      }
    }
  }

  if (item.is_saga) {
    const rank = Number(item.saga_rank || 1);
    if (bestScore >= 960) {
      // Mantieni punteggio massimo
    } else if (bestScore > 0) {
      bestScore = Math.max(bestScore, 960 - rank * 6);
    } else {
      bestScore = Math.max(bestScore, 920 - rank * 6);
    }
  }

  if (bestScore === 0) return 0;

  let popBonus = 0;
  const sl = Number(item.sitelinks_count || 0);
  if (sl >= 45) popBonus = Math.max(popBonus, 160);
  else if (sl >= 30) popBonus = Math.max(popBonus, 130);
  else if (sl >= 15) popBonus = Math.max(popBonus, 90);
  else if (sl >= 8) popBonus = Math.max(popBonus, 50);
  else if (sl >= 4) popBonus = Math.max(popBonus, 20);

  const apop = Number(item.anilist_popularity || 0);
  if (apop >= 120000) popBonus = Math.max(popBonus, 150);
  else if (apop >= 60000) popBonus = Math.max(popBonus, 115);
  else if (apop >= 25000) popBonus = Math.max(popBonus, 75);
  else if (apop >= 8000) popBonus = Math.max(popBonus, 35);

  const w = Number(item.tvmaze_weight || 0);
  if (w >= 92) popBonus = Math.max(popBonus, 145);
  else if (w >= 85) popBonus = Math.max(popBonus, 115);
  else if (w >= 70) popBonus = Math.max(popBonus, 75);
  else if (w >= 50) popBonus = Math.max(popBonus, 35);

  if (item.is_saga) {
    popBonus = Math.max(popBonus, 140);
  }

  const itBonus = item.has_it_title ? 35 : 0;

  let obscurityPenalty = 0;
  const src = item.src || "";
  if (!item.is_saga && src !== "ALIAS" && src !== "EPG") {
    if (src === "WD") {
      if (sl <= 1 && !item.has_it_title && !item.imdb_id) {
        obscurityPenalty = 150;
      } else if (sl <= 3 && !item.has_it_title) {
        obscurityPenalty = 95;
      } else if (sl <= 2) {
        obscurityPenalty = 60;
      }
    } else if (src === "ANI") {
      if (apop < 5000 && !item.has_it_title) {
        obscurityPenalty = 110;
      }
    } else if (src === "TVM") {
      if (w < 40 && !item.has_it_title) {
        obscurityPenalty = 90;
      }
    }
  }

  return Math.max(10, bestScore + popBonus + itBonus - obscurityPenalty);
}

function normalizeTitleClient(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripConjunctionsClient(normStr) {
  if (!normStr) return "";
  return normStr
    .replace(/\b(and|end|e|ed|n)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function damerauLevenshteinClient(s1, s2, maxDist = 2) {
  if (s1 === s2) return 0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (Math.abs(len1 - len2) > maxDist) return maxDist + 1;
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  let prev2 = Array.from({ length: len2 + 1 }, (_, i) => i);
  let prev1 = Array.from({ length: len2 + 1 }, (_, i) => i);
  let curr = new Array(len2 + 1).fill(0);

  for (let i = 1; i <= len1; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      let val = Math.min(prev1[j] + 1, curr[j - 1] + 1, prev1[j - 1] + cost);
      if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
        val = Math.min(val, prev2[j - 2] + 1);
      }
      curr[j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
    const tmp = prev2;
    prev2 = prev1;
    prev1 = curr;
    curr = tmp;
  }
  return prev1[len2];
}

function fuzzyMatchTitleClient(query, candidateRaw) {
  if (!query || !candidateRaw) return false;
  let qRaw = String(query).trim();
  if (!qRaw.includes(" ") && qRaw.length >= 8) {
    qRaw = qRaw.replace(/(.{3,})(and|end)(.{3,})/i, "$1 & $3");
  }
  const qNorm = normalizeTitleClient(qRaw);
  if (!qNorm) return false;
  const qConj = stripConjunctionsClient(qNorm) || qNorm;
  const qNoSpace = qNorm.replace(/\s+/g, "");
  const qConjNoSpace = qConj.replace(/\s+/g, "");

  const candVariants = new Set([
    normalizeTitleClient(candidateRaw),
    stripConjunctionsClient(normalizeTitleClient(candidateRaw)),
  ]);
  if (String(candidateRaw).includes("&") || String(candidateRaw).includes("+")) {
    [" and ", " end ", " e ", " "].forEach((repl) => {
      candVariants.add(normalizeTitleClient(String(candidateRaw).replace(/[&+]/g, repl)));
    });
  }

  for (const cv of candVariants) {
    if (!cv) continue;
    const cvNoSpace = cv.replace(/\s+/g, "");
    if (cv.includes(qNorm) || (qConj.length >= 3 && cv.includes(qConj))) return true;
    if (qNoSpace.length >= 4 && (cvNoSpace.includes(qNoSpace) || (qConjNoSpace.length >= 4 && cvNoSpace.includes(qConjNoSpace)))) {
      return true;
    }
  }

  if (qConjNoSpace.length < 4) return false;
  const maxDist = qConjNoSpace.length <= 5 ? 1 : 2;

  for (const cv of candVariants) {
    if (!cv) continue;
    const cvWords = cv.split(" ");
    const cvNoSpace = cv.replace(/\s+/g, "");
    if (
      damerauLevenshteinClient(qConj, cv, maxDist) <= maxDist ||
      damerauLevenshteinClient(qConjNoSpace, cvNoSpace, maxDist) <= maxDist ||
      damerauLevenshteinClient(qNoSpace, cvNoSpace, maxDist) <= maxDist
    ) {
      return true;
    }

    const prefWords = [];
    for (const w of cvWords.slice(0, 6)) {
      prefWords.push(w);
      const prefSpaced = prefWords.join(" ");
      const prefNoSpace = prefWords.join("");
      if (prefNoSpace.length < 4) continue;
      const localMax = prefNoSpace.length <= 5 ? 1 : maxDist;
      if (
        damerauLevenshteinClient(qConj, prefSpaced, localMax) <= localMax ||
        damerauLevenshteinClient(qConjNoSpace, prefNoSpace, localMax) <= localMax ||
        damerauLevenshteinClient(qNoSpace, prefNoSpace, localMax) <= localMax
      ) {
        return true;
      }
    }
  }
  return false;
}

function formatItalianDate(isoDate, longFormat = false) {
  if (!isoDate) return "";
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3) return isoDate;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  const w = WEEKDAYS_IT[dt.getDay()];
  const m = MONTHS_IT[dt.getMonth()];
  return longFormat ? `${w} ${parts[2]} ${m} ${parts[0]}` : `${w} ${parts[2]} ${m}`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(msg, duration = 3500) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const el = document.createElement("div");
  el.className = "toast";

  const textSpan = document.createElement("span");
  textSpan.textContent = msg;
  el.appendChild(textSpan);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "toast-close-btn";
  closeBtn.setAttribute("aria-label", "Chiudi");
  closeBtn.setAttribute("title", "Scorri o tocca per chiudere");
  closeBtn.innerHTML = "&times;";
  el.appendChild(closeBtn);

  container.appendChild(el);

  let dismissTimer = null;
  const dismissToast = (direction = 0) => {
    if (el._dismissed) return;
    el._dismissed = true;
    if (dismissTimer) clearTimeout(dismissTimer);
    el.style.transition = "transform 0.24s cubic-bezier(0.2, 0, 0.2, 1), opacity 0.24s ease-out";
    const travel = direction !== 0 ? (direction > 0 ? 320 : -320) : 0;
    el.style.transform = `translateX(${travel}px)${direction === 0 ? " scale(0.92)" : ""}`;
    el.style.opacity = "0";
    setTimeout(() => {
      try { el.remove(); } catch (_) { }
    }, 250);
  };

  dismissTimer = setTimeout(() => dismissToast(0), duration);

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dismissToast(0);
  });

  // Swipe / Drag to dismiss horizontally (mouse & touch via Pointer Events)
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  let hasSwiped = false;

  el.addEventListener("pointerdown", (e) => {
    if (e.target && e.target.classList.contains("toast-close-btn")) return;
    startX = e.clientX;
    currentX = e.clientX;
    isDragging = true;
    hasSwiped = false;
    if (dismissTimer) clearTimeout(dismissTimer);
    el.style.transition = "none";
    try { el.setPointerCapture(e.pointerId); } catch (_) { }
  });

  el.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    currentX = e.clientX;
    const diffX = currentX - startX;
    if (Math.abs(diffX) > 4) {
      hasSwiped = true;
    }
    el.style.transform = `translateX(${diffX}px)`;
    const progress = Math.min(Math.abs(diffX) / 180, 0.85);
    el.style.opacity = String(1 - progress);
  });

  const onPointerEnd = (e) => {
    if (!isDragging) return;
    isDragging = false;
    try { el.releasePointerCapture(e.pointerId); } catch (_) { }
    const diffX = currentX - startX;
    const threshold = Math.min(el.offsetWidth * 0.25, 60);

    if (hasSwiped && Math.abs(diffX) > threshold) {
      dismissToast(diffX > 0 ? 1 : -1);
    } else {
      // Snap back if threshold wasn't reached
      el.style.transition = "transform 0.2s ease-out, opacity 0.2s ease-out";
      el.style.transform = "translateX(0px)";
      el.style.opacity = "1";
      dismissTimer = setTimeout(() => dismissToast(0), duration);
    }
  };

  el.addEventListener("pointerup", onPointerEnd);
  el.addEventListener("pointercancel", onPointerEnd);
}

function buildGoogleCalendarUrl(ev) {
  const title = `📺 ${ev.title}${ev.ep_code ? " (" + ev.ep_code + ")" : ""} su ${ev.channel_name} (Canale ${ev.lcn})`;
  const [y, m, d] = (ev.date || "2026-10-31").split("-");
  const [hh, mm] = (ev.start_time || "21:20").split(":");
  const startDt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
  const endDt = new Date(startDt.getTime() + (ev.duration_min || 60) * 60000);
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (dt) =>
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  const details = `${ev.description || ""}\nCanale Digitale Terrestre: LCN ${ev.lcn} - ${ev.channel_name}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(startDt)}/${fmt(endDt)}&details=${encodeURIComponent(details)}`;
}

// ============================================================================
// CLOUD SYNC & 4G/5G MOBILE DATA ENGINE (Bytebin + ntfy.sh + LocalStorage)
// ============================================================================
function getLocalSnapshot() {
  try {
    const raw = localStorage.getItem("nextontv_snapshot");
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return {
    library: [],
    deleted_keys: [],
    reminders: [],
    matches: [],
    counts: { all: 0, wishlist: 0, watched_movies: 0, watched_series: 0 },
    days: [],
    updated_at: 0,
  };
}

function saveLocalSnapshot(snap) {
  try {
    localStorage.setItem("nextontv_snapshot", JSON.stringify(snap));
  } catch (e) { }
}

function mergeSnapshotsClient(localSnap, cloudSnap) {
  if (!cloudSnap || !Array.isArray(cloudSnap.library)) return localSnap;
  if (!localSnap || !Array.isArray(localSnap.library)) return cloudSnap;

  // If localSnap was explicitly restored/updated more recently than cloud, do not revive old cloud items!
  if ((localSnap.updated_at || 0) > (cloudSnap.updated_at || 0) + 2) {
    return localSnap;
  }

  const mergedLib = [...(localSnap.library || [])];
  const deletedKeys = new Set([
    ...(localSnap.deleted_keys || []),
    ...(cloudSnap.deleted_keys || []),
  ]);

  // CRITICAL: Any title actively present in local library takes precedence over old tombstones!
  (localSnap.library || []).forEach((it) => {
    if (!it || !it.title_it) return;
    const k = `${it.media_type || "movie"}_${normalizeTitleClient(it.title_it)}`;
    deletedKeys.delete(k);
    deletedKeys.delete(normalizeTitleClient(it.title_it));
  });

  const localKeySet = new Set(
    mergedLib.map((x) => `${x.media_type || "movie"}_${normalizeTitleClient(x.title_it)}`)
  );

  cloudSnap.library.forEach((item) => {
    if (!item || !item.title_it) return;
    const mtype = item.media_type || "movie";
    const k = `${mtype}_${normalizeTitleClient(item.title_it)}`;
    if (deletedKeys.has(k)) return;

    if (!localKeySet.has(k)) {
      localKeySet.add(k);
      mergedLib.push(item);
    } else {
      const existing = mergedLib.find((x) => `${x.media_type || "movie"}_${normalizeTitleClient(x.title_it)}` === k);
      if (existing) {
        if (item.status && existing.status !== item.status) {
          if ((cloudSnap.updated_at || 0) >= (localSnap.updated_at || 0)) {
            existing.status = item.status;
          }
        }
        if (!existing.poster && item.poster) existing.poster = item.poster;
        if ((item.watched_episodes || []).length > (existing.watched_episodes || []).length) {
          existing.watched_episodes = item.watched_episodes;
          existing.watched_episodes_count = item.watched_episodes.length;
        }
      }
    }
  });

  const filteredLib = mergedLib.filter((x) => {
    const k = `${x.media_type || "movie"}_${normalizeTitleClient(x.title_it)}`;
    return !deletedKeys.has(k);
  });

  // Never keep an active item's key inside deleted_keys!
  const finalKeySet = new Set(filteredLib.map((x) => `${x.media_type || "movie"}_${normalizeTitleClient(x.title_it)}`));
  const cleanDeletedKeys = Array.from(deletedKeys).filter((k) => !finalKeySet.has(k));

  return {
    ...localSnap,
    library: filteredLib,
    deleted_keys: cleanDeletedKeys,
    reminders: (cloudSnap.reminders && cloudSnap.reminders.length >= (localSnap.reminders || []).length) ? cloudSnap.reminders : (localSnap.reminders || []),
    updated_at: Math.max(localSnap.updated_at || 0, cloudSnap.updated_at || 0, Date.now() / 1000),
  };
}

async function pullCloudSnapshotClient(syncCode) {
  const code = (syncCode || state.syncCode || "shynicy_nextontv").trim().toLowerCase();
  const topic = `nextontv_sync_${code}`;
  try {
    const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=all`);
    const text = await res.text();
    const lines = text.trim().split("\n");
    let cloudSnap = null;
    let latestTs = -1;

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.event !== "message") continue;
        const evTime = Number(ev.time || 0);

        // 1. Direct attachment URL
        if (ev.attachment && ev.attachment.url) {
          try {
            const bRes = await fetch(ev.attachment.url);
            if (bRes.ok) {
              const snapObj = await bRes.json();
              if (snapObj && Array.isArray(snapObj.library)) {
                const uTs = Number(snapObj.updated_at || evTime);
                if (uTs >= latestTs) {
                  latestTs = uTs;
                  cloudSnap = snapObj;
                  break;
                }
              }
            }
          } catch (e) { }
        }

        // 2. Direct JSON body in message
        const msgRaw = (ev.message || "").trim();
        if (msgRaw.startsWith("{") && msgRaw.endsWith("}")) {
          try {
            const snapObj = JSON.parse(msgRaw);
            if (snapObj && Array.isArray(snapObj.library)) {
              const uTs = Number(snapObj.updated_at || evTime);
              if (uTs >= latestTs) {
                latestTs = uTs;
                cloudSnap = snapObj;
                break;
              }
            }
          } catch (e) { }
        }
      } catch (e) { }
    }

    if (!cloudSnap || !Array.isArray(cloudSnap.library)) return null;

    // Smart merge: NEVER wipe out items that were added locally!
    const localSnap = getLocalSnapshot();
    const merged = mergeSnapshotsClient(localSnap, cloudSnap);
    saveLocalSnapshot(merged);
    return merged;
  } catch (e) {
    return null;
  }
}

async function pushCloudSnapshotClient(syncCode, snap) {
  const code = (syncCode || state.syncCode || "shynicy_nextontv").trim().toLowerCase();
  if (snap) {
    snap.updated_at = Date.now() / 1000;
    snap.source = "mobile";
    saveLocalSnapshot(snap);
  }
  const topic = `nextontv_sync_${code}`;
  try {
    const rawPayload = JSON.stringify(snap);
    let attUrl = null;
    try {
      const postRes = await fetch(`https://ntfy.sh/${topic}?filename=snapshot.json`, {
        method: "PUT",
        headers: { "Title": "NextOnTV Cloud Snapshot", "Tags": "package" },
        body: rawPayload,
      });
      if (postRes.ok) {
        const postData = await postRes.json();
        attUrl = postData?.attachment?.url || null;
      }
    } catch (e) { }

    try {
      const notice = JSON.stringify({
        attachment_url: attUrl || "",
        updated_at: (snap && snap.updated_at) || Date.now() / 1000,
        source: "mobile",
        items_count: ((snap && snap.library) || []).length,
      });
      await fetch(`https://ntfy.sh/${topic}`, {
        method: "POST",
        headers: { "Title": "NextOnTV Sync Notice" },
        body: notice,
      });
    } catch (e) { }

    return attUrl || "ok";
  } catch (e) {
    return null;
  }
}

function updateHeaderSyncBadge() {
  const pill = document.getElementById("header-sync-pill");
  if (!pill) return;
  const isGhPages = window.location.hostname.includes("github.io");
  if (isGhPages) {
    pill.textContent = "☁️ GitHub Pages (H24)";
    pill.classList.add("offline-mode");
  } else if (state.isCloudMode) {
    pill.textContent = "☁️ Offline / Cloud";
    pill.classList.add("offline-mode");
  } else {
    pill.textContent = "🟢 PC + ☁️ Sync";
    pill.classList.remove("offline-mode");
  }
}

// Global cached EPG events when running serverless on GitHub Pages
let _staticEpgCache = null;
let _staticStreamingCatalog = null;

const STREAMING_PLATFORM_META = {
  netflix: { id: "netflix", name: "Netflix", color: "#e50914" },
  prime: { id: "prime", name: "Prime Video", color: "#00a8e1" },
  disney: { id: "disney", name: "Disney+", color: "#113ccf" },
  now: { id: "now", name: "NOW", color: "#00d66c" },
  sky: { id: "sky", name: "Sky Go", color: "#0072ce" },
  hbo: { id: "hbo", name: "HBO / Max", color: "#7b2cbf" },
  apple: { id: "apple", name: "Apple TV+", color: "#64748b" },
  paramount: { id: "paramount", name: "Paramount+", color: "#0064ff" },
  raiplay: { id: "raiplay", name: "RaiPlay", color: "#0046ad" },
  mediaset: { id: "mediaset", name: "Mediaset Infinity", color: "#f39200" },
  crunchyroll: { id: "crunchyroll", name: "Crunchyroll", color: "#f47521" },
  timvision: { id: "timvision", name: "TIMVISION", color: "#003399" },
};

async function fetchStaticStreamingCatalog() {
  if (_staticStreamingCatalog) return _staticStreamingCatalog;
  try {
    const res = await fetch(resolveAssetUrl("data/streaming_catalog.json"), { cache: "no-cache" });
    if (res.ok) {
      _staticStreamingCatalog = await res.json();
      return _staticStreamingCatalog || {};
    }
  } catch (e) { }
  _staticStreamingCatalog = {};
  return _staticStreamingCatalog;
}

function resolveClientStreamingForItem(item, catalogMap) {
  if (!item) return [];
  if (Array.isArray(item.streaming_providers) && item.streaming_providers.length > 0) {
    return item.streaming_providers;
  }
  const map = catalogMap || _staticStreamingCatalog || {};
  const mtype = item.media_type === "series" ? "series" : "movie";
  const cands = [
    item.title_it,
    item.title_original,
    ...(Array.isArray(item.aliases) ? item.aliases : []),
  ].filter(Boolean);

  for (const raw of cands) {
    const norm = normalizeTitleClient(raw);
    if (!norm) continue;
    if (Array.isArray(map[`${mtype}_${norm}`])) return map[`${mtype}_${norm}`];
    const conj = stripConjunctionsClient(norm);
    if (conj && Array.isArray(map[`${mtype}_${conj}`])) return map[`${mtype}_${conj}`];
    const rom = convertRomanNumeralsClient(norm);
    if (rom && Array.isArray(map[`${mtype}_${rom}`])) return map[`${mtype}_${rom}`];
  }
  return Array.isArray(item.streaming_providers) ? item.streaming_providers : [];
}

function resolveAssetUrl(relPath) {
  let base = window.location.pathname;
  if (!base.endsWith("/")) {
    base = base.substring(0, base.lastIndexOf("/") + 1);
  }
  return window.location.origin + base + relPath.replace(/^\.?\//, "");
}

async function fetchStaticEpgEvents() {
  if (_staticEpgCache && _staticEpgCache.length > 0) return _staticEpgCache;
  try {
    const res = await fetch(resolveAssetUrl("data/epg_7days.json"), { cache: "no-cache" });
    if (res.ok) {
      _staticEpgCache = await res.json();
      return _staticEpgCache || [];
    }
  } catch (e) { }
  return [];
}

async function apiGet(url) {
  try {
    const isGhPages = window.location.hostname.includes("github.io");
    if (isGhPages) {
      state.isCloudMode = true;
      updateHeaderSyncBadge();
      return await handleClientCloudGet(url);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    state.isCloudMode = false;
    updateHeaderSyncBadge();
    return await res.json();
  } catch (err) {
    // Fallback to Cloud / 4G Mobile Data Mode when away from home Wi-Fi!
    state.isCloudMode = true;
    updateHeaderSyncBadge();
    return await handleClientCloudGet(url);
  }
}

async function apiPost(url, payload) {
  try {
    const isGhPages = window.location.hostname.includes("github.io");
    if (isGhPages) {
      state.isCloudMode = true;
      updateHeaderSyncBadge();
      return await handleClientCloudPost(url, payload);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    state.isCloudMode = false;
    updateHeaderSyncBadge();
    return await res.json();
  } catch (err) {
    state.isCloudMode = true;
    updateHeaderSyncBadge();
    return await handleClientCloudPost(url, payload);
  }
}

// Autonomous 4G/5G / GitHub Pages Mobile Data handlers when PC is unreachable
async function handleClientCloudGet(url) {
  const parsed = new URL(url, window.location.origin);
  const path = parsed.pathname;
  let snap = getLocalSnapshot();

  // If local library snapshot is empty on this device/domain, seed with default library
  try {
    const libRes = await fetch(resolveAssetUrl("data/library.json"), { cache: "no-cache" });
    if (libRes.ok) {
      const defLib = await libRes.json();
      if (Array.isArray(defLib) && defLib.length > 0) {
        if (!snap.library || snap.library.length === 0) {
          snap.library = defLib;
          saveLocalSnapshot(snap);
        } else {
          // If items in local library have missing posters, backfill from defLib
          let updated = false;
          const defMap = {};
          defLib.forEach((x) => { defMap[normalizeTitleClient(x.title_it)] = x; });
          snap.library.forEach((x) => {
            const defItem = defMap[normalizeTitleClient(x.title_it)];
            if (defItem) {
              if ((!x.poster || x.poster === "") && defItem.poster) {
                x.poster = defItem.poster;
                updated = true;
              }
              if ((!Array.isArray(x.streaming_providers) || x.streaming_providers.length === 0) && Array.isArray(defItem.streaming_providers) && defItem.streaming_providers.length > 0) {
                x.streaming_providers = defItem.streaming_providers;
                updated = true;
              }
            }
          });
          if (updated) saveLocalSnapshot(snap);
        }
      }
    }
  } catch (e) { }

  if (path === "/api/status") {
    let statusFile = null;
    try {
      const sRes = await fetch(resolveAssetUrl("data/status.json"), { cache: "no-cache" });
      if (sRes.ok) statusFile = await sRes.json();
    } catch (e) { }

    if (state.syncCode) {
      const cloudSnap = await pullCloudSnapshotClient(state.syncCode);
      if (cloudSnap) snap = cloudSnap;
    }
    return {
      ok: true,
      start_date: (statusFile && statusFile.start_date) || snap.start_date || getCurrentItalianDateIso(),
      fetched_at: (statusFile && statusFile.fetched_at) ? statusFile.fetched_at : "Aggiornato",
      total_epg_events: (statusFile && statusFile.total_epg_events) || 10003,
      channels_count: (statusFile && statusFile.channels_count) || 53,
      days: (statusFile && statusFile.days) || snap.days || [],
      library_count: (snap.library || []).length,
      sync_code: state.syncCode,
      mobile_url: window.location.href,
      public_url: "",
    };
  }

  if (path === "/api/channels") {
    try {
      const cRes = await fetch(resolveAssetUrl("data/channels.json"), { cache: "no-cache" });
      if (cRes.ok) {
        const cData = await cRes.json();
        if (cData && cData.channels) return cData;
      }
    } catch (e) { }
    return { channels: state.channels || [] };
  }

  if (path === "/api/library" || path === "/api/streaming") {
    const streamCat = await fetchStaticStreamingCatalog();
    const lib = snap.library || [];
    lib.forEach((it) => {
      it.streaming_providers = resolveClientStreamingForItem(it, streamCat);
    });
    return { items: lib };
  }

  if (path === "/api/reminders") {
    return { reminders: snap.reminders || [] };
  }

  if (path === "/api/matches") {
    const filterMode = parsed.searchParams.get("filter_mode") || "all";
    const dayFilter = parsed.searchParams.get("day") || "all";
    const timeSlot = parsed.searchParams.get("time_slot") || "all";
    const lcnFilter = parsed.searchParams.get("lcn") || "";
    const onlyUnwatched = parsed.searchParams.get("only_unwatched") === "1";
    const includeSky = parsed.searchParams.get("include_sky") === "1";

    const allEvents = await fetchStaticEpgEvents();
    const libItems = (snap.library && snap.library.length > 0) ? snap.library : state.libraryItems || [];

    // Pre-build lightning-fast normalized search index for library items & aliases (O(1) hash lookups)
    const libByKey = {};
    libItems.forEach((it) => {
      const mtype = it.media_type || "movie";
      const normIt = normalizeTitleClient(it.title_it);
      const normOrig = normalizeTitleClient(it.title_original || "");
      if (normIt) {
        libByKey[`${mtype}_${normIt}`] = it;
        libByKey[`${mtype}_${convertRomanNumeralsClient(normIt)}`] = it;
        libByKey[`${mtype}_${stripConjunctionsClient(normIt)}`] = it;
      }
      if (normOrig) {
        libByKey[`${mtype}_${normOrig}`] = it;
        libByKey[`${mtype}_${convertRomanNumeralsClient(normOrig)}`] = it;
        libByKey[`${mtype}_${stripConjunctionsClient(normOrig)}`] = it;
      }
      if (it.aliases && Array.isArray(it.aliases)) {
        it.aliases.forEach((al) => {
          const normAl = normalizeTitleClient(al);
          if (normAl) {
            libByKey[`${mtype}_${normAl}`] = it;
            libByKey[`${mtype}_${convertRomanNumeralsClient(normAl)}`] = it;
            libByKey[`${mtype}_${stripConjunctionsClient(normAl)}`] = it;
          }
        });
      }
    });

    const isMatch = (ev) => {
      const evNorm = ev.norm_title || normalizeTitleClient(ev.title || "");
      if (!evNorm) return null;
      const evType = ev.media_type || "movie";

      // 1. Strict typed lookup: movie against movie, series against series
      let matched = libByKey[`${evType}_${evNorm}`];
      if (matched) return matched;

      const evRoman = convertRomanNumeralsClient(evNorm);
      if (libByKey[`${evType}_${evRoman}`]) return libByKey[`${evType}_${evRoman}`];

      const evConj = stripConjunctionsClient(evNorm);
      if (libByKey[`${evType}_${evConj}`]) return libByKey[`${evType}_${evConj}`];

      // 2. Controlled match ONLY within the same media_type:
      // STRICT RULE: Series NEVER matches Movie! Movie NEVER matches Series!
      for (let i = 0; i < libItems.length; i++) {
        const it = libItems[i];
        const itType = it.media_type || "movie";
        if (itType !== evType) continue;

        const itNorm = normalizeTitleClient(it.title_it);
        const itOrig = normalizeTitleClient(it.title_original || "");
        const allCandidates = [itNorm, itOrig, ...(it.aliases || []).map(normalizeTitleClient)].filter(Boolean);

        for (const cand of allCandidates) {
          // Roman numerals or conjunction equivalence
          if (evRoman === convertRomanNumeralsClient(cand)) return it;
          if (evConj === stripConjunctionsClient(cand)) return it;

          // Controlled prefix match: ONLY allow prefix matching if:
          // A. The candidate has at least 8 characters AND at least 2 words (not a single word like 'Lupin'!)
          // B. The remaining suffix in evNorm is ONLY season/episode/part indicators (e.g. "st 1", "ep 2", "pt 2", "1", "2")
          if (cand.length >= 8 && cand.includes(" ") && evNorm.startsWith(cand)) {
            const remainder = evNorm.slice(cand.length).trim();
            if (/^(s\d+|ep\d+|st\s*\d+|stagione\s*\d+|episodio\s*\d+|parte\s*\d+|pt\s*\d+|\d+|[ivx]+)$/i.test(remainder)) {
              return it;
            }
          }
        }
      }
      return null;
    };

    let counts = { all: 0, wishlist: 0, watched_movies: 0, watched_series: 0 };
    const matchedEvents = [];

    allEvents.forEach((ev) => {
      const isSkyEv = Boolean(ev.is_sky || Number(ev.lcn || 0) >= 100);
      if (!includeSky && isSkyEv) return;

      const lib = isMatch(ev);
      if (!lib) return;

      const st = lib.status || "wishlist";
      const mtype = lib.media_type || ev.media_type || "movie";
      const isMovie = mtype === "movie";

      // Calculate watched episode status
      let isEpWatched = false;
      const epCode = (ev.season && ev.episode) ? `S${ev.season}E${ev.episode}` : "";
      if (lib.watched_episodes && Array.isArray(lib.watched_episodes) && epCode) {
        isEpWatched = lib.watched_episodes.includes(epCode);
      } else if (st === "watched") {
        isEpWatched = true;
      }

      // Check counts
      counts.all++;
      if (st === "wishlist") counts.wishlist++;
      if (st === "watched" && isMovie) counts.watched_movies++;
      if ((st === "watched" || st === "watching") && !isMovie) counts.watched_series++;

      // Filter by category
      if (filterMode === "wishlist" && st !== "wishlist") return;
      if (filterMode === "watched_movies" && !(st === "watched" && isMovie)) return;
      if (filterMode === "watched_series" && !(st in { watched: 1, watching: 1 } && !isMovie)) return;

      // Filter by day
      if (dayFilter !== "all" && ev.date !== dayFilter) return;

      // Filter by channel
      if (lcnFilter && String(ev.lcn) !== String(lcnFilter)) return;

      // Filter by timeslot
      if (timeSlot === "primetime") {
        const hhmm = ev.start_time || "";
        if (hhmm < "20:20" || hhmm > "23:15") return;
      } else if (timeSlot === "evening") {
        const hhmm = ev.start_time || "";
        if (hhmm < "19:00" && hhmm > "00:30") return;
      } else if (timeSlot === "daytime") {
        const hhmm = ev.start_time || "";
        if (hhmm < "06:00" || hhmm > "19:00") return;
      }

      // Filter by unwatched only
      if (onlyUnwatched && (isEpWatched || (isMovie && st === "watched"))) return;

      matchedEvents.push({
        ...ev,
        library_item: lib,
        is_episode_watched: isEpWatched,
        ep_code: epCode,
      });
    });

    let statusFile = null;
    try {
      const sRes = await fetch(resolveAssetUrl("data/status.json"), { cache: "no-cache" });
      if (sRes.ok) statusFile = await sRes.json();
    } catch (e) { }

    return {
      start_date: (statusFile && statusFile.start_date) || state.startDate || getCurrentItalianDateIso(),
      fetched_at: (statusFile && statusFile.fetched_at) ? statusFile.fetched_at : "GitHub Pages (H24)",
      days: (statusFile && statusFile.days) || state.days || [],
      total_epg_events: allEvents.length || 10003,
      channels_polled: (statusFile && statusFile.channels_count) || 53,
      matches: matchedEvents,
      counts,
    };
  }

  if (path === "/api/search") {
    const q = (parsed.searchParams.get("q") || "").trim();
    return await directMobileSearch4G(q, snap.library || []);
  }

  if (path === "/api/series_episodes") {
    const sid = Number(parsed.searchParams.get("series_id") || "0");
    const libItem = (snap.library || []).find((x) => Number(x.id) === sid);
    const titleIt = (libItem ? libItem.title_it : parsed.searchParams.get("title_it")) || "";
    const titleOrig = (libItem ? libItem.title_original : parsed.searchParams.get("title_original")) || titleIt;
    const tvmazeId = (libItem ? libItem.tvmaze_id : Number(parsed.searchParams.get("tvmaze_id") || "0")) || null;
    const isCompleted = Boolean(libItem && libItem.status === "watched");
    const watchedSet = new Set(libItem && Array.isArray(libItem.watched_episodes) ? libItem.watched_episodes : []);
    const eps = await fetchSeriesEpisodesClient4G(titleIt, titleOrig, tvmazeId);
    eps.forEach((ep) => {
      ep.watched = isCompleted || watchedSet.has(`S${ep.season}E${ep.episode}`);
    });
    if (isCompleted && libItem && eps.length > 0 && (!libItem.watched_episodes || libItem.watched_episodes.length < eps.length)) {
      libItem.watched_episodes = eps.map((ep) => `S${ep.season}E${ep.episode}`);
      libItem.watched_episodes_count = eps.length;
      saveLocalSnapshot(snap);
    }
    return {
      series_id: libItem ? libItem.id : 0,
      title_it: titleIt,
      episodes: eps,
    };
  }

  return { ok: true };
}

async function fetchSeriesEpisodesClient4G(titleIt, titleOriginal, tvmazeId) {
  try {
    let rawEps = null;
    if (tvmazeId) {
      const r = await fetch(`https://api.tvmaze.com/shows/${tvmazeId}/episodes`);
      if (r.ok) rawEps = await r.json();
    }
    if (!rawEps) {
      const q = titleOriginal || titleIt || "";
      if (q) {
        const r = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(q)}&embed=episodes`);
        if (r.ok) {
          const data = await r.json();
          rawEps = (data._embedded || {}).episodes || null;
        }
      }
    }
    if (Array.isArray(rawEps) && rawEps.length > 0) {
      return rawEps.map((ep) => ({
        season: Number(ep.season || 1),
        episode: Number(ep.number || 1),
        title: ep.name || `Episodio ${ep.number || 1}`,
        airdate: ep.airdate || "",
      }));
    }
  } catch (e) { }

  const fallback = [];
  for (let s = 1; s <= 2; s++) {
    for (let e = 1; e <= 8; e++) {
      fallback.push({
        season: s,
        episode: e,
        title: `Stagione ${s} • Episodio ${e}`,
        airdate: "",
      });
    }
  }
  return fallback;
}

const WD_SERIES_P31 = new Set([
  "Q5398426", "Q63952888", "Q581714", "Q117467246", "Q1259759",
  "Q15416", "Q1366112", "Q1107", "Q1047812", "Q526877"
]);
const WD_MOVIE_P31 = new Set([
  "Q11424", "Q202866", "Q20650540", "Q29168811", "Q506240",
  "Q220898", "Q24862", "Q17517379", "Q93204", "Q1261214", "Q21664088"
]);
const WD_MOVIE_EXPLICIT_P31 = new Set([
  "Q11424", "Q202866", "Q20650540", "Q29168811", "Q506240",
  "Q24862", "Q17517379", "Q93204", "Q1261214"
]);
const WD_ALL_MEDIA_P31 = new Set([...WD_SERIES_P31, ...WD_MOVIE_P31]);
const WD_REJECT_P31 = new Set([
  "Q7889", "Q7058673", "Q482994", "Q134556",
  "Q3464665", "Q21191270", "Q1983062", "Q4167410", "Q185529"
]);
const WD_BRIDGE_P31 = new Set([
  "Q21198342", "Q196600", "Q7725634", "Q8274", "Q1667921"
]);
const WD_STMT = "haswbstatement:" + Array.from(WD_ALL_MEDIA_P31).sort().map((q) => `P31=${q}`).join("|");

async function fetchJsonSafeClient(url, options = null, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...(options || {}), signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAniListAnimeClient(searchTerm) {
  if (!searchTerm) return [];
  const gql = "query ($search: String) { Page(page: 1, perPage: 25) { media(search: $search, type: ANIME) { id title { romaji english } synonyms format genres description(asHtml: false) startDate { year } popularity coverImage { large } } } }";
  const data = await fetchJsonSafeClient("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query: gql, variables: { search: searchTerm } }),
  });
  const list = data?.data?.Page?.media;
  if (!Array.isArray(list)) return [];
  return list.map((m) => {
    const fmt = m.format || "TV";
    if (fmt === "MUSIC") return null;
    const mtype = ["MOVIE", "SPECIAL", "OVA"].includes(fmt) ? "movie" : "series";
    const tEn = m.title?.english || m.title?.romaji || "";
    const tRo = m.title?.romaji || tEn;
    const year = m.startDate?.year ? String(m.startDate.year) : "";
    const genres = Array.isArray(m.genres) && m.genres.length > 0 ? m.genres.slice(0, 3).join(", ") : (mtype === "series" ? "Anime / Serie" : "Anime / Film");
    const descClean = String(m.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
    return {
      external_id: `ani_${m.id}`,
      imdb_id: "",
      tvmaze_id: null,
      media_type: mtype,
      title_it: tEn,
      title_original: tRo,
      aliases: Array.isArray(m.synonyms) ? m.synonyms.filter(Boolean) : [],
      year,
      poster: m.coverImage?.large || "",
      genre: genres,
      description: descClean || `${mtype === "series" ? "Serie Anime" : "Film Anime"}${year ? ` (${year})` : ""}`,
      anilist_popularity: Number(m.popularity || 0),
      has_it_title: false,
      src: "ANI",
    };
  }).filter((x) => x && x.title_it);
}

async function fetchTvMazeShowsClient(searchTerm) {
  if (!searchTerm) return [];
  const data = await fetchJsonSafeClient(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchTerm)}`);
  if (!Array.isArray(data)) return [];
  return data.slice(0, 12).map((row) => {
    const show = row.show || {};
    const year = (show.premiered || "").slice(0, 4);
    const imgUrl = ((show.image || {}).medium || (show.image || {}).original || "").replace("http://", "https://");
    return {
      external_id: `tvmaze_${show.id}`,
      imdb_id: show.externals?.imdb || "",
      tvmaze_id: show.id || null,
      media_type: "series",
      title_it: show.name || "",
      title_original: show.name || "",
      aliases: [],
      year,
      poster: imgUrl,
      genre: (show.genres || []).join(", ") || "Serie TV",
      description: (show.summary || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220),
      tvmaze_weight: Number(show.weight || 0),
      has_it_title: false,
      src: "TVM",
    };
  }).filter((x) => x.title_it);
}

async function directMobileSearch4G(query, libraryItems) {
  const rawTrimmed = String(query || "").trim();
  let cq = cleanSearchInputClient(rawTrimmed);
  let ungluedQ = "";
  if (!/\s/.test(rawTrimmed) && rawTrimmed.length >= 8) {
    const ug = rawTrimmed.replace(/(.{3,})(and|end)(.{3,})/i, "$1 & $3");
    if (ug !== rawTrimmed) ungluedQ = cleanSearchInputClient(ug);
  }
  const coreQ = coreSearchInputClient(rawTrimmed);
  const qNorm = normalizeTitleClient(cq || rawTrimmed);
  if (!qNorm) return { results: [] };

  const results = [];
  const bridgeQueries = [];
  const suggestions = [];

  // Extract subtitle variant for franchises (e.g. "Lupin III - Il castello di Cagliostro" -> "Il castello di Cagliostro")
  const mSub = rawTrimmed.match(/^(?:lupin(?:\s+(?:iii|3|terzo))?|star\s+wars|dragon\s+ball(?:\s+(?:z|super|gt))?|rocky(?:\s+\d+)?|harry\s+potter|detective\s+conan)\s*[-:–]?\s*(.+)$/i);
  const subTitle = (mSub && mSub[1] && mSub[1].trim().length >= 3) ? cleanSearchInputClient(mSub[1]) : "";

  // 1. Check Curated Sagas & Italian Alias Overrides
  const { tokens: qTokens, core: qCore } = cleanTokensClient(cq || rawTrimmed);
  const qStr = qTokens.join(" ");
  const qCoreStr = qCore.join(" ");
  const matchedSagaIds = new Set();
  SAGA_DEFINITIONS.forEach((sagaDef) => {
    const isMatch = sagaDef.names.some((sname) => {
      const { tokens: sTokens, core: sCore } = cleanTokensClient(sname);
      return sTokens.join(" ") === qStr || (sCore.length > 0 && sCore.join(" ") === qCoreStr);
    });
    if (isMatch) matchedSagaIds.add(sagaDef.id);
  });

  CLIENT_SAGAS.forEach((al) => {
    const isSagaMatch = Boolean(al.saga && matchedSagaIds.has(al.saga));
    const normIt = normalizeTitleClient(al.it);
    const normOrig = normalizeTitleClient(al.orig);
    const isDirectMatch =
      fuzzyMatchTitleClient(cq, al.it) ||
      fuzzyMatchTitleClient(cq, al.orig) ||
      (ungluedQ && (fuzzyMatchTitleClient(ungluedQ, al.it) || fuzzyMatchTitleClient(ungluedQ, al.orig))) ||
      (subTitle && (fuzzyMatchTitleClient(subTitle, al.it) || fuzzyMatchTitleClient(subTitle, al.orig))) ||
      (qStr && (normIt.includes(qStr) || normOrig.includes(qStr))) ||
      (al.aliases && al.aliases.some((a) =>
        fuzzyMatchTitleClient(cq, a) ||
        (subTitle && fuzzyMatchTitleClient(subTitle, a)) ||
        (qStr && normalizeTitleClient(a).includes(qStr))
      ));

    if (isSagaMatch || isDirectMatch) {
      results.push({
        external_id: "saga_" + normOrig.replace(/\s+/g, "_"),
        imdb_id: "",
        tvmaze_id: null,
        media_type: al.type,
        title_it: al.it,
        title_original: al.orig,
        year: al.year,
        poster: al.poster || "",
        genre: al.type === "series" ? "Serie TV" : "Film",
        description: `${al.type === "series" ? "Serie TV" : "Film"} (${al.year}) • Titolo orig.: ${al.orig}`,
        is_saga: Boolean(al.saga),
        saga_rank: al.rank || 1,
        aliases: al.aliases || [],
        has_it_title: true,
        src: "SAGA",
      });
    }
  });

  // 2. Phase 1 Parallel Queries: Wikidata structured media + TVMaze + AniList + static EPG
  const wdQids = [];
  const wdQidSet = new Set();
  const addQids = (arr) => {
    (arr || []).forEach((q) => {
      if (q && /^Q\d+$/.test(q) && !wdQidSet.has(q)) {
        wdQidSet.add(q);
        wdQids.push(q);
      }
    });
  };

  const extTermsSearched = new Set();
  const extJobs = [];
  const queueExt = (term) => {
    const k = String(term || "").trim().toLowerCase();
    if (!k || extTermsSearched.has(k)) return;
    extTermsSearched.add(k);
    extJobs.push(fetchTvMazeShowsClient(term).then((arr) => results.push(...arr)));
    extJobs.push(fetchAniListAnimeClient(term).then((arr) => results.push(...arr)));
  };
  queueExt(cq || rawTrimmed);
  if (ungluedQ) queueExt(ungluedQ);
  if (subTitle && subTitle.toLowerCase() !== cq.toLowerCase()) queueExt(subTitle);

  const wdSearchJobs = [];
  const queueWdSr = (sr, limit = 35) => {
    wdSearchJobs.push(
      fetchJsonSafeClient(`https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${sr} ${WD_STMT}`)}&srlimit=${limit}&format=json&origin=*`)
        .then((d) => addQids((d?.query?.search || []).map((h) => h.title)))
    );
  };
  const queueWdWb = (term, limit = 25) => {
    wdSearchJobs.push(
      fetchJsonSafeClient(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(term)}&language=it&uselang=it&limit=${limit}&format=json&origin=*`)
        .then((d) => addQids((d?.search || []).map((h) => h.id)))
    );
  };

  queueWdSr(cq || rawTrimmed, 35);
  if (coreQ && coreQ.toLowerCase() !== cq.toLowerCase()) queueWdSr(coreQ, 25);
  if (subTitle) {
    queueWdSr(subTitle, 25);
    queueWdWb(subTitle, 20);
  }
  if (ungluedQ) {
    queueWdSr(ungluedQ, 20);
    queueWdWb(ungluedQ, 15);
  }
  if (qNorm === "lupin") queueWdSr("Lupin III", 35);
  queueWdWb(rawTrimmed, 25);

  let epgEvents = [];
  const epgJob = fetchStaticEpgEvents().then((evs) => { epgEvents = evs || []; }).catch(() => { });

  await Promise.allSettled([...wdSearchJobs, ...extJobs, epgJob]);

  // 3. Typo / Low-Recall Fallback (~2 fuzzy Wikidata + itwiki/enwiki spellcheck)
  if (wdQidSet.size < 8 && cq.length >= 4) {
    const fuzTokens = cq.split(" ").map((w) => (w.length >= 4 ? `${w}~2` : w)).join(" ");
    const spellJobs = [
      fetchJsonSafeClient(`https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${fuzTokens} ${WD_STMT}`)}&srlimit=25&format=json&origin=*`)
        .then((d) => addQids((d?.query?.search || []).map((h) => h.title))),
      fetchJsonSafeClient(`https://it.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cq)}&srlimit=1&format=json&origin=*`)
        .then((d) => {
          const sug = (d?.query?.searchinfo?.suggestion || "").replace(/<[^>]+>/g, "").trim();
          if (sug && normalizeTitleClient(sug) !== qNorm && !suggestions.includes(sug)) suggestions.push(sug);
        }),
      fetchJsonSafeClient(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cq)}&srlimit=1&format=json&origin=*`)
        .then((d) => {
          const sug = (d?.query?.searchinfo?.suggestion || "").replace(/<[^>]+>/g, "").trim();
          if (sug && normalizeTitleClient(sug) !== qNorm && !suggestions.includes(sug)) suggestions.push(sug);
        }),
    ];
    await Promise.allSettled(spellJobs);

    if (suggestions.length > 0) {
      const sug = suggestions[0];
      const followJobs = [
        fetchJsonSafeClient(`https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${sug} ${WD_STMT}`)}&srlimit=25&format=json&origin=*`)
          .then((d) => addQids((d?.query?.search || []).map((h) => h.title))),
        fetchJsonSafeClient(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(sug)}&language=it&uselang=it&limit=15&format=json&origin=*`)
          .then((d) => addQids((d?.search || []).map((h) => h.id))),
      ];
      if (!extTermsSearched.has(sug.toLowerCase())) {
        extTermsSearched.add(sug.toLowerCase());
        followJobs.push(fetchTvMazeShowsClient(sug).then((arr) => results.push(...arr)));
        followJobs.push(fetchAniListAnimeClient(sug).then((arr) => results.push(...arr)));
      }
      await Promise.allSettled(followJobs);
    }
  }

  // 4. Hydrate Wikidata Entities (strict P31 filtering, Italian labels & aliases, bridge extraction)
  const qidToFetch = wdQids.slice(0, 80);
  const itwikiMap = {};
  const enwikiMap = {};
  if (qidToFetch.length > 0) {
    const chunks = [];
    for (let i = 0; i < qidToFetch.length; i += 40) {
      chunks.push(qidToFetch.slice(i, i + 40));
    }
    const entityResponses = await Promise.all(
      chunks.map((ch) =>
        fetchJsonSafeClient(
          `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ch.join("%7C")}&props=labels|aliases|descriptions|claims|sitelinks&languages=it|mul|en&format=json&origin=*`
        )
      )
    );
    const ents = {};
    entityResponses.forEach((resp) => {
      if (resp && resp.entities) Object.assign(ents, resp.entities);
    });

    for (const qid of qidToFetch) {
      const e = ents[qid];
      if (!e || e.missing) continue;
      const claims = e.claims || {};
      const p31s = (claims.P31 || [])
        .map((c) => c?.mainsnak?.datavalue?.value?.id)
        .filter(Boolean);

      if (p31s.some((p) => WD_REJECT_P31.has(p))) continue;

      const lbls = e.labels || {};
      const itLbl = (lbls.it && lbls.it.value) || "";
      const mulLbl = (lbls.mul && lbls.mul.value) || "";
      const enLbl = (lbls.en && lbls.en.value) || mulLbl || "";
      const itw = (e.sitelinks?.itwiki?.title) || "";
      const enw = (e.sitelinks?.enwiki?.title) || "";
      const itwClean = itw.replace(/\s*\([^)]*\)\s*$/, "").trim();
      const enwClean = enw.replace(/\s*\([^)]*\)\s*$/, "").trim();

      const aliasSet = new Set();
      ["it", "en", "mul"].forEach((lang) => {
        (e.aliases?.[lang] || []).forEach((a) => {
          if (a?.value) aliasSet.add(a.value);
        });
      });
      [itLbl, itwClean, enLbl, enwClean, mulLbl].forEach((t) => {
        if (t) aliasSet.add(t);
      });
      const aliases = Array.from(aliasSet);

      if (!p31s.some((p) => WD_ALL_MEDIA_P31.has(p))) {
        if (p31s.some((p) => WD_BRIDGE_P31.has(p)) && enLbl) {
          const normEn = normalizeTitleClient(enLbl);
          if (
            normEn &&
            normEn !== qNorm &&
            !qNorm.includes(normEn) &&
            scoreCandidateListClient(rawTrimmed, [itLbl, itwClean], aliases) >= 750 &&
            !bridgeQueries.includes(enLbl) &&
            bridgeQueries.length < 2
          ) {
            bridgeQueries.push(enLbl);
          }
        }
        continue;
      }

      const hasSeries = p31s.some((p) => WD_SERIES_P31.has(p));
      const hasExplicitFilm = p31s.some((p) => WD_MOVIE_EXPLICIT_P31.has(p));
      const mtype = hasSeries && !hasExplicitFilm ? "series" : "movie";

      let titleIt = "";
      if (!itLbl || (enLbl && itLbl.toLowerCase() === enLbl.toLowerCase() && itwClean && itwClean.toLowerCase() !== enLbl.toLowerCase())) {
        titleIt = itwClean || itLbl || mulLbl || enLbl || enwClean;
      } else {
        titleIt = itLbl || mulLbl || itwClean || enLbl || enwClean;
      }
      const titleOrig = enLbl || enwClean || titleIt;
      if (!titleIt) continue;
      const hasItTitle = Boolean(itLbl || itwClean);

      let year = "";
      for (const pid of ["P577", "P580"]) {
        const tv = claims[pid]?.[0]?.mainsnak?.datavalue?.value?.time || "";
        const ym = tv.match(/^[+-]?(\d{4})/);
        if (ym) {
          year = ym[1];
          break;
        }
      }

      const imdbId = claims.P345?.[0]?.mainsnak?.datavalue?.value || "";
      const p18 = claims.P18?.[0]?.mainsnak?.datavalue?.value || "";
      let poster = "";
      if (p18 && ![".svg", "logo", "wordmark", "map_", "flag_"].some((b) => p18.toLowerCase().includes(b))) {
        poster = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p18)}?width=400`;
      }

      const descVal = (e.descriptions?.it?.value || e.descriptions?.en?.value || "").trim();
      const descLower = descVal.toLowerCase();
      if (descLower.includes("pornographic") || descLower.includes("pornografico") || descLower.includes("adult film") || descLower.includes("hardcore")) {
        continue;
      }
      const descNice = descVal ? descVal.charAt(0).toUpperCase() + descVal.slice(1) : (mtype === "series" ? "Serie TV" : "Film");
      const sl = Object.keys(e.sitelinks || {}).length;

      const item = {
        external_id: `wd_${qid}`,
        imdb_id: typeof imdbId === "string" ? imdbId : "",
        tvmaze_id: null,
        media_type: mtype,
        title_it: titleIt,
        title_original: titleOrig,
        aliases,
        year,
        poster,
        genre: mtype === "series" ? "Serie TV" : "Film",
        description: `${descNice}${year ? ` (${year})` : ""}`,
        sitelinks_count: sl,
        has_it_title: hasItTitle,
        src: "WD",
      };

      const matchScore = scoreCandidateListClient(rawTrimmed, [titleIt, itwClean, enLbl], aliases);
      const sugMatch = suggestions.some((s) => scoreCandidateListClient(s, [titleIt, titleOrig], aliases) > 0);
      if (matchScore > 0 || sugMatch) {
        if (itw) itwikiMap[itw] = item;
        if (enw) enwikiMap[enw] = item;
        if (matchScore >= 750 && enLbl) {
          const normEn = normalizeTitleClient(enLbl);
          if (normEn && normEn !== qNorm && !qNorm.includes(normEn) && !bridgeQueries.includes(enLbl) && bridgeQueries.length < 2) {
            bridgeQueries.push(enLbl);
          }
        }
      }
      results.push(item);
    }
  }

  // 5. Phase 2 In Parallel: Batch itwiki + enwiki pageimages posters (with pilicense=any) + Validated Bridge Query on TVMaze & AniList
  const phase2Jobs = [];
  const addWikiPosterJobs = (host, wmap) => {
    const titles = Object.keys(wmap).slice(0, 70);
    for (let i = 0; i < titles.length; i += 35) {
      const batch = titles.slice(i, i + 35);
      phase2Jobs.push(
        fetchJsonSafeClient(
          `https://${host}/w/api.php?action=query&titles=${encodeURIComponent(batch.join("|"))}&prop=pageimages&pilicense=any&pithumbsize=500&format=json&origin=*`
        ).then((piData) => {
          const pages = piData?.query?.pages || {};
          Object.values(pages).forEach((p) => {
            const t = p?.title;
            const src = p?.thumbnail?.source || "";
            const target = t && wmap[t];
            if (target && src && getPosterQualityRank(src) > getPosterQualityRank(target.poster)) {
              target.poster = src;
            }
          });
        })
      );
    }
  };
  addWikiPosterJobs("it.wikipedia.org", itwikiMap);
  addWikiPosterJobs("en.wikipedia.org", enwikiMap);

  if (bridgeQueries.length > 0) {
    const bq = bridgeQueries[0];
    if (!extTermsSearched.has(bq.toLowerCase())) {
      extTermsSearched.add(bq.toLowerCase());
      phase2Jobs.push(fetchTvMazeShowsClient(bq).then((arr) => results.push(...arr)));
      phase2Jobs.push(fetchAniListAnimeClient(bq).then((arr) => results.push(...arr)));
    }
  }
  if (phase2Jobs.length > 0) {
    await Promise.allSettled(phase2Jobs);
  }

  // 6. Include Live 7-day DTT EPG Events matching query (strictly movie/series)
  if (Array.isArray(epgEvents) && epgEvents.length > 0) {
    const seenEpg = new Set();
    for (const ev of epgEvents) {
      if (ev.media_type !== "movie" && ev.media_type !== "series") continue;
      const evNorm = ev.norm_title || normalizeTitleClient(ev.title || "");
      if (!evNorm || seenEpg.has(evNorm)) continue;
      if (fuzzyMatchTitleClient(rawTrimmed, ev.title || evNorm)) {
        seenEpg.add(evNorm);
        results.push({
          external_id: `epg_${evNorm.replace(/\s+/g, "_")}`,
          imdb_id: "",
          tvmaze_id: null,
          media_type: ev.media_type,
          title_it: ev.title,
          title_original: ev.title,
          aliases: [],
          year: "",
          poster: ev.poster || "",
          genre: ev.genre || (ev.media_type === "series" ? "Serie TV" : "Film"),
          description: `📡 In onda su ${ev.channel_name} (Canale ${ev.lcn}) • ${ev.description || ""}`.slice(0, 220),
          has_it_title: true,
          src: "EPG",
        });
      }
    }
  }

  // 7. Honest Scoring (> 0 ONLY, no junk fallback) & Prominence Sort
  results.forEach((r) => {
    r.relevance_score = computeRelevanceScoreClient(rawTrimmed, r, bridgeQueries, suggestions);
  });

  const relevantResults = results.filter((r) => (r.relevance_score || 0) > 0);
  relevantResults.sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
    return getPosterQualityRank(b.poster) - getPosterQualityRank(a.poster);
  });

  // 8. Year-Guarded Cross-Language Deduplication & Library Status Sync
  const libMap = {};
  (libraryItems || []).forEach((it) => {
    const m = it.media_type || "movie";
    const addKey = (t) => {
      const n = normalizeTitleClient(t);
      if (n) {
        libMap[`${m}_${n}`] = it;
        const sc = stripConjunctionsClient(n);
        if (sc) libMap[`${m}_${sc}`] = it;
      }
    };
    addKey(it.title_it);
    addKey(it.title_original);
    if (Array.isArray(it.aliases)) it.aliases.forEach(addKey);
  });

  const buildItemKeys = (item) => {
    const keys = new Set();
    const pushK = (v, minLen = 1) => {
      const n = normalizeTitleClient(v);
      if (n && n.length >= minLen) {
        keys.add(n);
        const sc = stripConjunctionsClient(n);
        if (sc && sc.length >= minLen) keys.add(sc);
      }
    };
    pushK(item.title_it, 1);
    pushK(item.title_original, 1);
    (item.aliases || []).slice(0, 12).forEach((a) => pushK(a, 4));
    return keys;
  };

  const dedup = [];
  for (const r of relevantResults) {
    const rKeys = buildItemKeys(r);
    const rYear = /^\d{4}$/.test(String(r.year || "").trim()) ? parseInt(r.year, 10) : 0;
    const rImdb = String(r.imdb_id || "").trim();
    const rExt = String(r.external_id || "");
    const rSrc = String(r.src || "");

    let matchedEx = null;
    for (const ex of dedup) {
      if (ex.media_type !== r.media_type) continue;
      const exImdb = String(ex.imdb_id || "").trim();
      const exExt = String(ex.external_id || "");
      const exSrc = String(ex.src || "");

      if (rImdb && exImdb) {
        if (rImdb === exImdb) {
          matchedEx = ex;
          break;
        } else {
          continue;
        }
      }

      if (rExt.startsWith("wd_") && exExt.startsWith("wd_") && rExt !== exExt) {
        continue;
      }

      const exYear = /^\d{4}$/.test(String(ex.year || "").trim()) ? parseInt(ex.year, 10) : 0;
      if (exYear && rYear) {
        if (Math.abs(exYear - rYear) > 1) continue;
      } else if ((exYear && !rYear) || (rYear && !exYear)) {
        if (!["ALIAS", "EPG"].includes(exSrc) && !["ALIAS", "EPG"].includes(rSrc)) {
          continue;
        }
      }

      if ((rSrc === "ANI") !== (exSrc === "ANI")) {
        const other = rSrc === "ANI" ? ex : r;
        const otherBlob = `${other.genre || ""} ${other.description || ""}`.toLowerCase();
        if (!["anime", "animat", "animazione", "manga", "japanese"].some((w) => otherBlob.includes(w))) {
          continue;
        }
      }

      const exKeys = buildItemKeys(ex);
      let sharesKey = false;
      for (const k of rKeys) {
        if (exKeys.has(k)) {
          sharesKey = true;
          break;
        }
      }
      if (sharesKey) {
        matchedEx = ex;
        break;
      }
    }

    if (matchedEx) {
      if (getPosterQualityRank(r.poster) > getPosterQualityRank(matchedEx.poster)) {
        matchedEx.poster = r.poster;
      } else if (!matchedEx.poster && r.poster) {
        matchedEx.poster = r.poster;
      }
      if (!matchedEx.year && r.year) matchedEx.year = r.year;
      if (!matchedEx.tvmaze_id && r.tvmaze_id) matchedEx.tvmaze_id = r.tvmaze_id;
      if (!matchedEx.imdb_id && r.imdb_id) matchedEx.imdb_id = r.imdb_id;

      const exDesc = matchedEx.description || "";
      const rDesc = r.description || "";
      const exIsItDesc = Boolean(matchedEx.has_it_title) || exDesc.startsWith("Film ") || exDesc.startsWith("Serie ") || exDesc.startsWith("📡");
      const rIsItDesc = Boolean(r.has_it_title) || rDesc.startsWith("Film ") || rDesc.startsWith("Serie ") || rDesc.startsWith("📡");
      if (
        rDesc &&
        ((rIsItDesc && !exIsItDesc) ||
          (rIsItDesc === exIsItDesc && rDesc.length > exDesc.length && !rDesc.includes("Titolo orig.:")) ||
          (exDesc.includes("Titolo orig.:") && rDesc.length > 15))
      ) {
        matchedEx.description = rDesc;
      }

      if (!matchedEx.has_it_title && r.has_it_title) {
        matchedEx.title_it = r.title_it;
        matchedEx.has_it_title = true;
      }
      if ((r.sitelinks_count || 0) > (matchedEx.sitelinks_count || 0)) {
        matchedEx.sitelinks_count = r.sitelinks_count;
      }
      if ((r.anilist_popularity || 0) > (matchedEx.anilist_popularity || 0)) {
        matchedEx.anilist_popularity = r.anilist_popularity;
      }
      if ((r.tvmaze_weight || 0) > (matchedEx.tvmaze_weight || 0)) {
        matchedEx.tvmaze_weight = r.tvmaze_weight;
      }
      if (r.is_saga) {
        matchedEx.is_saga = true;
        matchedEx.saga_rank = r.saga_rank || 1;
      }
      if (Array.isArray(r.aliases) && r.aliases.length > 0) {
        const mergedAl = new Set([...(matchedEx.aliases || []), ...r.aliases]);
        matchedEx.aliases = Array.from(mergedAl);
      }
    } else {
      const m = r.media_type || "movie";
      const nIt = normalizeTitleClient(r.title_it);
      const nOr = normalizeTitleClient(r.title_original);
      const exLib =
        libMap[`${m}_${nIt}`] ||
        libMap[`${m}_${nOr}`] ||
        libMap[`${m}_${stripConjunctionsClient(nIt)}`] ||
        libMap[`${m}_${stripConjunctionsClient(nOr)}`];
      r.in_library_status = exLib ? exLib.status : null;
      r.in_library_id = exLib ? exLib.id : null;
      r.watched_episodes_count = exLib ? (exLib.watched_episodes_count || (exLib.watched_episodes ? exLib.watched_episodes.length : 0)) : 0;
      dedup.push(r);
    }
  }

  dedup.forEach((d) => {
    d.relevance_score = computeRelevanceScoreClient(rawTrimmed, d, bridgeQueries, suggestions);
  });
  dedup.sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
    return getPosterQualityRank(b.poster) - getPosterQualityRank(a.poster);
  });

  return { results: dedup.slice(0, 100) };
}

async function handleClientCloudPost(url, body) {
  const snap = getLocalSnapshot();
  snap.library = snap.library || [];
  snap.deleted_keys = snap.deleted_keys || [];

  if (url === "/api/library") {
    const title_it = (body.title_it || body.title || "").trim();
    const media_type = body.media_type || "movie";
    const status = body.status || "wishlist";
    const norm = normalizeTitleClient(title_it);
    const itemKey = `${media_type}_${norm}`;

    // CRITICAL: Unblock! If the item was previously deleted, remove its key from deleted_keys
    snap.deleted_keys = (snap.deleted_keys || []).filter((k) => k !== itemKey && k !== norm);

    let item = snap.library.find((x) => x.media_type === media_type && normalizeTitleClient(x.title_it) === norm);
    if (item) {
      item.status = status;
    } else {
      item = {
        id: Date.now(),
        external_id: body.external_id || `mobile_${media_type}_${norm.replace(/\s+/g, "_")}`,
        tvmaze_id: body.tvmaze_id || null,
        media_type,
        status,
        title_it,
        title_original: body.title_original || title_it,
        aliases: [norm, normalizeTitleClient(body.title_original || title_it)],
        year: body.year || "",
        poster: body.poster || "",
        genre: body.genre || (media_type === "series" ? "Serie TV" : "Film"),
        description: body.description || "",
        watched_episodes: [],
        watched_episodes_count: 0,
        upcoming_airings: [],
        created_at: new Date().toISOString(),
      };
      snap.library.unshift(item);
    }

    if (media_type === "series") {
      if (status === "watched") {
        const eps = await fetchSeriesEpisodesClient4G(item.title_it, item.title_original, item.tvmaze_id);
        item.watched_episodes = eps.map((ep) => `S${ep.season}E${ep.episode}`);
        item.watched_episodes_count = item.watched_episodes.length;
      } else if (status === "wishlist") {
        item.watched_episodes = [];
        item.watched_episodes_count = 0;
      }
    }

    // Save locally immediately to guarantee persistence on reload
    snap.updated_at = Date.now() / 1000;
    saveLocalSnapshot(snap);
    pushCloudSnapshotClient(state.syncCode, snap).catch(() => {});
    return {
      ok: true,
      id: item.id,
      status,
      title_it,
      watched_episodes_count: item.watched_episodes_count || 0,
    };
  }

  if (url === "/api/library/status") {
    const item = snap.library.find((x) => Number(x.id) === Number(body.id));
    if (item && body.status) {
      item.status = body.status;
      const k = `${item.media_type || "movie"}_${normalizeTitleClient(item.title_it)}`;
      snap.deleted_keys = (snap.deleted_keys || []).filter((x) => x !== k);
      if (item.media_type === "series") {
        if (body.status === "watched") {
          const eps = await fetchSeriesEpisodesClient4G(item.title_it, item.title_original, item.tvmaze_id);
          item.watched_episodes = eps.map((ep) => `S${ep.season}E${ep.episode}`);
          item.watched_episodes_count = item.watched_episodes.length;
        } else if (body.status === "wishlist") {
          item.watched_episodes = [];
          item.watched_episodes_count = 0;
        }
      }
    }
    snap.updated_at = Date.now() / 1000;
    saveLocalSnapshot(snap);
    pushCloudSnapshotClient(state.syncCode, snap).catch(() => {});
    return { ok: true };
  }

  if (url === "/api/library/delete") {
    const normTarget = normalizeTitleClient(body.title_it || body.title || "");
    const idx = snap.library.findIndex(
      (x) =>
        (body.id && Number(x.id) === Number(body.id)) ||
        (normTarget && normalizeTitleClient(x.title_it) === normTarget && (!body.media_type || x.media_type === body.media_type))
    );
    if (idx !== -1) {
      const removed = snap.library[idx];
      snap.deleted_keys.push(`${removed.media_type}_${normalizeTitleClient(removed.title_it)}`);
      snap.library.splice(idx, 1);
    }
    await pushCloudSnapshotClient(state.syncCode, snap);
    return { ok: true };
  }

  if (url === "/api/library/batch") {
    const action = body.action;
    const items = body.items || [];
    if (action === "restore" && Array.isArray(items) && items.length > 0) {
      snap.library = items;
      snap.deleted_keys = [];
      snap.updated_at = Date.now() / 1000;
    } else {
      for (const it of items) {
        const title_it = (it.title_it || it.title || "").trim();
        if (!title_it) continue;
        const media_type = it.media_type || "movie";
        const norm = normalizeTitleClient(title_it);
        const idx = snap.library.findIndex((x) => x.media_type === media_type && normalizeTitleClient(x.title_it) === norm);
        if (action === "delete") {
          if (idx !== -1) {
            snap.deleted_keys.push(`${media_type}_${norm}`);
            snap.library.splice(idx, 1);
          }
        } else {
          const itemKey = `${media_type}_${norm}`;
          snap.deleted_keys = (snap.deleted_keys || []).filter((k) => k !== itemKey && k !== norm);
          let targetItem;
          if (idx !== -1) {
            snap.library[idx].status = action;
            targetItem = snap.library[idx];
          } else {
            targetItem = {
              id: Date.now() + Math.floor(Math.random() * 10000),
              external_id: it.external_id || `mobile_${media_type}_${norm.replace(/\s+/g, "_")}`,
              tvmaze_id: it.tvmaze_id || null,
              media_type,
              status: action,
              title_it,
              title_original: it.title_original || title_it,
              aliases: [norm, normalizeTitleClient(it.title_original || title_it)],
              year: it.year || "",
              poster: it.poster || "",
              genre: it.genre || (media_type === "series" ? "Serie TV" : "Film"),
              description: it.description || "",
              watched_episodes: [],
              watched_episodes_count: 0,
              upcoming_airings: [],
              created_at: new Date().toISOString(),
            };
            snap.library.unshift(targetItem);
          }
          if (media_type === "series") {
            if (action === "watched") {
              const eps = await fetchSeriesEpisodesClient4G(targetItem.title_it, targetItem.title_original, targetItem.tvmaze_id);
              targetItem.watched_episodes = eps.map((ep) => `S${ep.season}E${ep.episode}`);
              targetItem.watched_episodes_count = targetItem.watched_episodes.length;
            } else if (action === "wishlist") {
              targetItem.watched_episodes = [];
              targetItem.watched_episodes_count = 0;
            }
          }
        }
      }
    }
    snap.updated_at = Date.now() / 1000;
    saveLocalSnapshot(snap);
    pushCloudSnapshotClient(state.syncCode, snap).catch(() => {});
    return { ok: true, action };
  }

  if (url === "/api/episodes/toggle" || url === "/api/episodes/mark_season" || url === "/api/episodes/mark_all") {
    let seriesId = Number(body.series_id || 0);
    const meta = body.series_meta || {};
    const createdFromSearch = Boolean(body.created_from_search);
    const totalEpisodes = Number(body.total_episodes || 0);
    let item = snap.library.find((x) => Number(x.id) === seriesId);
    if (!item && meta.title_it) {
      const norm = normalizeTitleClient(meta.title_it);
      item = snap.library.find((x) => x.media_type === "series" && normalizeTitleClient(x.title_it) === norm);
      if (!item && body.watched) {
        item = {
          id: Date.now(),
          external_id: meta.external_id || `mobile_series_${norm.replace(/\s+/g, "_")}`,
          tvmaze_id: meta.tvmaze_id || null,
          media_type: "series",
          status: "watching",
          title_it: meta.title_it,
          title_original: meta.title_original || meta.title_it,
          aliases: [norm, normalizeTitleClient(meta.title_original || meta.title_it)],
          year: meta.year || "",
          poster: meta.poster || "",
          genre: meta.genre || "Serie TV",
          description: meta.description || "",
          watched_episodes: [],
          watched_episodes_count: 0,
          upcoming_airings: [],
          created_at: new Date().toISOString(),
        };
        snap.library.unshift(item);
      }
    }
    if (!item) return { ok: true, status: null, series_id: 0, watched_count: 0 };

    if (url === "/api/episodes/mark_all") {
      if (body.watched) {
        let allEps = (state.activeSeriesModal && state.activeSeriesModal.episodes && state.activeSeriesModal.episodes.length > 0)
          ? state.activeSeriesModal.episodes
          : await fetchSeriesEpisodesClient4G(item.title_it, item.title_original, item.tvmaze_id);
        item.watched_episodes = (allEps || []).map((e) => `S${e.season}E${e.episode}`);
        item.watched_episodes_count = item.watched_episodes.length;
        item.status = "watched";
      } else {
        item.watched_episodes = [];
        item.watched_episodes_count = 0;
        if (createdFromSearch) {
          const idx = snap.library.findIndex((x) => Number(x.id) === Number(item.id));
          if (idx !== -1) snap.library.splice(idx, 1);
          await pushCloudSnapshotClient(state.syncCode, snap);
          return { ok: true, status: null, series_id: 0, watched_count: 0 };
        }
        item.status = "wishlist";
      }
      await pushCloudSnapshotClient(state.syncCode, snap);
      return {
        ok: true,
        status: item.status,
        series_id: item.id,
        watched_count: item.watched_episodes_count,
      };
    }

    const watchedSet = new Set(Array.isArray(item.watched_episodes) ? item.watched_episodes : []);
    if (url === "/api/episodes/toggle") {
      const key = `S${Number(body.season || 1)}E${Number(body.episode || 1)}`;
      if (body.watched) watchedSet.add(key);
      else watchedSet.delete(key);
    } else {
      const sNum = Number(body.season || 1);
      (body.episodes || []).forEach((eNum) => {
        const key = `S${sNum}E${Number(eNum)}`;
        if (body.watched) watchedSet.add(key);
        else watchedSet.delete(key);
      });
    }

    item.watched_episodes = Array.from(watchedSet);
    item.watched_episodes_count = item.watched_episodes.length;

    if (item.watched_episodes_count === 0) {
      if (createdFromSearch) {
        const idx = snap.library.findIndex((x) => Number(x.id) === Number(item.id));
        if (idx !== -1) snap.library.splice(idx, 1);
        await pushCloudSnapshotClient(state.syncCode, snap);
        return { ok: true, status: null, series_id: 0, watched_count: 0 };
      }
      item.status = "wishlist";
    } else if (totalEpisodes > 0 && item.watched_episodes_count >= totalEpisodes) {
      item.status = "watched";
    } else {
      item.status = "watching";
    }

    await pushCloudSnapshotClient(state.syncCode, snap);
    return {
      ok: true,
      status: item.status,
      series_id: item.id,
      watched_count: item.watched_episodes_count,
    };
  }

  return { ok: true };
}

// ============================================================================
// INITIALIZATION
// ============================================================================
function getCurrentItalianDateIso() {
  try {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

async function initApp() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        reg.update().catch(() => { });
      })
      .catch(() => { });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  // Check if URL has ?sync=nextontv-xxxx
  const urlParams = new URLSearchParams(window.location.search);
  const syncParam = urlParams.get("sync");
  if (syncParam) {
    state.syncCode = syncParam.trim().toLowerCase();
    localStorage.setItem("nextontv_sync_code", "shynicy_nextontv");
  }

  setupNavigationAndEvents();

  const [chRes, stRes, remRes] = await Promise.all([
    apiGet("/api/channels"),
    apiGet("/api/status"),
    apiGet("/api/reminders"),
  ]);

  state.channels = chRes.channels || [];
  state.startDate = stRes.start_date || getCurrentItalianDateIso();
  state.days = stRes.days || [];
  state.reminders = remRes.reminders || [];
  state.mobileUrl = stRes.mobile_url || window.location.origin;
  state.publicUrl = stRes.public_url || "";
  if (!state.syncCode || state.syncCode.startsWith("notv_") || state.syncCode.startsWith("user_")) {
    state.syncCode = (stRes && stRes.sync_code) || "shynicy_nextontv";
    localStorage.setItem("nextontv_sync_code", "shynicy_nextontv");
  }

  const remBadge = document.getElementById("reminders-count-badge");
  if (remBadge) {
    remBadge.textContent = state.reminders.length;
  }
  populateChannelDropdowns();
  renderDaysStrips();

  await Promise.all([loadMatches(false), loadLibrary()]);

  // Automatically check every 60s and on tab wake-up if the Italian date (Europe/Rome) has changed
  const checkItalianDateRollover = () => {
    const todayIt = getCurrentItalianDateIso();
    if (state.startDate && todayIt !== state.startDate) {
      state.startDate = todayIt;
      state.matchDay = "all";
      loadMatches(false);
      loadLibrary();
    }
  };
  setInterval(checkItalianDateRollover, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkItalianDateRollover();
  });

  const pendingReloadToast = sessionStorage.getItem("nextontv_reload_toast");
  if (pendingReloadToast) {
    sessionStorage.removeItem("nextontv_reload_toast");
    setTimeout(() => {
      showToast(pendingReloadToast);
    }, 400);
  }
}

function populateChannelDropdowns() {
  const selMatch = document.getElementById("match-channel");
  if (!selMatch) return;
  const visibleChannels = (state.channels || []).filter(
    (c) => state.includeSky || (!c.is_sky && Number(c.lcn || 0) < 100)
  );
  if (!state.includeSky && state.matchChannel && Number(state.matchChannel) >= 100) {
    state.matchChannel = "";
  }
  const defaultLabel = state.includeSky
    ? "📺 Tutti i canali (DTT LCN 1–70 + 🛰️ Sky)"
    : "📺 Tutti i canali del DTT (LCN 1–70)";
  const html =
    `<option value="">${defaultLabel}</option>` +
    visibleChannels
      .map((c) => {
        const isSkyCh = Boolean(c.is_sky || Number(c.lcn || 0) >= 100);
        const prefix = isSkyCh ? `🛰️ Sky ${c.lcn}` : `Canale ${c.lcn}`;
        return `<option value="${c.lcn}" ${String(state.matchChannel) === String(c.lcn) ? "selected" : ""}>${prefix} — ${escapeHtml(c.name)}</option>`;
      })
      .join("");
  selMatch.innerHTML = html;
}

function renderDaysStrips() {
  const renderStrip = (containerId, activeDay, onSelect) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = `<button class="day-pill ${activeDay === "all" ? "active" : ""}" data-day="all">Tutti i 7 giorni</button>`;
    state.days.forEach((d, idx) => {
      const label = idx === 0 ? `Oggi • ${formatItalianDate(d)}` : formatItalianDate(d);
      html += `<button class="day-pill ${activeDay === d ? "active" : ""}" data-day="${d}">${label}</button>`;
    });
    el.innerHTML = html;
    el.querySelectorAll(".day-pill").forEach((btn) => {
      btn.addEventListener("click", () => onSelect(btn.dataset.day));
    });
  };

  renderStrip("match-days-strip", state.matchDay, (day) => {
    state.matchDay = day;
    renderDaysStrips();
    loadMatches(false);
  });
}

// ============================================================================
// TAB 1: 7-DAY PALINSESTO MATCHER ("IN ONDA")
// ============================================================================
async function loadMatches(forceRefresh = false) {
  const container = document.getElementById("matches-results-container");
  if (forceRefresh) {
    container.innerHTML = `<div class="loading-state">🔄 Sincronizzazione Cloud e aggiornamento palinsesti dei prossimi 7 giorni...</div>`;
    if (!state.isCloudMode) {
      await apiPost("/api/sync", { sync_code: state.syncCode });
    } else if (state.syncCode) {
      await pullCloudSnapshotClient(state.syncCode);
    }
  }

  const params = new URLSearchParams({
    start_date: state.startDate,
    filter_mode: state.matchFilterMode,
    day: state.matchDay,
    time_slot: state.matchTimeSlot,
    only_unwatched: state.matchOnlyUnwatched ? "1" : "0",
    include_sky: state.includeSky ? "1" : "0",
    lcn: state.matchChannel,
    refresh: forceRefresh ? "1" : "0",
  });

  const data = await apiGet(`/api/matches?${params.toString()}`);
  if (data.days && data.days.length) {
    state.days = data.days;
    renderDaysStrips();
  }

  const cleanFetchedAt = (data.fetched_at || "ora")
    .replace(/\s*\(GitHub Actions.*?\)/gi, "")
    .replace(/\s*\(Ora Italiana\)/gi, "");
  const skyStatusLabel = state.includeSky ? "DTT + 🛰️ Sky attivi" : "Canali DTT (LCN 1–70) attivi";
  document.getElementById("epg-header-status").textContent =
    `${skyStatusLabel} • ${data.total_epg_events || 0} programmi analizzati (7 giorni) • Palinsesti agg. ${cleanFetchedAt}`;

  const counts = data.counts || {};
  document.getElementById("count-all").textContent = counts.all || 0;
  document.getElementById("count-wishlist").textContent = counts.wishlist || 0;
  document.getElementById("count-watched_movies").textContent = counts.watched_movies || 0;
  document.getElementById("count-watched_series").textContent = counts.watched_series || 0;

  const matches = data.matches || [];
  state.matchesList = matches;

  // Save to local cache for offline/4G usage
  if (!state.isCloudMode && state.matchFilterMode === "all" && state.matchDay === "all") {
    const snap = getLocalSnapshot();
    snap.matches = matches;
    snap.counts = counts;
    snap.days = state.days;
    snap.start_date = state.startDate;
    snap.fetched_at = data.fetched_at;
    saveLocalSnapshot(snap);
  }

  if (matches.length === 0) {
    const modeLabel = {
      all: "nelle tue liste (Wishlist o Già visti)",
      wishlist: "nella tua lista Da Vedere (Wishlist)",
      watched_movies: "tra i Film che hai già visto",
      watched_series: "tra le Serie TV che hai già visto / segui",
    }[state.matchFilterMode];

    container.innerHTML = `
      <div class="empty-box">
        <p>Nessun programma TV trovato nei prossimi 7 giorni ${modeLabel} con i filtri attuali.</p>
        <p style="margin-top:8px;font-size:0.8rem;">💡 Suggerimento: prova a selezionare <strong>"Tutti i 7 giorni"</strong> o aggiungi nuovi film e serie TV dalla scheda <strong>"Cerca & Aggiungi"</strong>!</p>
      </div>
    `;
    return;
  }

  const byDate = {};
  matches.forEach((m, idx) => {
    m._matchIndex = idx;
    byDate[m.date] = byDate[m.date] || [];
    byDate[m.date].push(m);
  });

  let html = "";
  Object.keys(byDate)
    .sort()
    .forEach((d) => {
      const dayItems = byDate[d];
      html += `
        <div class="day-group-header">
          <span>📅 ${formatItalianDate(d, true)}</span>
          <span>${dayItems.length} ${dayItems.length === 1 ? "programma TV" : "programmi TV"}</span>
        </div>
      `;
      dayItems.forEach((ev) => {
        html += renderMatchCard(ev, ev._matchIndex);
      });
    });

  container.innerHTML = html;
  bindMatchCardEvents(container);
}

function renderMatchCard(ev, matchIndex) {
  const lib = ev.library_item || {};
  const isMovie = ev.media_type === "movie";
  const isWishlist = lib.status === "wishlist";

  let statusBadgeHtml = "";
  if (isWishlist) {
    statusBadgeHtml = `<span class="list-status-pill wishlist">🎯 Da Vedere (${isMovie ? "Film" : "Serie TV"})</span>`;
  } else if (isMovie) {
    statusBadgeHtml = `<span class="list-status-pill watched">🎬 Visto</span>`;
  } else {
    statusBadgeHtml = `<span class="list-status-pill watched">📺 Completata ${ev.is_episode_watched ? "• ✓ Ep. già visto" : "• ✨ Ep. da vedere!"}</span>`;
  }

  let epLineHtml = "";
  if (!isMovie && (ev.season || ev.episode || ev.episode_title)) {
    const seText =
      ev.season && ev.episode
        ? `Stagione ${ev.season} • Episodio ${ev.episode}`
        : ev.episode
          ? `Episodio ${ev.episode}`
          : "";
    const epT = ev.episode_title ? ` — "${escapeHtml(ev.episode_title)}"` : "";
    epLineHtml = `<div class="tv-ep-line">🎞️ ${seText}${epT}</div>`;
  }

  const chosenPoster = (lib && lib.poster) ? lib.poster : ev.poster;
  const posterHtml = chosenPoster
    ? `<img src="${escapeHtml(chosenPoster)}" alt="${escapeHtml(ev.title)}" class="tv-poster" loading="lazy" onerror="this.outerHTML='<div class=\\'tv-poster\\'>${isMovie ? "🎬" : "📺"}</div>'" />`
    : `<div class="tv-poster">${isMovie ? "🎬" : "📺"}</div>`;

  const itemMediaType = lib.media_type || ev.media_type || "movie";
  const calUrl = buildGoogleCalendarUrl(ev);
  const watchedBtnText = isMovie
    ? lib.status === "watched"
      ? "✅ Visto"
      : "✓ Segna Film Visto"
    : ev.is_episode_watched
      ? `✅ ${ev.ep_code || "Episodio"} Visto`
      : `✓ Segna ${ev.ep_code || "Episodio"} Visto`;

  const isSkyEv = Boolean(ev.is_sky || Number(ev.lcn || 0) >= 100);
  const badgeColor = isSkyEv ? "#dc2626" : "#009fe3";
  const badgePrefix = isSkyEv ? "🛰️ SKY" : "CH";

  return `
    <article class="tv-card">
      ${posterHtml}
      <div class="tv-body">
        <div class="tv-meta-top">
          <span class="lcn-badge ${isSkyEv ? "sky" : "dtt"}" style="background:${badgeColor};">
            ${badgePrefix} ${ev.lcn} • ${escapeHtml(ev.channel_name)}
          </span>
          <span class="time-badge">
            🕒 ${ev.start_time}${ev.end_time ? " - " + ev.end_time : ""} (${ev.duration_min} min)
          </span>
          ${statusBadgeHtml}
        </div>
        <h3 class="tv-title">${escapeHtml(ev.title)}</h3>
        ${epLineHtml}
        <p class="tv-desc">${escapeHtml(ev.description || "")}</p>
        <div class="tv-actions">
          <a href="${calUrl}" target="_blank" rel="noopener" class="btn-action" title="Aggiungi sveglia su Google Calendar">
            📅 Sveglia Calendario
          </a>

          <button
            type="button"
            class="btn-action btn-mark-watched ${ev.is_episode_watched ? "active-watched" : ""}"
            data-lib-id="${lib.id}"
            data-media-type="${itemMediaType}"
            data-season="${ev.season || 1}"
            data-episode="${ev.episode || 1}"
            data-currently-watched="${ev.is_episode_watched ? "1" : "0"}"
          >
            ${watchedBtnText}
          </button>

          ${!isMovie
      ? `<button type="button" class="btn-action btn-open-series-tracker" data-series-id="${lib.id}">📋 Tutti gli episodi</button>`
      : ""
    }
        </div>
      </div>
    </article>
  `;
}

function bindMatchCardEvents(container) {
  container.querySelectorAll(".btn-toggle-reminder").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ev = state.matchesList[Number(btn.dataset.matchIdx)];
      if (!ev) return;
      const lib = ev.library_item || {};
      const payload = {
        event_id: ev.id,
        library_id: lib.id,
        title: ev.title,
        lcn: ev.lcn,
        channel_name: ev.channel_name,
        date: ev.date,
        start_time: ev.start_time,
        start_iso: ev.start_iso,
        episode_info: ev.ep_code || ev.episode_title || "",
      };
      const res = await apiPost("/api/reminders/toggle", payload);
      if (res.active) {
        requestNotificationPermissionAndSchedule(payload);
        showToast(`🔔 Promemoria attivato per "${payload.title}" su Canale ${payload.lcn}!`);
      } else {
        showToast("Promemoria rimosso.");
      }
      const remRes = await apiGet("/api/reminders");
      state.reminders = remRes.reminders || [];
      document.getElementById("reminders-count-badge").textContent = state.reminders.length;
      loadMatches(false);
    });
  });

  container.querySelectorAll(".btn-mark-watched").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const libId = Number(btn.dataset.libId);
      const mediaType = btn.dataset.mediaType;
      const currentlyWatched = btn.dataset.currentlyWatched === "1";

      if (mediaType === "movie") {
        const newStatus = currentlyWatched ? "wishlist" : "watched";
        await apiPost("/api/library/status", { id: libId, status: newStatus });
        showToast(newStatus === "watched" ? "🎬 Film segnato come Già Visto!" : "🎯 Film riportato in Da Vedere (Wishlist).");
      } else {
        const season = Number(btn.dataset.season || 1);
        const episode = Number(btn.dataset.episode || 1);
        await apiPost("/api/episodes/toggle", {
          series_id: libId,
          season,
          episode,
          watched: !currentlyWatched,
        });
        showToast(!currentlyWatched ? `✅ Episodio S${season}E${episode} segnato come visto!` : `Episodio S${season}E${episode} segnato come da vedere.`);
      }
      await loadLibrary();
      await loadMatches(false);
    });
  });

  container.querySelectorAll(".btn-open-series-tracker").forEach((btn) => {
    btn.addEventListener("click", () => {
      openSeriesTrackerModal(Number(btn.dataset.seriesId));
    });
  });
}

// ============================================================================
// TAB 2: IN STREAMING (PIATTAFORME STREAMING PER LE TUE LISTE)
// ============================================================================
async function loadStreamingTab() {
  const container = document.getElementById("streaming-results-container");
  if (!state.libraryItems || state.libraryItems.length === 0) {
    if (container) {
      container.innerHTML = `<div class="loading-state">Controllo disponibilità sulle piattaforme streaming...</div>`;
    }
    await loadLibrary();
  } else {
    const streamCat = await fetchStaticStreamingCatalog();
    state.libraryItems.forEach((it) => {
      it.streaming_providers = resolveClientStreamingForItem(it, streamCat);
    });
    renderStreamingTab();
  }
}

function renderStreamingTab() {
  const container = document.getElementById("streaming-results-container");
  if (!container) return;

  const allItems = state.libraryItems || [];
  const selectedPlats = state.streamPlatforms; // Set of platform IDs, empty = all platforms

  // Helper: get resolved streaming providers for a library item
  const getProviders = (item) => {
    return resolveClientStreamingForItem(item, _staticStreamingCatalog);
  };

  // Helper: check if item has at least one matching platform
  const matchesSelectedPlatforms = (providers) => {
    if (!Array.isArray(providers) || providers.length === 0) return false;
    if (!selectedPlats || selectedPlats.size === 0) return true;
    return providers.some((p) => selectedPlats.has(p.id));
  };

  // 1. Update Category Card Counts (based on selected platform(s), media type, and unwatched toggle)
  const catCounts = { all: 0, wishlist: 0, watching: 0, watched: 0 };
  allItems.forEach((it) => {
    const provs = getProviders(it);
    if (!matchesSelectedPlatforms(provs)) return;
    const mtype = it.media_type || "movie";
    const st = it.status || "wishlist";
    if (state.streamMediaType !== "all" && mtype !== state.streamMediaType) return;
    if (state.streamOnlyUnwatched && st === "watched") return;

    catCounts.all++;
    if (st === "wishlist") catCounts.wishlist++;
    else if (st === "watching") catCounts.watching++;
    else if (st === "watched") catCounts.watched++;
  });

  const elCntAll = document.getElementById("stream-count-all");
  const elCntWish = document.getElementById("stream-count-wishlist");
  const elCntWatch = document.getElementById("stream-count-watching");
  const elCntDone = document.getElementById("stream-count-watched");
  if (elCntAll) elCntAll.textContent = catCounts.all;
  if (elCntWish) elCntWish.textContent = catCounts.wishlist;
  if (elCntWatch) elCntWatch.textContent = catCounts.watching;
  if (elCntDone) elCntDone.textContent = catCounts.watched;

  // 2. Update Platform Pill Counts (based on selected category card, media type, and unwatched toggle)
  const platCounts = {
    all: 0,
    netflix: 0,
    prime: 0,
    disney: 0,
    now: 0,
    sky: 0,
    hbo: 0,
    apple: 0,
    paramount: 0,
    raiplay: 0,
    mediaset: 0,
    crunchyroll: 0,
    timvision: 0,
  };

  const filteredItems = [];
  allItems.forEach((it) => {
    const provs = getProviders(it);
    const mtype = it.media_type || "movie";
    const st = it.status || "wishlist";

    if (state.streamStatusMode === "wishlist" && st !== "wishlist") return;
    if (state.streamStatusMode === "watching" && st !== "watching") return;
    if (state.streamStatusMode === "watched" && st !== "watched") return;
    if (state.streamMediaType !== "all" && mtype !== state.streamMediaType) return;
    if (state.streamOnlyUnwatched && st === "watched") return;

    if (provs && provs.length > 0) {
      platCounts.all++;
      provs.forEach((p) => {
        if (platCounts[p.id] !== undefined) {
          platCounts[p.id]++;
        }
      });
    }

    if (matchesSelectedPlatforms(provs)) {
      filteredItems.push({ ...it, streaming_providers: provs });
    }
  });

  Object.keys(platCounts).forEach((pid) => {
    const badgeEl = document.getElementById(`plat-cnt-${pid}`);
    if (badgeEl) badgeEl.textContent = platCounts[pid];
  });

  // Sync active state on platform pills
  document.querySelectorAll("#streaming-platforms-bar .plat-pill").forEach((pill) => {
    const pid = pill.dataset.plat;
    if (pid === "all") {
      pill.classList.toggle("active", !selectedPlats || selectedPlats.size === 0);
    } else {
      pill.classList.toggle("active", Boolean(selectedPlats && selectedPlats.has(pid)));
    }
  });

  if (filteredItems.length === 0) {
    const platNames =
      selectedPlats && selectedPlats.size > 0
        ? Array.from(selectedPlats)
          .map((pid) => (STREAMING_PLATFORM_META[pid] ? STREAMING_PLATFORM_META[pid].name : pid))
          .join(" + ")
        : "piattaforme streaming in abbonamento";
    container.innerHTML = `
      <div class="empty-box">
        <p>Nessun titolo delle tue liste trovato su <strong>${escapeHtml(platNames)}</strong> con i filtri attuali.</p>
        <p style="margin-top:8px;font-size:0.8rem;">💡 Suggerimento: prova a cliccare su <strong>"🌐 Tutte"</strong> o seleziona <strong>"🌟 Tutto"</strong> per vedere tutti i film e le serie delle tue liste inclusi negli abbonamenti streaming.</p>
      </div>
    `;
    return;
  }

  // Sort alphabetically A -> Z for clean browsing
  filteredItems.sort((a, b) => (a.title_it || "").localeCompare(b.title_it || "", "it", { sensitivity: "base" }));

  container.innerHTML = filteredItems.map((it) => renderStreamingCard(it)).join("");

  // Bind card actions in streaming tab
  container.querySelectorAll(".btn-stream-toggle-status").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const newStatus = btn.dataset.nextStatus;
      await apiPost("/api/library/status", { id, status: newStatus });
      showToast(newStatus === "watched" ? "✅ Segnato come Visto!" : "🎯 Riportato in Da Vedere (Wishlist).");
      await loadLibrary();
      await loadMatches(false);
    });
  });

  container.querySelectorAll(".btn-stream-open-episodes").forEach((btn) => {
    btn.addEventListener("click", () => {
      openSeriesTrackerModal(Number(btn.dataset.id));
    });
  });
}

function renderStreamingCard(item) {
  const isMovie = item.media_type === "movie";
  const st = item.status || "wishlist";
  const provs = item.streaming_providers || [];
  const selectedPlats = state.streamPlatforms;

  let statusBadgeHtml = "";
  if (st === "wishlist") {
    statusBadgeHtml = `<span class="list-status-pill wishlist">🎯 Da Vedere</span>`;
  } else if (st === "watching") {
    statusBadgeHtml = `<span class="list-status-pill watching">▶️ Stai Seguendo (${item.watched_episodes_count || 0} ep.)</span>`;
  } else {
    statusBadgeHtml = `<span class="list-status-pill watched">✅ Visto</span>`;
  }

  const posterHtml = item.poster
    ? `<img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title_it)}" class="tv-poster" loading="lazy" onerror="this.outerHTML='<div class=\\'tv-poster\\'>${isMovie ? "🎬" : "📺"}</div>'" />`
    : `<div class="tv-poster">${isMovie ? "🎬" : "📺"}</div>`;

  const badgesHtml = provs
    .map((p) => {
      const meta = STREAMING_PLATFORM_META[p.id] || { name: p.name || p.id, color: "#334155" };
      const isHighlighted = selectedPlats && selectedPlats.size > 0 && selectedPlats.has(p.id);
      const borderStyle = isHighlighted ? `border: 2px solid #fff; box-shadow: 0 0 8px ${meta.color};` : "";
      const tagContent = `
        <span class="plat-dot" style="background:#fff;"></span>
        <span>${escapeHtml(meta.name)}</span>
      `;
      if (p.url) {
        return `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" class="stream-provider-badge" style="background:${meta.color};${borderStyle}" title="Apri su ${escapeHtml(meta.name)}">${tagContent}</a>`;
      }
      return `<span class="stream-provider-badge" style="background:${meta.color};${borderStyle}">${tagContent}</span>`;
    })
    .join("");

  const nextStatus = st === "watched" ? "wishlist" : "watched";
  const statusBtnLabel = st === "watched" ? "🎯 Riporta in Da Vedere" : "✅ Segna Visto";

  return `
    <article class="tv-card">
      ${posterHtml}
      <div class="tv-body">
        <div class="tv-meta-top">
          <span class="lcn-badge" style="background:#1e293b;">
            ${isMovie ? "🎬 Film" : "📺 Serie TV"}${item.year ? " • " + escapeHtml(item.year) : ""}
          </span>
          ${statusBadgeHtml}
        </div>
        <h3 class="tv-title">${escapeHtml(item.title_it)}</h3>
        <div class="streaming-badges-row">
          ${badgesHtml}
        </div>
        <p class="tv-desc">${escapeHtml(item.description || "")}</p>
        <div class="tv-actions">
          <button type="button" class="btn-action btn-stream-toggle-status ${st === "watched" ? "active-watched" : ""}" data-id="${item.id}" data-next-status="${nextStatus}">
            ${statusBtnLabel}
          </button>
          ${!isMovie
      ? `<button type="button" class="btn-action btn-stream-open-episodes" data-id="${item.id}">📋 Episodi (${item.watched_episodes_count || 0} visti)</button>`
      : ""
    }
        </div>
      </div>
    </article>
  `;
}

// ============================================================================
// TAB 3: LE MIE LISTE 
// ============================================================================
async function loadLibrary() {
  const [data, streamCat] = await Promise.all([
    apiGet(`/api/library?start_date=${state.startDate}&include_sky=${state.includeSky ? "1" : "0"}`),
    fetchStaticStreamingCatalog(),
  ]);
  const serverItems = data.items || [];
  serverItems.forEach((it) => {
    it.streaming_providers = resolveClientStreamingForItem(it, streamCat);
  });
  if (!state.isCloudMode) {
    const snap = getLocalSnapshot();
    const serverKeySet = new Set(serverItems.map((x) => `${x.media_type || "movie"}_${normalizeTitleClient(x.title_it)}`));
    const missingOnServer = (snap.library || []).filter((x) => !serverKeySet.has(`${x.media_type || "movie"}_${normalizeTitleClient(x.title_it)}`));
    if (missingOnServer.length > 0) {
      try {
        await apiPost("/api/library/batch", { action: "restore", items: snap.library });
        const refreshed = await apiGet(`/api/library?start_date=${state.startDate}`);
        state.libraryItems = refreshed.items || serverItems;
      } catch (e) {
        state.libraryItems = serverItems;
      }
    } else {
      state.libraryItems = serverItems;
    }
    snap.library = state.libraryItems;
    saveLocalSnapshot(snap);
  } else {
    state.libraryItems = serverItems;
    const snap = getLocalSnapshot();
    if (serverItems.length > 0) {
      snap.library = serverItems;
      saveLocalSnapshot(snap);
    }
  }
  renderLibrary();
  renderStreamingTab();
}

function askDeleteConfirmation(itemsToDelete) {
  return new Promise((resolve) => {
    const count = Array.isArray(itemsToDelete) ? itemsToDelete.length : 1;
    const modal = document.getElementById("modal-confirm-delete");
    const msgEl = document.getElementById("confirm-delete-message");
    const subEl = document.getElementById("confirm-delete-sub");
    const btnCancel = document.getElementById("btn-cancel-delete");
    const btnConfirm = document.getElementById("btn-confirm-delete");

    if (!modal || !msgEl || !btnCancel || !btnConfirm) {
      const fallbackMsg =
        count === 1
          ? "Sei sicuro di voler eliminare questo elemento?"
          : `Sei sicuro di voler eliminare questi ${count} elementi?`;
      resolve(window.confirm(fallbackMsg));
      return;
    }

    if (count === 1) {
      msgEl.textContent = "Sei sicuro di voler eliminare questo elemento?";
      const singleTitle = (itemsToDelete[0] && (itemsToDelete[0].title_it || itemsToDelete[0].title)) || "";
      subEl.textContent = singleTitle ? `«${singleTitle}»` : "";
    } else {
      msgEl.textContent = `Sei sicuro di voler eliminare questi ${count} elementi?`;
      const titles = (itemsToDelete || [])
        .map((x) => x && (x.title_it || x.title))
        .filter(Boolean);
      subEl.textContent =
        titles.slice(0, 4).join(", ") + (titles.length > 4 ? ` e altri ${titles.length - 4}...` : "");
    }

    modal.classList.remove("hidden");

    const cleanup = (result) => {
      modal.classList.add("hidden");
      btnCancel.removeEventListener("click", onCancel);
      btnConfirm.removeEventListener("click", onConfirm);
      modal.removeEventListener("click", onBackdrop);
      resolve(result);
    };

    const onCancel = () => cleanup(false);
    const onConfirm = () => cleanup(true);
    const onBackdrop = (e) => {
      if (e.target === modal) cleanup(false);
    };

    btnCancel.addEventListener("click", onCancel);
    btnConfirm.addEventListener("click", onConfirm);
    modal.addEventListener("click", onBackdrop);
  });
}

function attachQuickMultiSelectEvents(containerEl, cardSelector, keyAttr, selectedSet, onRender) {
  containerEl.querySelectorAll(cardSelector).forEach((card) => {
    let pressTimer = null;
    let startX = 0;
    let startY = 0;

    const getKey = () => Number(card.getAttribute(keyAttr));

    const isActionBtn = (target) =>
      Boolean(
        target.closest(".btn-lib-single-delete") ||
        target.closest(".btn-pick-search-item") ||
        target.closest(".btn-search-ep-modal") ||
        target.closest(".btn-open-ep-modal") ||
        target.closest(".btn-switch-status") ||
        target.closest(".btn-batch-action") ||
        target.closest(".btn-lib-batch-action")
      );

    // 1. PHONE (Touch): Long-press (~420ms) ONLY needed when selectedSet.size === 0 (to select the FIRST item and open the bar!)
    card.addEventListener(
      "touchstart",
      (e) => {
        state.ignoreNextClickUntil = 0;
        if (selectedSet.size > 0) return; // Once open, a simple tap/click handles selection!
        if (isActionBtn(e.target)) return;
        const touch = e.touches[0];
        if (!touch) return;
        startX = touch.clientX;
        startY = touch.clientY;
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
          state.ignoreNextClickUntil = Date.now() + 250;
          if (navigator.vibrate) {
            try {
              navigator.vibrate(35);
            } catch (err) { }
          }
          selectedSet.add(getKey());
          onRender();
        }, 420);
      },
      { passive: true }
    );

    card.addEventListener(
      "touchmove",
      (e) => {
        if (!pressTimer) return;
        const touch = e.touches[0];
        if (!touch) return;
        if (Math.abs(touch.clientX - startX) > 12 || Math.abs(touch.clientY - startY) > 12) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      },
      { passive: true }
    );

    card.addEventListener("touchend", () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    card.addEventListener("touchcancel", () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    card.addEventListener("contextmenu", (e) => {
      if (!e.target.closest("input, textarea")) {
        e.preventDefault();
      }
    });

    // 2. PC (Mouse): Double-click (dblclick) ONLY needed when selectedSet.size === 0 (to select the FIRST item and open the bar!)
    card.addEventListener("dblclick", (e) => {
      if (selectedSet.size > 0) return; // Once open, a single click handles selection!
      if (isActionBtn(e.target)) return;
      e.preventDefault();
      selectedSet.add(getKey());
      onRender();
    });

    // 3. ONCE MULTI-SELECT IS OPEN (selectedSet.size > 0): Simple single click/tap on ANY item adds or removes it!
    card.addEventListener("click", (e) => {
      if (state.ignoreNextClickUntil && Date.now() < state.ignoreNextClickUntil) {
        state.ignoreNextClickUntil = 0;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (isActionBtn(e.target)) return;
      if (selectedSet.size === 0) return; // When multi-select is closed, single click does nothing!

      e.stopPropagation();
      const key = getKey();
      if (selectedSet.has(key)) {
        selectedSet.delete(key);
      } else {
        selectedSet.add(key);
      }
      onRender();
    });
  });
}

window.goToSearchAndAddFromLibrary = function () {
  const libFilter = document.getElementById("lib-filter-input");
  const q = (state.libQuery || (libFilter ? libFilter.value : "") || "").trim();

  // Clear 3rd tab filter so it's clean when user returns to library
  state.libQuery = "";
  if (libFilter) libFilter.value = "";

  // Switch to Tab 4 (tab-search)
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  const searchNavBtn = document.querySelector('.nav-item[data-tab="tab-search"]');
  if (searchNavBtn) searchNavBtn.classList.add("active");
  const searchPanel = document.getElementById("tab-search");
  if (searchPanel) searchPanel.classList.add("active");

  const catalogSearch = document.getElementById("catalog-search-input");
  if (catalogSearch) {
    catalogSearch.value = q;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (q) {
    executeCatalogSearch(q);
  } else if (catalogSearch) {
    setTimeout(() => catalogSearch.focus(), 150);
  }
};

function renderLibrary() {
  const items = state.libraryItems;
  const validIds = new Set(items.map((x) => Number(x.id)));
  Array.from(state.selectedLibraryIds).forEach((id) => {
    if (!validIds.has(Number(id))) {
      state.selectedLibraryIds.delete(id);
    }
  });

  document.getElementById("lib-cnt-all").textContent = items.length;
  document.getElementById("lib-cnt-wish").textContent = items.filter((x) => x.status === "wishlist").length;
  const watchingEl = document.getElementById("lib-cnt-watching");
  if (watchingEl) {
    watchingEl.textContent = items.filter((x) => x.status === "watching").length;
  }
  document.getElementById("lib-cnt-watched").textContent = items.filter((x) => x.status === "watched").length;
  const navCnt = document.getElementById("nav-lib-count");
  if (navCnt) navCnt.textContent = items.length;

  const filtered = items.filter((it) => {
    if (state.libStatus !== "all" && it.status !== state.libStatus) return false;
    if (state.libType !== "all" && it.media_type !== state.libType) return false;
    if (state.libQuery) {
      const matchIt = fuzzyMatchTitleClient(state.libQuery, it.title_it || "");
      const matchOr = fuzzyMatchTitleClient(state.libQuery, it.title_original || "");
      if (!matchIt && !matchOr) return false;
    }
    return true;
  });

  // Sort filtered items (Default: A -> Z, or Z -> A, or by release year newest/oldest)
  filtered.sort((a, b) => {
    const titleA = (a.title_it || "").trim();
    const titleB = (b.title_it || "").trim();
    if (state.libSort === "za") {
      return titleB.localeCompare(titleA, "it", { numeric: true, sensitivity: "base" });
    }
    if (state.libSort === "year_desc") {
      const yA = parseInt(a.year, 10) || 0;
      const yB = parseInt(b.year, 10) || 0;
      if (yB !== yA) return yB - yA;
      return titleA.localeCompare(titleB, "it", { numeric: true, sensitivity: "base" });
    }
    if (state.libSort === "year_asc") {
      const yA = parseInt(a.year, 10) || 9999;
      const yB = parseInt(b.year, 10) || 9999;
      if (yA !== yB) return yA - yB;
      return titleA.localeCompare(titleB, "it", { numeric: true, sensitivity: "base" });
    }
    // Default 'az': A -> Z
    return titleA.localeCompare(titleB, "it", { numeric: true, sensitivity: "base" });
  });

  const container = document.getElementById("library-list-container");
  if (filtered.length === 0) {
    const rawQ = (state.libQuery || (document.getElementById("lib-filter-input") ? document.getElementById("lib-filter-input").value : "") || "").trim();
    const btnLabel = rawQ
      ? `🔍 Cerca "${escapeHtml(rawQ.length > 25 ? rawQ.slice(0, 22) + "..." : rawQ)}" in Cerca & Aggiungi`
      : "🔍 Vai a Cerca & Aggiungi";
    container.innerHTML = `
      <div class="empty-box" style="grid-column:1/-1;">
        <p>Nessun titolo trovato in questa vista.</p>
        <button type="button" class="btn-primary btn-sm" style="margin-top:10px;" onclick="goToSearchAndAddFromLibrary()">
          ${btnLabel}
        </button>
      </div>
    `;
    return;
  }

  const selSet = state.selectedLibraryIds;
  const selCount = selSet.size;
  const isMultiMode = selCount > 0;
  const allFilteredSelected = filtered.length > 0 && filtered.every((it) => selSet.has(Number(it.id)));

  const libMultiBarHtml = isMultiMode
    ? `
      <div class="multi-select-bar">
        <div class="multi-select-top">
          <button type="button" class="btn-secondary btn-sm" id="btn-lib-toggle-select-all">
            ${allFilteredSelected ? "✕ Deseleziona tutti" : `☑️ Seleziona tutti (${filtered.length})`}
          </button>
          <span class="multi-select-count">
            ${selCount} titol${selCount === 1 ? "o selezionato" : "i selezionati"} (clic semplice per aggiungerne/toglierne altri)
          </span>
        </div>
        <div class="multi-select-actions">
          <button type="button" class="btn-primary btn-sm btn-lib-batch-action" data-action="wishlist">
            🎯 Da Vedere (${selCount})
          </button>
          <button type="button" class="btn-action btn-lib-batch-action" data-action="watching">
            ▶️ Stai Seguendo (${selCount})
          </button>
          <button type="button" class="btn-action active-watched btn-lib-batch-action" data-action="watched">
            ✅ Visti (${selCount})
          </button>
          <button type="button" class="btn-action btn-lib-batch-action" data-action="delete" style="color:#f87171;border-color:rgba(248,113,113,0.4);">
            🗑️ Rimuovi (${selCount})
          </button>
        </div>
      </div>
    `
    : "";

  const itemsHtml = filtered
    .map((it) => {
      const itemId = Number(it.id);
      const isSelected = selSet.has(itemId);
      const isMovie = it.media_type === "movie";
      const isWish = it.status === "wishlist";
      const isWatching = it.status === "watching";
      const upcoming = it.upcoming_airings || [];

      let statusLabel = isMovie ? "✅ Visto" : "✅ Completata";
      let statusShort = isMovie ? "✅ Visto" : "✅ Completata";
      let statusClass = "watched";
      if (isWish) {
        statusLabel = "🎯 Da Vedere (Wishlist)";
        statusShort = "🎯 Da Vedere";
        statusClass = "wishlist";
      } else if (isWatching) {
        statusLabel = "▶️ Stai Seguendo";
        statusShort = "▶️ Seguendo";
        statusClass = "watching";
      }

      // Raw / Compact Title-Only List View
      if (state.libViewMode === "compact") {
        return `
          <div
            class="lib-compact-row selectable-lib-card ${isSelected ? "selected-card" : ""}"
            data-lib-id="${itemId}"
            title="${isMultiMode ? "Clicca per selezionare/deselezionare" : "Su PC: doppio click sul 1° titolo per selezionare • Su Telefono: tieni premuto sul 1° titolo"}"
          >
            <div class="lib-compact-left">
              <span>${isMovie ? "🎬" : "📺"}</span>
              <span class="lib-compact-title">${escapeHtml(it.title_it)}</span>
              ${it.year ? `<span class="lib-compact-year">(${escapeHtml(it.year)})</span>` : ""}
            </div>
            <div class="lib-compact-right">
              ${!isMovie
            ? `<button type="button" class="btn-primary btn-sm btn-open-ep-modal" data-id="${itemId}" style="padding:2px 7px;font-size:0.7rem;">📋 ${it.status === "watched" ? (it.watched_episodes_count || "Tutti") : (it.watched_episodes_count || 0)} ep.</button>`
            : ""
          }
              <span class="list-status-pill ${statusClass}" style="font-size:0.68rem;padding:2px 6px;">
                ${statusShort}
              </span>
              ${isMultiMode
            ? `<button type="button" class="card-select-btn ${isSelected ? "selected" : ""}">
                     ${isSelected ? "☑️ Selezionato" : "⬜ Seleziona"}
                   </button>`
            : ""
          }
              <button
                type="button"
                class="btn-lib-single-delete"
                data-id="${itemId}"
                title="Elimina questo elemento dalla lista"
              >✕</button>
            </div>
          </div>
        `;
      }

      // Full Cards View with top-right red-bordered 'X' square button
      const posterHtml = it.poster
        ? `<img src="${escapeHtml(it.poster)}" alt="${escapeHtml(it.title_it)}" class="tv-poster" loading="lazy" onerror="this.outerHTML='<div class=\\'tv-poster\\'>${isMovie ? "🎬" : "📺"}</div>'" />`
        : `<div class="tv-poster">${isMovie ? "🎬" : "📺"}</div>`;

      let upcomingHtml = "";
      if (upcoming.length > 0) {
        const first = upcoming[0];
        upcomingHtml = `
          <div class="airing-alert-box">
            📡 <strong>In TV nei prossimi 7 giorni!</strong><br/>
            Prossimo: <strong>${formatItalianDate(first.date)} ore ${first.start_time}</strong> su <strong>Canale ${first.lcn} (${escapeHtml(first.channel_name)})</strong>
          </div>
        `;
      }

      return `
        <article
          class="tv-card selectable-lib-card ${isSelected ? "selected-card" : ""}"
          data-lib-id="${itemId}"
          title="${isMultiMode ? "Clicca per selezionare/deselezionare" : "Su PC: doppio click sul 1° titolo per selezionare • Su Telefono: tieni premuto sul 1° titolo"}"
        >
          <button
            type="button"
            class="btn-lib-single-delete"
            data-id="${itemId}"
            title="Elimina questo elemento dalla lista"
          >✕</button>
          ${posterHtml}
          <div class="tv-body">
            <div class="tv-meta-top">
              <span class="list-status-pill ${statusClass}">
                ${statusLabel}
              </span>
              <span class="time-badge">${isMovie ? "🎬 Film" : `📺 Serie TV`}</span>
              ${it.year ? `<span class="list-status-pill wishlist">${escapeHtml(it.year)}</span>` : ""}
              ${isMultiMode
          ? `<button type="button" class="card-select-btn ${isSelected ? "selected" : ""}">
                     ${isSelected ? "☑️ Selezionato" : "⬜ Seleziona"}
                   </button>`
          : ""
        }
            </div>
            <h3 class="tv-title">${escapeHtml(it.title_it)}</h3>
            ${it.title_original && it.title_original.toLowerCase() !== it.title_it.toLowerCase()
          ? `<div class="tv-ep-line">Titolo orig.: ${escapeHtml(it.title_original)}</div>`
          : ""
        }
            ${upcomingHtml}
            <p class="tv-desc">${escapeHtml(it.description || "")}</p>
            <div class="tv-actions">
              ${!isMovie
          ? `<button type="button" class="btn-primary btn-sm btn-open-ep-modal" data-id="${itemId}">📋 Episodi (${it.status === "watched" ? (it.watched_episodes_count || "Tutti") : (it.watched_episodes_count || 0)})</button>`
          : ""
        }
              ${!isMovie && !isWatching
          ? `<button type="button" class="btn-action btn-switch-status" data-id="${itemId}" data-next="watching">▶️ Sposta in Stai Seguendo</button>`
          : ""
        }
              ${!isMovie && isWatching
          ? `<button type="button" class="btn-action active-watched btn-switch-status" data-id="${itemId}" data-next="watched">✅ Sposta in Completata</button>`
          : ""
        }
              <button type="button" class="btn-action btn-switch-status" data-id="${itemId}" data-next="${isWish ? "watched" : "wishlist"}">
                ${isWish ? (isMovie ? "✅ Sposta in Visto" : "✅ Sposta in Completata") : "🎯 Sposta in Da Vedere"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  container.innerHTML = libMultiBarHtml + itemsHtml;

  // Attach Quick Multi-Select (Long-press on Phone / Double-click on PC for 1st item, then single click for the rest!)
  attachQuickMultiSelectEvents(container, ".selectable-lib-card", "data-lib-id", selSet, renderLibrary);

  const selectAllLibBtn = container.querySelector("#btn-lib-toggle-select-all");
  if (selectAllLibBtn) {
    selectAllLibBtn.addEventListener("click", () => {
      if (allFilteredSelected) {
        selSet.clear();
      } else {
        filtered.forEach((it) => selSet.add(Number(it.id)));
      }
      renderLibrary();
    });
  }

  // Single 'X' Delete Button in Top-Right Corner (Always asks confirmation!)
  container.querySelectorAll(".btn-lib-single-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const targetId = Number(btn.dataset.id);
      const targetItem = items.find((x) => Number(x.id) === targetId);
      if (!targetItem) return;

      const confirmed = await askDeleteConfirmation([targetItem]);
      if (!confirmed) return;

      await apiPost("/api/library/delete", {
        id: targetItem.id,
        title_it: targetItem.title_it,
        media_type: targetItem.media_type,
      });
      selSet.delete(targetId);
      showToast(`🗑️ "${targetItem.title_it}" eliminato dalla lista!`);
      await loadLibrary();
      loadMatches(false);
    });
  });

  container.querySelectorAll(".btn-lib-batch-action").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action; // 'wishlist' | 'watching' | 'watched' | 'delete'
      const pickedItems = items.filter((it) => selSet.has(Number(it.id)));
      if (pickedItems.length === 0) return;

      if (action === "delete") {
        const confirmed = await askDeleteConfirmation(pickedItems);
        if (!confirmed) return;
      }

      btn.disabled = true;
      btn.textContent = "⏳ Elaborazione...";

      await apiPost("/api/library/batch", {
        action,
        items: pickedItems,
      });

      selSet.clear();
      if (action === "delete") {
        showToast(`🗑️ ${pickedItems.length} ${pickedItems.length === 1 ? "elemento rimosso" : "elementi rimossi"} dalle tue liste!`);
      } else if (action === "watching") {
        showToast(`▶️ ${pickedItems.length} titoli spostati in Stai Seguendo!`);
      } else if (action === "watched") {
        showToast(`✅ ${pickedItems.length} titoli spostati in Visti!`);
      } else {
        showToast(`🎯 ${pickedItems.length} titoli spostati in Da Vedere!`);
      }

      await loadLibrary();
      loadMatches(false);
    });
  });

  container.querySelectorAll(".btn-open-ep-modal").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openSeriesTrackerModal(Number(btn.dataset.id));
    });
  });

  container.querySelectorAll(".btn-switch-status").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const targetId = Number(btn.dataset.id);
      const nextSt = btn.dataset.next;
      const targetItem = items.find((x) => Number(x.id) === targetId);
      const isSeries = targetItem && targetItem.media_type === "series";

      btn.disabled = true;
      btn.textContent = "⏳ Aggiornamento...";

      await apiPost("/api/library/status", { id: targetId, status: nextSt });
      if (nextSt === "watching") {
        showToast("▶️ Spostato in Stai Seguendo!");
      } else if (nextSt === "watched") {
        showToast(
          isSeries
            ? "✅ Serie completata: tutti gli episodi spuntati e spostata in Visto!"
            : "✅ Spostato in Visto!"
        );
      } else {
        showToast("🎯 Spostato in Da Vedere (Wishlist)!");
      }
      await loadLibrary();
      loadMatches(false);
    });
  });
}

// ============================================================================
// SHARED ADD/TOGGLE/REMOVE HELPER (USED BY SEARCH TAB, MODAL LIVE SEARCH & EXPLORE)
// ============================================================================
async function addCatalogItemToLibrary(item, status, buttonElement) {
  if (!item) return;
  const titleIt = item.title_it || item.title || "";
  const mediaType = item.media_type || "movie";

  // If the item is ALREADY in this exact status list, clicking again removes it!
  if (item.in_library_status === status) {
    if (buttonElement) {
      buttonElement.disabled = true;
      buttonElement.textContent = "⏳ Rimozione...";
    }
    try {
      await apiPost("/api/library/delete", {
        id: item.in_library_id || null,
        title_it: titleIt,
        media_type: mediaType,
      });
      item.in_library_status = null;
      item.in_library_id = null;
      item.watched_episodes_count = 0;

      showToast(`🗑️ "${titleIt}" rimosso dalla lista!`);
      await loadLibrary();
      loadMatches(false);
    } catch (e) {
      showToast(`❌ Errore durante la rimozione di "${titleIt}".`);
    } finally {
      if (buttonElement) {
        buttonElement.disabled = false;
      }
    }
    return;
  }

  // Otherwise add to the list (or move between Da Vedere <-> Già Visti!)
  if (buttonElement) {
    buttonElement.disabled = true;
    buttonElement.textContent = "⏳ Salvataggio...";
  }
  const payload = {
    external_id: item.external_id || "",
    imdb_id: item.imdb_id || "",
    tvmaze_id: item.tvmaze_id || null,
    media_type: mediaType,
    title_it: titleIt,
    title_original: item.title_original || titleIt,
    year: item.year || "",
    poster: item.poster || "",
    genre: item.genre || (mediaType === "series" ? "Serie TV" : "Film"),
    description: item.description || "",
    status: status,
  };

  try {
    const res = await apiPost("/api/library", payload);
    item.in_library_status = status;
    if (res && res.id) {
      item.in_library_id = res.id;
    }
    if (mediaType === "series") {
      if (status === "wishlist") {
        item.watched_episodes_count = 0;
      } else if (res && typeof res.watched_episodes_count === "number") {
        item.watched_episodes_count = res.watched_episodes_count;
      }
    }

    if (mediaType === "series" && status === "watched") {
      showToast(`✅ "${payload.title_it}" salvata in Già Visti (tutti i ${item.watched_episodes_count || ""} episodi spuntati)!`);
    } else {
      showToast(
        `✨ "${payload.title_it}" salvato in ${status === "wishlist" ? "🎯 Da Vedere (Wishlist)" : "✅ Già Visti"}!`
      );
    }

    await loadLibrary();
    loadMatches(false);
  } catch (err) {
    showToast(`❌ Errore durante il salvataggio di "${titleIt}".`);
  } finally {
    if (buttonElement) {
      buttonElement.disabled = false;
    }
  }
}

function renderSearchResultCards(results, targetContainer, isCompactModal = false) {
  if (!results || results.length === 0) {
    targetContainer.innerHTML = `
      <div class="empty-box" style="padding:18px;">
        <p>Nessun titolo trovato. Prova a scrivere il nome in modo diverso.</p>
      </div>
    `;
    return;
  }

  const selectedSet = isCompactModal ? state.selectedModalIndices : state.selectedSearchIndices;
  const selCount = selectedSet.size;
  const isMultiMode = selCount > 0;
  const allSelected = results.length > 0 && selCount === results.length;

  const multiBarHtml = isMultiMode
    ? `
    <div class="multi-select-bar">
      <div class="multi-select-top">
        <button type="button" class="btn-secondary btn-sm" id="btn-toggle-select-all-${isCompactModal ? "modal" : "main"}">
          ${allSelected ? "✕ Deseleziona tutti" : `☑️ Seleziona tutti (${results.length})`}
        </button>
        <span class="multi-select-count">
          ${selCount} titol${selCount === 1 ? "o selezionato" : "i selezionati"}
        </span>
      </div>
      <div class="multi-select-actions">
        <button type="button" class="btn-primary btn-sm btn-batch-action" data-action="wishlist">
          🎯 + Da Vedere (${selCount})
        </button>
        <button type="button" class="btn-action active-watched btn-batch-action" data-action="watched">
          ✅ + Già Visti (${selCount})
        </button>
        <button type="button" class="btn-action btn-batch-action" data-action="delete" style="color:#f87171;border-color:rgba(248,113,113,0.4);">
          🗑️ Rimuovi (${selCount})
        </button>
      </div>
    </div>
  `
    : "";

  const cardsHtml = results
    .map((item, idx) => {
      const isMovie = item.media_type === "movie";
      const inWish = item.in_library_status === "wishlist";
      const inWatching = item.in_library_status === "watching";
      const inWatched = item.in_library_status === "watched";
      const isSelected = selectedSet.has(idx);

      const posterHtml = item.poster
        ? `<img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title_it)}" class="tv-poster" loading="lazy" onerror="this.outerHTML='<div class=\\'tv-poster\\'>${isMovie ? "🎬" : "📺"}</div>'" />`
        : `<div class="tv-poster">${isMovie ? "🎬" : "📺"}</div>`;

      let inListLabel = "";
      if (inWish) inListLabel = "Da Vedere";
      else if (inWatching) inListLabel = "Stai Seguendo";
      else if (inWatched) inListLabel = isMovie ? "Visto" : "Completata";

      return `
        <article class="tv-card selectable-search-card ${isSelected ? "selected-card" : ""}" data-card-idx="${idx}" title="Su PC: doppio click per selezionare • Su Telefono: tieni premuto per selezionare">
          ${posterHtml}
          <div class="tv-body">
            <div class="tv-meta-top">
              <span class="time-badge">${isMovie ? "🎬 Film" : "📺 Serie TV"}</span>
              ${item.year ? `<span class="list-status-pill wishlist">📅 ${escapeHtml(item.year)}</span>` : ""}
              ${inListLabel
          ? `<span class="list-status-pill ${inWatching ? "watching" : "watched"}">✓ In lista (${inListLabel})</span>`
          : ""
        }
              ${isMultiMode
          ? `<button
                type="button"
                class="card-select-btn ${isSelected ? "selected" : ""}"
                data-idx="${idx}"
                title="Seleziona o deseleziona questo titolo"
              >
                ${isSelected ? "☑️ Selezionato" : "⬜ Seleziona"}
              </button>`
          : ""
        }
            </div>
            <h3 class="tv-title">${escapeHtml(item.title_it)}</h3>
            ${item.title_original && item.title_original.toLowerCase() !== item.title_it.toLowerCase()
          ? `<div class="tv-ep-line">Titolo originale: ${escapeHtml(item.title_original)}</div>`
          : ""
        }
            <p class="tv-desc">${escapeHtml(item.description || "")}</p>
            <div class="tv-actions">
              <button
                type="button"
                class="${inWish ? "btn-action active-watched" : "btn-primary btn-sm"} btn-pick-search-item"
                data-idx="${idx}"
                data-status="wishlist"
                data-modal="${isCompactModal ? "1" : "0"}"
                title="${inWish ? "Clicca di nuovo per rimuovere da Da Vedere" : "Aggiungi in Da Vedere"}"
              >
                ${inWish ? "🎯 In Da Vedere" : "🎯 Aggiungi in Wishlist"}
              </button>
              <button
                type="button"
                class="btn-action ${inWatched ? "active-watched" : ""} btn-pick-search-item"
                data-idx="${idx}"
                data-status="watched"
                data-modal="${isCompactModal ? "1" : "0"}"
                title="${inWatched ? "Clicca di nuovo per rimuovere da Già Visti" : "Aggiungi in Già Visti"}"
              >
                ${inWatched ? "✅ In Visti" : "✅ Aggiungi in Visti"}
              </button>
              ${!isMovie
          ? `<button
                    type="button"
                    class="btn-primary btn-sm btn-search-ep-modal"
                    data-idx="${idx}"
                    data-modal="${isCompactModal ? "1" : "0"}"
                    title="Apri la lista episodi per spuntare quelli che hai visto"
                  >
                    📋 Episodi${item.watched_episodes_count ? ` (${item.watched_episodes_count})` : ""}
                  </button>`
          : ""
        }
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  targetContainer.innerHTML = multiBarHtml + cardsHtml;

  // Attach Quick Multi-Select (Long-press on Phone / Double-click on PC for 1st item, then single click for the rest!)
  attachQuickMultiSelectEvents(targetContainer, ".selectable-search-card", "data-card-idx", selectedSet, () =>
    renderSearchResultCards(results, targetContainer, isCompactModal)
  );

  // Multi-select: Select All / Deselect All
  const selectAllBtn = targetContainer.querySelector(`#btn-toggle-select-all-${isCompactModal ? "modal" : "main"}`);
  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      if (allSelected) {
        selectedSet.clear();
      } else {
        results.forEach((_, idx) => selectedSet.add(idx));
      }
      renderSearchResultCards(results, targetContainer, isCompactModal);
    });
  }

  // Multi-select: Batch Action Buttons (Add to Wishlist, Add to Watched, or Delete all selected)
  targetContainer.querySelectorAll(".btn-batch-action").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action; // 'wishlist' | 'watched' | 'delete'
      const pickedItems = Array.from(selectedSet)
        .map((i) => results[i])
        .filter(Boolean);
      if (pickedItems.length === 0) return;

      if (action === "delete") {
        const confirmed = await askDeleteConfirmation(pickedItems);
        if (!confirmed) return;
      }

      btn.disabled = true;
      btn.textContent = "⏳ Elaborazione...";

      await apiPost("/api/library/batch", {
        action,
        items: pickedItems,
      });

      selectedSet.clear();
      if (action === "delete") {
        showToast(`🗑️ ${pickedItems.length} titoli rimossi dalle tue liste!`);
      } else {
        showToast(
          `✨ ${pickedItems.length} titoli salvati in ${action === "wishlist" ? "🎯 Da Vedere" : "✅ Già Visti"}!`
        );
      }

      await loadLibrary();
      loadMatches(false);

      // Sync updated status & watched_episodes_count from state.libraryItems back to search results
      const libByKey = {};
      (state.libraryItems || []).forEach((li) => {
        libByKey[`${li.media_type}_${normalizeTitleClient(li.title_it)}`] = li;
      });
      pickedItems.forEach((it) => {
        const key = `${it.media_type || "movie"}_${normalizeTitleClient(it.title_it || it.title || "")}`;
        const found = libByKey[key];
        if (action === "delete" || !found) {
          it.in_library_status = null;
          it.in_library_id = null;
          it.watched_episodes_count = 0;
        } else {
          it.in_library_status = found.status;
          it.in_library_id = found.id;
          it.watched_episodes_count = found.watched_episodes_count || 0;
        }
      });

      renderSearchResultCards(results, targetContainer, isCompactModal);
    });
  });

  // Single item buttons (click once to add/switch list, click again on active list to remove!)
  targetContainer.querySelectorAll(".btn-pick-search-item").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const idx = Number(btn.dataset.idx);
      const status = btn.dataset.status;
      const isModal = btn.dataset.modal === "1";
      const list = isModal ? state.modalSearchResults : state.searchResults;
      const item = list[idx];
      await addCatalogItemToLibrary(item, status, btn);
      renderSearchResultCards(list, targetContainer, isModal);
    });
  });

  // Series Episodes button directly in Cerca & Aggiungi
  targetContainer.querySelectorAll(".btn-search-ep-modal").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = Number(btn.dataset.idx);
      const isModal = btn.dataset.modal === "1";
      const list = isModal ? state.modalSearchResults : state.searchResults;
      const item = list[idx];
      if (!item) return;
      openSeriesTrackerModal(item.in_library_id || 0, item);
    });
  });
}

// ============================================================================
// TAB 3 & MODAL LIVE SEARCH: CERCA & AGGIUNGI FILM E SERIE TV
// ============================================================================
async function executeCatalogSearch(query) {
  const container = document.getElementById("search-results-container");
  const cleanQ = (query || "").trim();
  if (!cleanQ) return;

  const typeLabel =
    state.searchMediaType === "movie"
      ? "tra i Film"
      : state.searchMediaType === "series"
        ? "tra le Serie TV"
        : "tra tutti i Film e le Serie TV";

  // Se la ricerca per questo termine è già in memoria, rifiltra istantaneamente!
  if (
    cleanQ.toLowerCase() === (state.searchLastQuery || "").toLowerCase() &&
    state.searchRawResults &&
    state.searchRawResults.length > 0
  ) {
    applySearchFilterAndRender(container);
    return;
  }

  container.innerHTML = `<div class="loading-state">🔍 Ricerca di "${escapeHtml(cleanQ)}" ${typeLabel}...</div>`;

  const data = await apiGet(`/api/search?q=${encodeURIComponent(cleanQ)}`);
  state.searchLastQuery = cleanQ;
  state.searchRawResults = data.results || [];
  applySearchFilterAndRender(container);
}

function applySearchFilterAndRender(container) {
  const raw = state.searchRawResults || [];
  if (state.searchMediaType === "movie") {
    state.searchResults = raw.filter((it) => it.media_type === "movie");
  } else if (state.searchMediaType === "series") {
    state.searchResults = raw.filter((it) => it.media_type === "series");
  } else {
    state.searchResults = [...raw];
  }

  state.selectedSearchIndices.clear();

  if (state.searchResults.length === 0 && raw.length > 0) {
    const filterDesc = state.searchMediaType === "movie" ? "Film" : "Serie TV";
    container.innerHTML = `
      <div class="empty-box" style="padding:18px;">
        <p>Nessun <strong>${filterDesc}</strong> trovato per "${escapeHtml(state.searchLastQuery)}".</p>
        <p style="margin-top:6px;font-size:0.8rem;color:var(--text-muted);">
          💡 Prova a deselezionare il filtro per cercare tra tutti i titoli.
        </p>
      </div>
    `;
    return;
  }

  renderSearchResultCards(state.searchResults, container, false);
}

async function executeModalLiveSearch(query) {
  const container = document.getElementById("modal-live-search-results");
  if (!query || query.trim().length < 2) {
    container.innerHTML = `<div class="empty-box" style="padding:18px;">Digita almeno 2 lettere per cercare tra tutti i film e le serie TV.</div>`;
    return;
  }
  container.innerHTML = `<div class="loading-state" style="padding:18px;">🔍 Ricerca di "${escapeHtml(query)}"...</div>`;
  const data = await apiGet(`/api/search?q=${encodeURIComponent(query)}`);
  state.modalSearchResults = data.results || [];
  state.selectedModalIndices.clear();
  renderSearchResultCards(state.modalSearchResults, container, true);
}

// ============================================================================
// TV TIME SERIES EPISODE TRACKER MODAL (FLUID IN-PLACE UPDATES + SYNC ON CLOSE)
// ============================================================================
async function openSeriesTrackerModal(seriesId, searchItemMeta = null) {
  const modal = document.getElementById("modal-series");
  const body = document.getElementById("modal-series-body");
  modal.classList.remove("hidden");
  body.innerHTML = `<div class="loading-state">Caricamento stagioni ed episodi in stile TV Time...</div>`;

  const params = new URLSearchParams({
    series_id: String(seriesId || 0),
  });
  if (searchItemMeta) {
    params.set("title_it", searchItemMeta.title_it || searchItemMeta.title || "");
    params.set("title_original", searchItemMeta.title_original || searchItemMeta.title_it || "");
    if (searchItemMeta.tvmaze_id) {
      params.set("tvmaze_id", String(searchItemMeta.tvmaze_id));
    }
  }

  const data = await apiGet(`/api/series_episodes?${params.toString()}`);
  const resolvedSeriesId = data.series_id || seriesId || 0;
  const resolvedTitle = data.title_it || (searchItemMeta && searchItemMeta.title_it) || "Serie TV";
  document.getElementById("modal-series-title").textContent = `📺 ${resolvedTitle}`;

  state.activeSeriesModal = {
    seriesId: resolvedSeriesId,
    title_it: resolvedTitle,
    episodes: data.episodes || [],
    dirty: false,
    searchItemMeta: searchItemMeta || null,
    createdFromSearch: Boolean(!resolvedSeriesId),
  };

  renderSeriesTrackerModalBody();
}

function renderSeriesTrackerModalBody() {
  const body = document.getElementById("modal-series-body");
  if (!body || !state.activeSeriesModal) return;

  const savedScrollTop = body.scrollTop;
  const { episodes } = state.activeSeriesModal;
  const total = episodes.length || 1;
  const watchedCount = episodes.filter((e) => e.watched).length;
  const pct = Math.min(100, Math.round((watchedCount / total) * 100));
  const nextEp = episodes.find((e) => !e.watched);
  const allSeriesWatched = episodes.length > 0 && watchedCount === episodes.length;

  let statusHint = state.activeSeriesModal.createdFromSearch && watchedCount === 0
    ? "Spunta gli episodi visti per aggiungerla a ▶️ Stai Seguendo"
    : "🎯 Da Vedere (0 episodi visti)";
  if (watchedCount >= episodes.length && episodes.length > 0) {
    statusHint = "✅ Serie Completata (Già Visti)";
  } else if (watchedCount > 0) {
    statusHint = "▶️ Stai Seguendo (In corso)";
  }

  const bySeason = {};
  episodes.forEach((ep) => {
    bySeason[ep.season] = bySeason[ep.season] || [];
    bySeason[ep.season].push(ep);
  });

  let html = `
    <div class="progress-box">
      <div class="row-between">
        <strong>Stato avanzamento: ${watchedCount} / ${episodes.length} episodi visti (${pct}%)</strong>
        <span style="font-size:0.75rem;color:#fcd34d;font-weight:700;">${statusHint}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      ${nextEp
      ? `<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
               <span style="font-size:0.82rem;color:#fcd34d;">▶️ Prossimo da vedere: <strong>S${nextEp.season}E${nextEp.episode} — ${escapeHtml(nextEp.title)}</strong></span>
               <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                 <button type="button" class="btn-primary btn-sm" id="btn-mark-next-ep" data-s="${nextEp.season}" data-e="${nextEp.episode}">✓ Segna Visto</button>
                 <button type="button" class="btn-action btn-sm" id="btn-toggle-all-series" style="background:${allSeriesWatched ? "rgba(239, 68, 68, 0.15)" : "rgba(52, 211, 153, 0.15)"};color:${allSeriesWatched ? "#f87171" : "#34d399"};border:1px solid ${allSeriesWatched ? "rgba(239, 68, 68, 0.4)" : "rgba(52, 211, 153, 0.4)"};font-weight:600;">
                   ${allSeriesWatched ? "✕ Deseleziona tutta la Serie" : "✓ Spunta tutta la Serie"}
                 </button>
               </div>
             </div>`
      : `<div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
               <span style="font-size:0.82rem;color:#34d399;">🎉 Hai visto tutti gli episodi disponibili!</span>
               <button type="button" class="btn-action btn-sm" id="btn-toggle-all-series" style="background:rgba(239, 68, 68, 0.15);color:#f87171;border:1px solid rgba(239, 68, 68, 0.4);font-weight:600;">
                 ✕ Deseleziona tutta la Serie
               </button>
             </div>`
    }
    </div>
  `;

  Object.keys(bySeason)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((sNum) => {
      const sEps = bySeason[sNum];
      const sWatched = sEps.filter((x) => x.watched).length;
      const allSeasonWatched = sWatched === sEps.length;

      html += `
        <div class="season-block">
          <div class="season-header">
            <span>Stagione ${sNum} (${sWatched}/${sEps.length} visti)</span>
            <button
              type="button"
              class="btn-action btn-sm btn-toggle-season"
              data-s="${sNum}"
              data-all-watched="${allSeasonWatched ? "1" : "0"}"
              data-eps="${sEps.map((x) => x.episode).join(",")}"
            >
              ${allSeasonWatched ? "Deseleziona stagione" : "✓ Spunta tutta la Stagione"}
            </button>
          </div>
          <div class="season-episodes">
            ${sEps
          .map(
            (ep) => `
              <div class="episode-row" data-s="${ep.season}" data-e="${ep.episode}" style="cursor:pointer;">
                <div>
                  <strong>S${String(ep.season).padStart(2, "0")}E${String(ep.episode).padStart(2, "0")}</strong> — ${escapeHtml(ep.title)}
                  ${ep.airdate ? `<span style="color:var(--text-muted);font-size:0.72rem;margin-left:6px;">(${ep.airdate})</span>` : ""}
                </div>
                <button
                  type="button"
                  class="ep-check-btn ${ep.watched ? "watched" : ""}"
                  data-s="${ep.season}"
                  data-e="${ep.episode}"
                  data-w="${ep.watched ? "1" : "0"}"
                  title="Segna episodio visto"
                >✓</button>
              </div>
            `
          )
          .join("")}
          </div>
        </div>
      `;
    });

  body.innerHTML = html;
  body.scrollTop = savedScrollTop;

  const applyEpisodeApiResponse = (res) => {
    if (!state.activeSeriesModal || !res) return;
    if (typeof res.series_id === "number") {
      state.activeSeriesModal.seriesId = res.series_id;
    }
    if (state.activeSeriesModal.searchItemMeta) {
      state.activeSeriesModal.searchItemMeta.in_library_id = res.series_id || null;
      state.activeSeriesModal.searchItemMeta.in_library_status = res.status || null;
      state.activeSeriesModal.searchItemMeta.watched_episodes_count =
        typeof res.watched_count === "number"
          ? res.watched_count
          : state.activeSeriesModal.episodes.filter((x) => x.watched).length;
    }
  };

  const toggleSingleEpisodeInMemoryAndSync = async (seasonNum, epNum, newWatchedState) => {
    const targetEp = episodes.find((x) => Number(x.season) === seasonNum && Number(x.episode) === epNum);
    if (targetEp) {
      targetEp.watched = newWatchedState;
    }
    state.activeSeriesModal.dirty = true;
    renderSeriesTrackerModalBody();
    const res = await apiPost("/api/episodes/toggle", {
      series_id: state.activeSeriesModal.seriesId || 0,
      season: seasonNum,
      episode: epNum,
      watched: newWatchedState,
      total_episodes: episodes.length,
      series_meta: state.activeSeriesModal.searchItemMeta || { title_it: state.activeSeriesModal.title_it },
      created_from_search: Boolean(state.activeSeriesModal.createdFromSearch),
    });
    applyEpisodeApiResponse(res);
  };

  const nextBtn = body.querySelector("#btn-mark-next-ep");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      toggleSingleEpisodeInMemoryAndSync(Number(nextBtn.dataset.s), Number(nextBtn.dataset.e), true);
    });
  }

  body.querySelectorAll(".episode-row").forEach((row) => {
    row.addEventListener("click", () => {
      const s = Number(row.dataset.s);
      const e = Number(row.dataset.e);
      const targetEp = episodes.find((x) => Number(x.season) === s && Number(x.episode) === e);
      const currentlyWatched = targetEp ? Boolean(targetEp.watched) : false;
      toggleSingleEpisodeInMemoryAndSync(s, e, !currentlyWatched);
    });
  });

  body.querySelectorAll(".btn-toggle-season").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const s = Number(btn.dataset.s);
      const allW = btn.dataset.allWatched === "1";
      const newWatchedState = !allW;
      const epsList = btn.dataset.eps.split(",").filter(Boolean).map(Number);

      episodes.forEach((ep) => {
        if (Number(ep.season) === s) {
          ep.watched = newWatchedState;
        }
      });
      state.activeSeriesModal.dirty = true;
      renderSeriesTrackerModalBody();

      const res = await apiPost("/api/episodes/mark_season", {
        series_id: state.activeSeriesModal.seriesId || 0,
        season: s,
        episodes: epsList,
        watched: newWatchedState,
        total_episodes: episodes.length,
        series_meta: state.activeSeriesModal.searchItemMeta || { title_it: state.activeSeriesModal.title_it },
        created_from_search: Boolean(state.activeSeriesModal.createdFromSearch),
      });
      applyEpisodeApiResponse(res);
    });
  });

  const allSeriesBtn = body.querySelector("#btn-toggle-all-series");
  if (allSeriesBtn) {
    allSeriesBtn.addEventListener("click", async () => {
      const newWatchedState = !allSeriesWatched;
      episodes.forEach((ep) => {
        ep.watched = newWatchedState;
      });
      state.activeSeriesModal.dirty = true;
      renderSeriesTrackerModalBody();

      const res = await apiPost("/api/episodes/mark_all", {
        series_id: state.activeSeriesModal.seriesId || 0,
        watched: newWatchedState,
        total_episodes: episodes.length,
        series_meta: state.activeSeriesModal.searchItemMeta || { title_it: state.activeSeriesModal.title_it },
        created_from_search: Boolean(state.activeSeriesModal.createdFromSearch),
      });
      applyEpisodeApiResponse(res);
      showToast(newWatchedState ? `✅ Tutta la serie segnata come completata!` : `🎯 Tutta la serie segnata come da vedere!`);
    });
  }
}

function closeSeriesTrackerModal() {
  document.getElementById("modal-series").classList.add("hidden");
  if (state.activeSeriesModal && state.activeSeriesModal.dirty) {
    const modalState = state.activeSeriesModal;
    modalState.dirty = false;
    const watchedCnt = (modalState.episodes || []).filter((e) => e.watched).length;
    const totalCnt = (modalState.episodes || []).length;

    if (modalState.searchItemMeta) {
      if (watchedCnt > 0 && watchedCnt < totalCnt) {
        modalState.searchItemMeta.in_library_status = "watching";
        modalState.searchItemMeta.watched_episodes_count = watchedCnt;
        showToast(`▶️ "${modalState.title_it}" salvata in Stai Seguendo (${watchedCnt}/${totalCnt} episodi visti)!`);
      } else if (watchedCnt >= totalCnt && totalCnt > 0) {
        modalState.searchItemMeta.in_library_status = "watched";
        modalState.searchItemMeta.watched_episodes_count = watchedCnt;
        showToast(`✅ "${modalState.title_it}" salvata in Già Visti (tutti gli episodi spuntati)!`);
      } else if (watchedCnt === 0) {
        modalState.searchItemMeta.watched_episodes_count = 0;
        if (modalState.createdFromSearch) {
          modalState.searchItemMeta.in_library_status = null;
          modalState.searchItemMeta.in_library_id = null;
        } else {
          modalState.searchItemMeta.in_library_status = "wishlist";
        }
      }
      const searchContainer = document.getElementById("search-results-container");
      if (searchContainer && state.searchResults && state.searchResults.length > 0) {
        renderSearchResultCards(state.searchResults, searchContainer, false);
      }
    }

    loadLibrary();
    loadMatches(false);
  }
}

// ============================================================================
// TAB 4: ESPLORA PALINSESTI 7 GIORNI (TUTTI I FILM E LE SERIE SUI 70 CANALI)
// ============================================================================
async function loadExploreEpg() {
  const container = document.getElementById("explore-results-container");
  container.innerHTML = `<div class="loading-state">Caricamento film e serie TV in onda sui canali del DTT 1–70...</div>`;

  const params = new URLSearchParams({
    start_date: state.startDate,
    media_type: state.exploreMediaType,
    day: state.exploreDay,
    time_slot: state.exploreTimeSlot,
    lcn: state.exploreChannel,
    q: state.exploreQuery,
  });

  const data = await apiGet(`/api/explore_epg?${params.toString()}`);
  const events = data.events || [];
  state.exploreResults = events;

  if (events.length === 0) {
    container.innerHTML = `<div class="empty-box">Nessun programma trovato con questi filtri.</div>`;
    return;
  }

  container.innerHTML = events
    .map((ev, idx) => {
      const isMovie = ev.media_type === "movie";
      const inWish = ev.in_library_status === "wishlist";
      const inWatched = ev.in_library_status === "watched";
      const posterHtml = ev.poster
        ? `<img src="${escapeHtml(ev.poster)}" alt="${escapeHtml(ev.title)}" class="tv-poster" loading="lazy" onerror="this.outerHTML='<div class=\\'tv-poster\\'>${isMovie ? "🎬" : "📺"}</div>'" />`
        : `<div class="tv-poster">${isMovie ? "🎬" : "📺"}</div>`;

      const isSkyEv = Boolean(ev.is_sky || Number(ev.lcn || 0) >= 100);
      const badgeColor = isSkyEv ? "#dc2626" : "#009fe3";
      const badgePrefix = isSkyEv ? "🛰️ SKY" : "CH";

      return `
        <article class="tv-card">
          ${posterHtml}
          <div class="tv-body">
            <div class="tv-meta-top">
              <span class="lcn-badge ${isSkyEv ? "sky" : "dtt"}" style="background:${badgeColor};">
                ${badgePrefix} ${ev.lcn} • ${escapeHtml(ev.channel_name)}
              </span>
              <span class="time-badge">
                📅 ${formatItalianDate(ev.date)} • 🕒 ${ev.start_time}
              </span>
              <span class="list-status-pill ${isMovie ? "wishlist" : "watched"}">
                ${isMovie ? "🎬 Film" : "📺 Serie TV"}
              </span>
            </div>
            <h3 class="tv-title">${escapeHtml(ev.title)}</h3>
            ${ev.season || ev.episode || ev.episode_title
          ? `<div class="tv-ep-line">${ev.season ? "S" + ev.season : ""}${ev.episode ? "E" + ev.episode : ""} ${escapeHtml(ev.episode_title || "")}</div>`
          : ""
        }
            <p class="tv-desc">${escapeHtml(ev.description || "")}</p>
            <div class="tv-actions">
              <button
                type="button"
                class="${inWish ? "btn-action active-watched" : "btn-primary btn-sm"} btn-quick-add-epg"
                data-idx="${idx}"
                data-status="wishlist"
              >
                ${inWish ? "🎯 In Da Vedere (Rimuovi ✕)" : "🎯 + Da Vedere (Wishlist)"}
              </button>
              <button
                type="button"
                class="btn-action ${inWatched ? "active-watched" : ""} btn-quick-add-epg"
                data-idx="${idx}"
                data-status="watched"
              >
                ${inWatched ? "✅ In Già Visti (Rimuovi ✕)" : "✅ + Già Visto"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll(".btn-quick-add-epg").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.idx);
      const status = btn.dataset.status;
      const ev = state.exploreResults[idx];
      if (!ev) return;
      const tempItem = {
        title_it: ev.title,
        title_original: ev.title,
        media_type: ev.media_type,
        poster: ev.poster,
        genre: ev.genre,
        description: ev.description,
        in_library_status: ev.in_library_status,
        in_library_id: ev.in_library_id,
      };
      await addCatalogItemToLibrary(tempItem, status, btn);
      ev.in_library_status = tempItem.in_library_status;
      ev.in_library_id = tempItem.in_library_id;
      loadExploreEpg();
    });
  });
}

// ============================================================================
// SECURITY & ACCESS AUDIT LOG (DISCREET 🛡️ ICON - 7-DAY AUTO PURGE)
// ============================================================================
function detectDeviceName() {
  const ua = navigator.userAgent || "";
  let os = "Dispositivo Sconosciuto";
  let icon = "💻";

  if (/android/i.test(ua)) {
    os = "Telefono Android";
    icon = "📱";
  } else if (/iphone/i.test(ua)) {
    os = "Apple iPhone";
    icon = "📱";
  } else if (/ipad/i.test(ua)) {
    os = "Apple iPad";
    icon = "📱";
  } else if (/windows/i.test(ua)) {
    os = "PC Windows";
    icon = "💻";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "Mac OS";
    icon = "💻";
  } else if (/linux/i.test(ua)) {
    os = "PC Linux";
    icon = "💻";
  }

  let browser = "Browser";
  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";

  return { label: `${os} (${browser})`, icon };
}

function openBackupModal() {
  const modal = document.getElementById("modal-backup");
  if (!modal) return;
  modal.classList.remove("hidden");
}

function requestNotificationPermissionAndSchedule(rem) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
  if (Notification.permission === "granted") {
    try {
      new Notification(`🔔 Promemoria TV salvato: ${rem.title}`, {
        body: `Andrà in onda ${formatItalianDate(rem.date)} alle ${rem.start_time} su Canale ${rem.lcn} (${rem.channel_name})`,
        icon: "./icon.svg",
      });
    } catch (e) { }
  }
}

async function openRemindersModal() {
  const modal = document.getElementById("modal-reminders");
  const listEl = document.getElementById("reminders-list-body");
  modal.classList.remove("hidden");

  const data = await apiGet("/api/reminders");
  state.reminders = data.reminders || [];
  document.getElementById("reminders-count-badge").textContent = state.reminders.length;

  if (state.reminders.length === 0) {
    listEl.innerHTML = `<div class="empty-box">Non hai ancora impostato promemoria. Tocca "🔔 Avvisami" su qualsiasi film o serie in onda!</div>`;
    return;
  }

  listEl.innerHTML = state.reminders
    .map((r) => {
      const isSkyR = Boolean(r.is_sky || Number(r.lcn || 0) >= 100);
      const badgeColor = isSkyR ? "#dc2626" : "#009fe3";
      const badgePrefix = isSkyR ? "🛰️ SKY" : "CH";
      return `
      <div class="tv-card">
        <div class="tv-body">
          <div class="tv-meta-top">
            <span class="lcn-badge ${isSkyR ? "sky" : "dtt"}" style="background:${badgeColor};color:#fff;">${badgePrefix} ${r.lcn} • ${escapeHtml(r.channel_name)}</span>
            <span class="time-badge">📅 ${formatItalianDate(r.date)} • 🕒 ${r.start_time}</span>
          </div>
          <h4 class="tv-title">${escapeHtml(r.title)} ${r.episode_info ? `(${escapeHtml(r.episode_info)})` : ""}</h4>
          <div class="tv-actions" style="margin-top:8px;">
            <a href="${buildGoogleCalendarUrl(r)}" target="_blank" class="btn-action">📅 Aggiungi a Google Calendar</a>
            <button type="button" class="btn-action btn-remove-rem" data-id="${escapeHtml(r.event_id)}" style="color:#f87171;">🗑️ Rimuovi</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  listEl.querySelectorAll(".btn-remove-rem").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await apiPost("/api/reminders/toggle", { event_id: btn.dataset.id });
      openRemindersModal();
      loadMatches(false);
    });
  });
}

function renderAndroidQrCode() {
  const qrImg = document.getElementById("android-qr-img");
  let targetUrl = state.mobileUrl || window.location.href;
  if (state.syncCode && !targetUrl.includes("sync=")) {
    const sep = targetUrl.includes("?") ? "&" : "?";
    targetUrl = `${targetUrl}${sep}sync=${encodeURIComponent(state.syncCode)}`;
  }
  if (qrImg && targetUrl) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(targetUrl)}`;
  }
}

async function openSyncAndAndroidModal() {
  const stRes = await apiGet("/api/status");
  if (stRes.sync_code) {
    state.syncCode = stRes.sync_code;
    localStorage.setItem("nextontv_sync_code", "shynicy_nextontv");
  }
  if (stRes.mobile_url) state.mobileUrl = stRes.mobile_url;

  const syncInput = document.getElementById("input-sync-code");
  if (syncInput) syncInput.value = state.syncCode;

  const lanEl = document.getElementById("android-lan-url");
  if (lanEl) {
    lanEl.textContent = state.mobileUrl;
    lanEl.href = state.mobileUrl;
  }

  renderAndroidQrCode();
  document.getElementById("modal-android").classList.remove("hidden");
}

// ============================================================================
// NAVIGATION & UI EVENT LISTENERS
// ============================================================================
function setupNavigationAndEvents() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const targetId = btn.dataset.tab;
      document.getElementById(targetId).classList.add("active");

      // Auto-clear search and filter bars when switching between sections
      const libFilter = document.getElementById("lib-filter-input");
      if (libFilter && (libFilter.value || state.libQuery)) {
        libFilter.value = "";
        state.libQuery = "";
      }
      const catalogSearch = document.getElementById("catalog-search-input");
      if (catalogSearch && catalogSearch.value) {
        catalogSearch.value = "";
      }

      if (targetId === "tab-explore") {
        loadExploreEpg();
      } else if (targetId === "tab-streaming") {
        loadStreamingTab();
      } else if (targetId === "tab-library") {
        loadLibrary();
      } else if (targetId === "tab-matches") {
        loadMatches(false);
      }
    });
  });

  document.querySelectorAll("#match-category-grid .cat-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll("#match-category-grid .cat-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      state.matchFilterMode = card.dataset.mode;
      loadMatches(false);
    });
  });

  document.getElementById("match-timeslot").addEventListener("change", (e) => {
    state.matchTimeSlot = e.target.value;
    loadMatches(false);
  });
  document.getElementById("match-channel").addEventListener("change", (e) => {
    state.matchChannel = e.target.value;
    loadMatches(false);
  });
  document.getElementById("match-only-unwatched").addEventListener("change", (e) => {
    state.matchOnlyUnwatched = e.target.checked;
    loadMatches(false);
  });

  const btnToggleSky = document.getElementById("btn-toggle-sky");
  if (btnToggleSky) {
    btnToggleSky.addEventListener("click", () => {
      state.includeSky = !state.includeSky;
      btnToggleSky.classList.toggle("active", state.includeSky);
      const stateTextEl = document.getElementById("sky-toggle-state-text");
      if (stateTextEl) {
        stateTextEl.textContent = state.includeSky ? "ON" : "OFF";
      }
      populateChannelDropdowns();
      loadMatches(false);
      loadLibrary();
      showToast(
        state.includeSky
          ? "🛰️ Palinsesto Sky ATTIVATO: ora vedi anche i programmi di Sky Cinema e Sky Serie!"
          : "📡 Palinsesto Sky DISATTIVATO: ora vedi solo il Digitale Terrestre (LCN 1–70)."
      );
    });
  }

  // Tab "In Streaming" Filters (Category Cards, Multi-Platform Pills, Media Type, Unwatched)
  document.querySelectorAll("#streaming-category-grid .cat-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll("#streaming-category-grid .cat-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      state.streamStatusMode = card.dataset.mode || "all";
      renderStreamingTab();
    });
  });

  document.querySelectorAll("#streaming-platforms-bar .plat-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const pid = pill.dataset.plat;
      if (pid === "all") {
        state.streamPlatforms.clear();
      } else {
        if (state.streamPlatforms.has(pid)) {
          state.streamPlatforms.delete(pid);
        } else {
          state.streamPlatforms.add(pid);
        }
      }
      renderStreamingTab();
    });
  });

  document.querySelectorAll("#stream-type-pills .mini-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#stream-type-pills .mini-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.streamMediaType = btn.dataset.type || "all";
      renderStreamingTab();
    });
  });

  const streamOnlyUnwatchedEl = document.getElementById("stream-only-unwatched");
  if (streamOnlyUnwatchedEl) {
    streamOnlyUnwatchedEl.addEventListener("change", (e) => {
      state.streamOnlyUnwatched = e.target.checked;
      renderStreamingTab();
    });
  }

  document.getElementById("btn-refresh-epg").addEventListener("click", () => {
    loadMatches(true);
    loadLibrary();
  });

  // Tab 2 Library Filters
  document.querySelectorAll("#lib-status-tabs .seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#lib-status-tabs .seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.libStatus = btn.dataset.status;
      renderLibrary();
    });
  });

  document.querySelectorAll("#lib-type-pills .mini-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#lib-type-pills .mini-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.libType = btn.dataset.type;
      renderLibrary();
    });
  });

  const libFilterInput = document.getElementById("lib-filter-input");
  if (libFilterInput) {
    const clearLibFilter = () => {
      if (libFilterInput.value || state.libQuery) {
        libFilterInput.value = "";
        state.libQuery = "";
        renderLibrary();
      }
    };
    libFilterInput.addEventListener("click", clearLibFilter);
    libFilterInput.addEventListener("focus", clearLibFilter);
    libFilterInput.addEventListener("input", (e) => {
      state.libQuery = e.target.value;
      renderLibrary();
    });
  }

  const libSortSelect = document.getElementById("lib-sort-select");
  if (libSortSelect) {
    libSortSelect.addEventListener("change", (e) => {
      state.libSort = e.target.value || "az";
      renderLibrary();
    });
  }

  const libViewMode = document.getElementById("lib-view-mode");
  if (libViewMode) {
    libViewMode.addEventListener("change", (e) => {
      state.libViewMode = e.target.value || "cards";
      renderLibrary();
    });
  }

  // Backup & Restore handlers
  const btnExportBackup = document.getElementById("btn-export-backup");
  if (btnExportBackup) {
    btnExportBackup.addEventListener("click", () => {
      const snap = getLocalSnapshot();
      const lib = (snap.library && snap.library.length > 0) ? snap.library : state.libraryItems;
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const filename = `NextOnTV_Backup_${dateStr}.json`;
      const blob = new Blob([JSON.stringify(lib, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`💾 Backup salvato con successo! (${lib.length} titoli in ${filename})`);
    });
  }

  const btnImportTrigger = document.getElementById("btn-import-backup-trigger");
  const fileInputBackup = document.getElementById("input-import-backup");
  if (btnImportTrigger && fileInputBackup) {
    btnImportTrigger.addEventListener("click", () => fileInputBackup.click());
    fileInputBackup.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          let items = [];
          if (Array.isArray(parsed)) items = parsed;
          else if (parsed && Array.isArray(parsed.library)) items = parsed.library;
          else if (parsed && Array.isArray(parsed.items)) items = parsed.items;

          if (!items || items.length === 0) {
            showToast("⚠️ Il file selezionato non contiene titoli validi.");
            return;
          }

          const snap = getLocalSnapshot();
          snap.library = items;
          snap.deleted_keys = [];
          snap.updated_at = Date.now() / 1000;
          saveLocalSnapshot(snap);
          state.libraryItems = items;

          if (state.isCloudMode) {
            await pushCloudSnapshotClient(state.syncCode, snap);
          } else {
            try {
              await apiPost("/api/library/batch", { action: "restore", items });
            } catch (err) { }
          }

          sessionStorage.setItem("nextontv_reload_toast", `✅ Ripristinati con successo ${items.length} titoli dal backup!`);
          showToast(`✅ Backup acquisito (${items.length} titoli)! Ricarica pagina in corso...`);
          setTimeout(() => {
            window.location.reload();
          }, 600);
        } catch (err) {
          showToast("❌ Errore nella lettura del file backup: " + err.message);
        } finally {
          fileInputBackup.value = "";
        }
      };
      reader.readAsText(file);
    });
  }

  const btnRestoreGh = document.getElementById("btn-restore-github");
  if (btnRestoreGh) {
    btnRestoreGh.addEventListener("click", async () => {
      btnRestoreGh.disabled = true;
      btnRestoreGh.textContent = "⏳ Ricarica...";
      try {
        const res = await fetch(resolveAssetUrl("data/library.json"), { cache: "no-cache" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const defLib = await res.json();
        if (!Array.isArray(defLib) || defLib.length === 0) {
          throw new Error("File remoto vuoto o non valido");
        }

        const snap = getLocalSnapshot();
        snap.library = defLib;
        snap.deleted_keys = [];
        snap.updated_at = Date.now() / 1000;
        saveLocalSnapshot(snap);
        state.libraryItems = defLib;

        if (state.isCloudMode) {
          await pushCloudSnapshotClient(state.syncCode, snap);
        } else {
          try {
            await apiPost("/api/library/batch", { action: "restore", items: defLib });
          } catch (err) { }
        }

        sessionStorage.setItem("nextontv_reload_toast", `🔄 Copia ufficiale ripristinata da GitHub (${defLib.length} titoli)!`);
        showToast(`🔄 Copia GitHub acquisita (${defLib.length} titoli)! Ricarica pagina in corso...`);
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } catch (err) {
        showToast("❌ Impossibile caricare da GitHub: " + err.message);
      } finally {
        btnRestoreGh.disabled = false;
        btnRestoreGh.textContent = "🔄 Ricarica da GitHub";
      }
    });
  }

  // Tab 3 Search (ONLY on form submit / Cerca button click or Enter key!)
  const mainSearchInput = document.getElementById("catalog-search-input");
  if (mainSearchInput) {
    mainSearchInput.addEventListener("click", () => {
      if (mainSearchInput.value) {
        mainSearchInput.value = "";
      }
    });
    mainSearchInput.addEventListener("focus", () => {
      if (mainSearchInput.value) {
        mainSearchInput.value = "";
      }
    });
  }
  document.getElementById("catalog-search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = mainSearchInput.value.trim();
    if (q) executeCatalogSearch(q);
  });

  // Tab 3: Search Type Filters Toggle (🎬 Solo Film / 📺 Solo Serie TV)
  const btnSearchMovie = document.getElementById("filter-search-movies");
  const btnSearchSeries = document.getElementById("filter-search-series");

  if (btnSearchMovie && btnSearchSeries) {
    btnSearchMovie.addEventListener("click", () => {
      if (state.searchMediaType === "movie") {
        state.searchMediaType = "all";
        btnSearchMovie.classList.remove("active");
      } else {
        state.searchMediaType = "movie";
        btnSearchMovie.classList.add("active");
        btnSearchSeries.classList.remove("active");
      }
      // Se c'è già una ricerca visualizzata a schermo, aggiorna subito il filtro!
      const container = document.getElementById("search-results-container");
      if (state.searchRawResults && state.searchRawResults.length > 0 && container) {
        applySearchFilterAndRender(container);
      }
    });

    btnSearchSeries.addEventListener("click", () => {
      if (state.searchMediaType === "series") {
        state.searchMediaType = "all";
        btnSearchSeries.classList.remove("active");
      } else {
        state.searchMediaType = "series";
        btnSearchSeries.classList.add("active");
        btnSearchMovie.classList.remove("active");
      }
      // Se c'è già una ricerca visualizzata a schermo, aggiorna subito il filtro!
      const container = document.getElementById("search-results-container");
      if (state.searchRawResults && state.searchRawResults.length > 0 && container) {
        applySearchFilterAndRender(container);
      }
    });
  }

  document.querySelectorAll(".chip-suggest").forEach((chip) => {
    chip.addEventListener("click", () => {
      const q = chip.dataset.q;
      mainSearchInput.value = q;
      executeCatalogSearch(q);
    });
  });

  // Modal Search (ONLY on Cerca button click or Enter key)
  const modalSearchInput = document.getElementById("modal-live-search-input");
  if (modalSearchInput) {
    modalSearchInput.addEventListener("click", () => {
      if (modalSearchInput.value) {
        modalSearchInput.value = "";
      }
    });
    modalSearchInput.addEventListener("focus", () => {
      if (modalSearchInput.value) {
        modalSearchInput.value = "";
      }
    });
    modalSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        executeModalLiveSearch(modalSearchInput.value.trim());
      }
    });
  }

  const btnModalSearch = document.getElementById("btn-modal-live-search");
  if (btnModalSearch && modalSearchInput) {
    btnModalSearch.addEventListener("click", () => {
      executeModalLiveSearch(modalSearchInput.value.trim());
    });
  }

  // Backup Modal Listeners (💾)
  const btnOpenBackupModal = document.getElementById("btn-open-backup-modal");
  if (btnOpenBackupModal) {
    btnOpenBackupModal.addEventListener("click", openBackupModal);
  }
  const btnCloseBackup = document.getElementById("close-modal-backup");
  if (btnCloseBackup) {
    btnCloseBackup.addEventListener("click", () => {
      const modal = document.getElementById("modal-backup");
      if (modal) modal.classList.add("hidden");
    });
  }
  const modalBackup = document.getElementById("modal-backup");
  if (modalBackup) {
    modalBackup.addEventListener("click", (e) => {
      if (e.target.id === "modal-backup") {
        modalBackup.classList.add("hidden");
      }
    });
  }

  // Modals Close & Open
  document.getElementById("close-modal-series").addEventListener("click", closeSeriesTrackerModal);
  document.getElementById("modal-series").addEventListener("click", (e) => {
    if (e.target.id === "modal-series") {
      closeSeriesTrackerModal();
    }
  });

  const btnOpenCustom = document.getElementById("btn-open-custom-add");
  if (btnOpenCustom) {
    btnOpenCustom.addEventListener("click", () => {
      document.getElementById("modal-custom-add").classList.remove("hidden");
      setTimeout(() => modalSearchInput.focus(), 100);
    });
  }
  document.getElementById("close-modal-custom").addEventListener("click", () => {
    document.getElementById("modal-custom-add").classList.add("hidden");
  });

  document.getElementById("form-custom-add").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title_it = document.getElementById("custom-title-it").value.trim();
    const title_original = document.getElementById("custom-title-orig").value.trim() || title_it;
    const media_type = document.getElementById("custom-media-type").value;
    const status = document.getElementById("custom-status").value;

    await apiPost("/api/library", { title_it, title_original, media_type, status });
    document.getElementById("form-custom-add").reset();
    document.getElementById("modal-custom-add").classList.add("hidden");
    showToast(`✨ "${title_it}" aggiunto alle tue liste!`);
    await loadLibrary();
    loadMatches(false);
  });

  const btnOpenRem = document.getElementById("btn-open-reminders");
  if (btnOpenRem) {
    btnOpenRem.addEventListener("click", openRemindersModal);
  }
  const btnCloseRem = document.getElementById("close-modal-reminders");
  if (btnCloseRem) {
    btnCloseRem.addEventListener("click", () => {
      document.getElementById("modal-reminders").classList.add("hidden");
    });
  }

  document.getElementById("btn-enable-notifications").addEventListener("click", async () => {
    if (!("Notification" in window)) {
      showToast("Questo browser non supporta le notifiche desktop/mobile.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      showToast("🔔 Notifiche dispositivo attivate con successo!");
    } else {
      showToast("Permesso notifiche non concesso.");
    }
  });

  document.getElementById("btn-open-android").addEventListener("click", openSyncAndAndroidModal);
  document.getElementById("close-modal-android").addEventListener("click", () => {
    document.getElementById("modal-android").classList.add("hidden");
  });

  const btnQrPublic = document.getElementById("btn-qr-public");
  const btnQrWifi = document.getElementById("btn-qr-wifi");
  if (btnQrPublic) {
    btnQrPublic.addEventListener("click", () => renderAndroidQrCode("public"));
  }
  if (btnQrWifi) {
    btnQrWifi.addEventListener("click", () => renderAndroidQrCode("wifi"));
  }

  const btnCopyPub = document.getElementById("btn-copy-public-url");
  if (btnCopyPub) {
    btnCopyPub.addEventListener("click", async () => {
      const url = state.publicUrl || state.mobileUrl;
      if (navigator.clipboard && url) {
        await navigator.clipboard.writeText(url);
        showToast("📋 Link 4G/5G copiato negli appunti!");
      }
    });
  }

  const btnCopyLan = document.getElementById("btn-copy-lan-url");
  if (btnCopyLan) {
    btnCopyLan.addEventListener("click", async () => {
      const url = state.mobileUrl;
      if (navigator.clipboard && url) {
        await navigator.clipboard.writeText(url);
        showToast("📋 Link Wi-Fi Casa copiato negli appunti!");
      }
    });
  }

  const btnSyncNow = document.getElementById("btn-sync-now");
  if (btnSyncNow) {
    btnSyncNow.addEventListener("click", async () => {
      const inputEl = document.getElementById("input-sync-code");
      const newCode = inputEl ? inputEl.value.trim().toLowerCase() : "";
      if (newCode) {
        state.syncCode = newCode;
        localStorage.setItem("nextontv_sync_code", "shynicy_nextontv");
      }
      const msgEl = document.getElementById("sync-status-msg");
      if (msgEl) msgEl.textContent = "⏳ Sincronizzazione Cloud PC ↔ Telefono in corso...";

      if (!state.isCloudMode) {
        const res = await apiPost("/api/sync", { sync_code: state.syncCode });
        if (msgEl) msgEl.textContent = `✅ Sincronizzato col Cloud! (${res.library_count || 0} titoli in lista • Codice: ${res.sync_code})`;
      } else {
        const snap = await pullCloudSnapshotClient(state.syncCode);
        if (snap) {
          if (msgEl) msgEl.textContent = `✅ Dati scaricati dal Cloud in 4G/5G! (${(snap.library || []).length} titoli in lista)`;
        } else {
          await pushCloudSnapshotClient(state.syncCode, getLocalSnapshot());
          if (msgEl) msgEl.textContent = `✅ Dati inviati al Cloud in 4G/5G! (Codice: ${state.syncCode})`;
        }
      }
      await loadLibrary();
      await loadMatches(false);
      showToast("☁️ Sincronizzazione PC ↔ Telefono completata!");
    });
  }
}

document.addEventListener("DOMContentLoaded", initApp);
