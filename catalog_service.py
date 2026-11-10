import concurrent.futures
import html
import json
import re
import ssl
import unicodedata
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Tuple

from epg_engine import normalize_title, strip_conjunctions, strip_leading_article

SSL_CTX = ssl._create_unverified_context()
USER_AGENT = "NextOnTV/1.0 (https://shynicy.github.io/NextOnTV/; contact@nextontv.example)"

SAGA_GROUPS: List[Dict] = [
    {"id": "fast_furious", "names": ["fast and furious", "fast & furious", "the fast and the furious", "fast furious", "f&f"]},
    {"id": "harry_potter", "names": ["harry potter", "harry poter", "potter"]},
    {"id": "lotr", "names": ["il signore degli anelli", "signore degli anelli", "lord of the rings", "lotr"]},
    {"id": "pirates", "names": ["pirati dei caraibi", "pirates of the caribbean", "la maledizione della prima luna"]},
    {"id": "back_to_future", "names": ["ritorno al futuro", "back to the future"]},
    {"id": "rocky", "names": ["rocky", "rocky balboa", "creed"]},
    {"id": "bad_boys", "names": ["bad boys", "bad boy"]},
    {"id": "hunger_games", "names": ["hunger games", "the hunger games", "hunger game"]},
]

# Comprehensive bilingual alias & saga catalog (Italian broadcast title <-> Original title)
ITALIAN_ORIGINAL_ALIASES: List[Dict] = [
    # Harry Potter Complete 8-Movie Saga
    {"it": "Harry Potter e la pietra filosofale", "orig": "Harry Potter and the Sorcerer's Stone", "type": "movie", "year": "2001", "aliases": ["harry potter 1", "pietra filosofale"], "saga_group": "harry_potter", "saga_rank": 1},
    {"it": "Harry Potter e la camera dei segreti", "orig": "Harry Potter and the Chamber of Secrets", "type": "movie", "year": "2002", "aliases": ["harry potter 2", "camera dei segreti"], "saga_group": "harry_potter", "saga_rank": 2},
    {"it": "Harry Potter e il prigioniero di Azkaban", "orig": "Harry Potter and the Prisoner of Azkaban", "type": "movie", "year": "2004", "aliases": ["harry potter 3", "prigioniero di azkaban"], "saga_group": "harry_potter", "saga_rank": 3},
    {"it": "Harry Potter e il calice di fuoco", "orig": "Harry Potter and the Goblet of Fire", "type": "movie", "year": "2005", "aliases": ["harry potter 4", "calice di fuoco"], "saga_group": "harry_potter", "saga_rank": 4},
    {"it": "Harry Potter e l'Ordine della Fenice", "orig": "Harry Potter and the Order of the Phoenix", "type": "movie", "year": "2007", "aliases": ["harry potter 5", "ordine della fenice"], "saga_group": "harry_potter", "saga_rank": 5},
    {"it": "Harry Potter e il principe mezzosangue", "orig": "Harry Potter and the Half-Blood Prince", "type": "movie", "year": "2009", "aliases": ["harry potter 6", "principe mezzosangue"], "saga_group": "harry_potter", "saga_rank": 6},
    {"it": "Harry Potter e i Doni della Morte - Parte 1", "orig": "Harry Potter and the Deathly Hallows: Part 1", "type": "movie", "year": "2010", "aliases": ["harry potter 7", "doni della morte 1", "doni della morte parte 1"], "saga_group": "harry_potter", "saga_rank": 7},
    {"it": "Harry Potter e i Doni della Morte - Parte 2", "orig": "Harry Potter and the Deathly Hallows: Part 2", "type": "movie", "year": "2011", "aliases": ["harry potter 8", "doni della morte 2", "doni della morte parte 2"], "saga_group": "harry_potter", "saga_rank": 8},
    # Fast & Furious Complete 11-Movie Saga
    {"it": "Fast and Furious", "orig": "The Fast and the Furious", "type": "movie", "year": "2001", "aliases": ["fast & furious 1", "fast and furious 1", "fast 1", "the fast and the furious", "the fast and the furious 1"], "saga_group": "fast_furious", "saga_rank": 1},
    {"it": "2 Fast 2 Furious", "orig": "2 Fast 2 Furious", "type": "movie", "year": "2003", "aliases": ["fast & furious 2", "fast and furious 2", "fast 2", "2fast2furious", "2 fast 2 furious"], "saga_group": "fast_furious", "saga_rank": 2},
    {"it": "The Fast and the Furious: Tokyo Drift", "orig": "The Fast and the Furious: Tokyo Drift", "type": "movie", "year": "2006", "aliases": ["fast & furious 3", "fast and furious 3", "fast 3", "tokyo drift"], "saga_group": "fast_furious", "saga_rank": 3},
    {"it": "Fast & Furious - Solo parti originali", "orig": "Fast & Furious", "type": "movie", "year": "2009", "aliases": ["fast and furious 4", "fast & furious 4", "fast 4", "solo parti originali"], "saga_group": "fast_furious", "saga_rank": 4},
    {"it": "Fast & Furious 5", "orig": "Fast Five", "type": "movie", "year": "2011", "aliases": ["fast and furious 5", "fast & furious 5", "fast 5", "fast five"], "saga_group": "fast_furious", "saga_rank": 5},
    {"it": "Fast & Furious 6", "orig": "Fast & Furious 6", "type": "movie", "year": "2013", "aliases": ["fast and furious 6", "fast & furious 6", "fast 6"], "saga_group": "fast_furious", "saga_rank": 6},
    {"it": "Fast & Furious 7", "orig": "Furious 7", "type": "movie", "year": "2015", "aliases": ["fast and furious 7", "fast & furious 7", "furious 7", "fast 7"], "saga_group": "fast_furious", "saga_rank": 7},
    {"it": "Fast & Furious 8", "orig": "The Fate of the Furious", "type": "movie", "year": "2017", "aliases": ["fast and furious 8", "fast & furious 8", "fate of the furious", "fast 8"], "saga_group": "fast_furious", "saga_rank": 8},
    {"it": "Fast & Furious - Hobbs & Shaw", "orig": "Fast & Furious Presents: Hobbs & Shaw", "type": "movie", "year": "2019", "aliases": ["fast and furious hobbs and shaw", "hobbs and shaw", "hobbs & shaw"], "saga_group": "fast_furious", "saga_rank": 9},
    {"it": "Fast & Furious 9 - The Fast Saga", "orig": "F9: The Fast Saga", "type": "movie", "year": "2021", "aliases": ["fast and furious 9", "fast & furious 9", "fast 9", "f9"], "saga_group": "fast_furious", "saga_rank": 10},
    {"it": "Fast X", "orig": "Fast X", "type": "movie", "year": "2023", "aliases": ["fast and furious 10", "fast & furious 10", "fast 10", "fast x"], "saga_group": "fast_furious", "saga_rank": 11},
    # Animali Fantastici
    {"it": "Animali fantastici e dove trovarli", "orig": "Fantastic Beasts and Where to Find Them", "type": "movie", "year": "2016"},
    {"it": "Animali fantastici - I crimini di Grindelwald", "orig": "Fantastic Beasts: The Crimes of Grindelwald", "type": "movie", "year": "2018"},
    {"it": "Animali fantastici - I segreti di Silente", "orig": "Fantastic Beasts: The Secrets of Dumbledore", "type": "movie", "year": "2022"},
    # Il Signore degli Anelli & Lo Hobbit
    {"it": "Il Signore degli Anelli - La Compagnia dell'Anello", "orig": "The Lord of the Rings: The Fellowship of the Ring", "type": "movie", "year": "2001", "aliases": ["signore degli anelli 1", "compagnia dell anello"], "saga_group": "lotr", "saga_rank": 1},
    {"it": "Il Signore degli Anelli - Le due torri", "orig": "The Lord of the Rings: The Two Towers", "type": "movie", "year": "2002", "aliases": ["signore degli anelli 2", "due torri"], "saga_group": "lotr", "saga_rank": 2},
    {"it": "Il Signore degli Anelli - Il ritorno del re", "orig": "The Lord of the Rings: The Return of the King", "type": "movie", "year": "2003", "aliases": ["signore degli anelli 3", "ritorno del re"], "saga_group": "lotr", "saga_rank": 3},
    {"it": "Lo Hobbit - Un viaggio inaspettato", "orig": "The Hobbit: An Unexpected Journey", "type": "movie", "year": "2012"},
    {"it": "Lo Hobbit - La desolazione di Smaug", "orig": "The Hobbit: The Desolation of Smaug", "type": "movie", "year": "2013"},
    {"it": "Lo Hobbit - La battaglia delle cinque armate", "orig": "The Hobbit: The Battle of the Five Armies", "type": "movie", "year": "2014"},
    # Ritorno al futuro
    {"it": "Ritorno al futuro", "orig": "Back to the Future", "type": "movie", "year": "1985", "aliases": ["ritorno al futuro 1", "back to the future 1"], "saga_group": "back_to_future", "saga_rank": 1},
    {"it": "Ritorno al futuro - Parte II", "orig": "Back to the Future Part II", "type": "movie", "year": "1989", "aliases": ["ritorno al futuro 2", "back to the future 2"], "saga_group": "back_to_future", "saga_rank": 2},
    {"it": "Ritorno al futuro - Parte III", "orig": "Back to the Future Part III", "type": "movie", "year": "1990", "aliases": ["ritorno al futuro 3", "back to the future 3"], "saga_group": "back_to_future", "saga_rank": 3},
    # Rocky & Creed Complete 9-Movie Saga
    {"it": "Rocky", "orig": "Rocky", "type": "movie", "year": "1976", "aliases": ["rocky 1", "rocky i", "rocky balboa 1"], "saga_group": "rocky", "saga_rank": 1},
    {"it": "Rocky II", "orig": "Rocky II", "type": "movie", "year": "1979", "aliases": ["rocky 2", "rocky ii", "rocky balboa 2"], "saga_group": "rocky", "saga_rank": 2},
    {"it": "Rocky III", "orig": "Rocky III", "type": "movie", "year": "1982", "aliases": ["rocky 3", "rocky iii", "rocky balboa 3"], "saga_group": "rocky", "saga_rank": 3},
    {"it": "Rocky IV", "orig": "Rocky IV", "type": "movie", "year": "1985", "aliases": ["rocky 4", "rocky iv", "rocky balboa 4"], "saga_group": "rocky", "saga_rank": 4},
    {"it": "Rocky V", "orig": "Rocky V", "type": "movie", "year": "1990", "aliases": ["rocky 5", "rocky v", "rocky balboa 5"], "saga_group": "rocky", "saga_rank": 5},
    {"it": "Rocky Balboa", "orig": "Rocky Balboa", "type": "movie", "year": "2006", "aliases": ["rocky 6", "rocky vi", "rocky balboa"], "saga_group": "rocky", "saga_rank": 6},
    {"it": "Creed - Nato per combattere", "orig": "Creed", "type": "movie", "year": "2015", "aliases": ["creed 1", "creed", "rocky 7", "rocky vii"], "saga_group": "rocky", "saga_rank": 7},
    {"it": "Creed II", "orig": "Creed II", "type": "movie", "year": "2018", "aliases": ["creed 2", "creed ii", "rocky 8", "rocky viii"], "saga_group": "rocky", "saga_rank": 8},
    {"it": "Creed III", "orig": "Creed III", "type": "movie", "year": "2023", "aliases": ["creed 3", "creed iii", "rocky 9", "rocky ix"], "saga_group": "rocky", "saga_rank": 9},
    # Pirati dei Caraibi
    {"it": "La maledizione della prima luna", "orig": "Pirates of the Caribbean: The Curse of the Black Pearl", "type": "movie", "year": "2003", "aliases": ["pirati dei caraibi 1", "prima luna"], "saga_group": "pirates", "saga_rank": 1},
    {"it": "Pirati dei Caraibi - La maledizione del forziere fantasma", "orig": "Pirates of the Caribbean: Dead Man's Chest", "type": "movie", "year": "2006", "aliases": ["pirati dei caraibi 2", "forziere fantasma"], "saga_group": "pirates", "saga_rank": 2},
    {"it": "Pirati dei Caraibi - Ai confini del mondo", "orig": "Pirates of the Caribbean: At World's End", "type": "movie", "year": "2007", "aliases": ["pirati dei caraibi 3", "ai confini del mondo"], "saga_group": "pirates", "saga_rank": 3},
    {"it": "Pirati dei Caraibi - Oltre i confini del mare", "orig": "Pirates of the Caribbean: On Stranger Tides", "type": "movie", "year": "2011", "aliases": ["pirati dei caraibi 4", "oltre i confini del mare"], "saga_group": "pirates", "saga_rank": 4},
    {"it": "Pirati dei Caraibi - La vendetta di Salazar", "orig": "Pirates of the Caribbean: Dead Men Tell No Tales", "type": "movie", "year": "2017", "aliases": ["pirati dei caraibi 5", "vendetta di salazar"], "saga_group": "pirates", "saga_rank": 5},
    # Bad Boys Complete 4-Movie Saga
    {"it": "Bad Boys", "orig": "Bad Boys", "type": "movie", "year": "1995", "aliases": ["bad boys 1", "bad boys i"], "saga_group": "bad_boys", "saga_rank": 1, "poster": "https://upload.wikimedia.org/wikipedia/en/a/a8/Bad_Boys.jpg"},
    {"it": "Bad Boys II", "orig": "Bad Boys II", "type": "movie", "year": "2003", "aliases": ["bad boys 2", "bad boys ii"], "saga_group": "bad_boys", "saga_rank": 2, "poster": "https://upload.wikimedia.org/wikipedia/en/f/f4/Bad_Boys_II_Official_Theatrical_Poster.png"},
    {"it": "Bad Boys for Life", "orig": "Bad Boys for Life", "type": "movie", "year": "2020", "aliases": ["bad boys 3", "bad boys iii", "bad boys per sempre"], "saga_group": "bad_boys", "saga_rank": 3, "poster": "https://upload.wikimedia.org/wikipedia/en/9/90/Bad_Boys_for_Life_poster.jpg"},
    {"it": "Bad Boys: Ride or Die", "orig": "Bad Boys: Ride or Die", "type": "movie", "year": "2024", "aliases": ["bad boys 4", "bad boys iv", "ride or die"], "saga_group": "bad_boys", "saga_rank": 4, "poster": "https://upload.wikimedia.org/wikipedia/en/8/8b/Bad_Boys_Ride_or_Die_%282024%29_poster.jpg"},
    # Hunger Games Complete 5-Movie Saga
    {"it": "Hunger Games", "orig": "The Hunger Games", "type": "movie", "year": "2012", "aliases": ["hunger games 1", "the hunger games"], "saga_group": "hunger_games", "saga_rank": 1, "poster": "https://thumb.wikimedia.org/wikipedia/it/thumb/4/4b/Hunger_games_poster.jpg/500px-Hunger_games_poster.jpg?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail"},
    {"it": "Hunger Games: La ragazza di fuoco", "orig": "The Hunger Games: Catching Fire", "type": "movie", "year": "2013", "aliases": ["hunger games 2", "la ragazza di fuoco", "catching fire", "hunger games la ragazza di fuoro"], "saga_group": "hunger_games", "saga_rank": 2, "poster": "https://thumb.wikimedia.org/wikipedia/it/thumb/9/94/CatchingFire.png/500px-CatchingFire.png?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail"},
    {"it": "Hunger Games - Il canto della rivolta - Parte 1", "orig": "The Hunger Games: Mockingjay – Part 1", "type": "movie", "year": "2014", "aliases": ["hunger games 3", "il canto della rivolta parte 1", "mockingjay part 1"], "saga_group": "hunger_games", "saga_rank": 3, "poster": "https://thumb.wikimedia.org/wikipedia/it/thumb/7/7b/The_Hunger_Games_-_Mockingjay_Part_1.png/500px-The_Hunger_Games_-_Mockingjay_Part_1.png?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail"},
    {"it": "Hunger Games - Il canto della rivolta - Parte 2", "orig": "The Hunger Games: Mockingjay – Part 2", "type": "movie", "year": "2015", "aliases": ["hunger games 4", "il canto della rivolta parte 2", "mockingjay part 2"], "saga_group": "hunger_games", "saga_rank": 4, "poster": "https://thumb.wikimedia.org/wikipedia/it/thumb/0/07/The_Hunger_Games_-_Mockingjay_Part_2.png/500px-The_Hunger_Games_-_Mockingjay_Part_2.png?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail"},
    {"it": "Hunger Games - La ballata dell'usignolo e del serpente", "orig": "The Hunger Games: The Ballad of Songbirds & Snakes", "type": "movie", "year": "2023", "aliases": ["hunger games 5", "la ballata dell usignolo e del serpente", "ballata dell usignolo e del serpente"], "saga_group": "hunger_games", "saga_rank": 5, "poster": "https://thumb.wikimedia.org/wikipedia/it/thumb/1/14/Hunger_Games_-_La_ballata_dell%27usignolo_e_del_serpente.jpg/500px-Hunger_Games_-_La_ballata_dell%27usignolo_e_del_serpente.jpg?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail"},
    # Altri Film Celebri & Anime Bridge
    {"it": "Deadpool & Wolverine", "orig": "Deadpool & Wolverine", "type": "movie", "year": "2024"},
    {"it": "Mr. & Mrs. Smith", "orig": "Mr. & Mrs. Smith", "type": "movie", "year": "2005"},
    {"it": "Thelma & Louise", "orig": "Thelma & Louise", "type": "movie", "year": "1991"},
    {"it": "Dungeons & Dragons - L'onore dei ladri", "orig": "Dungeons & Dragons: Honor Among Thieves", "type": "movie", "year": "2023"},
    {"it": "Orgoglio e pregiudizio", "orig": "Pride & Prejudice", "type": "movie", "year": "2005"},
    {"it": "Batman & Robin", "orig": "Batman & Robin", "type": "movie", "year": "1997"},
    {"it": "Starsky & Hutch", "orig": "Starsky & Hutch", "type": "movie", "year": "2004"},
    {"it": "Il Gladiatore", "orig": "Gladiator", "type": "movie", "year": "2000"},
    {"it": "Il Gladiatore II", "orig": "Gladiator II", "type": "movie", "year": "2024"},
    {"it": "Il Cavaliere Oscuro", "orig": "The Dark Knight", "type": "movie", "year": "2008"},
    {"it": "Batman Begins", "orig": "Batman Begins", "type": "movie", "year": "2005"},
    {"it": "Il cavaliere oscuro - Il ritorno", "orig": "The Dark Knight Rises", "type": "movie", "year": "2012"},
    {"it": "Le ali della libertà", "orig": "The Shawshank Redemption", "type": "movie", "year": "1994"},
    {"it": "Il Padrino", "orig": "The Godfather", "type": "movie", "year": "1972"},
    {"it": "Il Padrino - Parte II", "orig": "The Godfather Part II", "type": "movie", "year": "1974"},
    {"it": "Il Padrino - Parte III", "orig": "The Godfather Part III", "type": "movie", "year": "1990"},
    {"it": "Cielo di piombo, ispettore Callaghan", "orig": "The Enforcer", "type": "movie", "year": "1976"},
    {"it": "Rush Hour - Due mine vaganti", "orig": "Rush Hour", "type": "movie", "year": "1998"},
    {"it": "Colpo grosso al drago rosso - Rush Hour 2", "orig": "Rush Hour 2", "type": "movie", "year": "2001"},
    {"it": "Rush Hour 3 - Missione Parigi", "orig": "Rush Hour 3", "type": "movie", "year": "2007"},
    {"it": "Ken il guerriero", "orig": "Hokuto no Ken (北斗の拳)", "type": "series", "year": "1984", "aliases": ["ken il guerriero", "hokuto no ken", "fist of the north star"], "poster": "https://static.tvmaze.com/uploads/images/medium_portrait/43/109033.jpg"},
    {"it": "L'attacco dei giganti", "orig": "Shingeki no Kyojin (進撃の巨人)", "type": "series", "year": "2013", "aliases": ["l attacco dei giganti", "attacco dei giganti", "shingeki no kyojin", "attack on titan"], "poster": "https://static.tvmaze.com/uploads/images/medium_portrait/4/11919.jpg"},
    # Lupin III Film e Serie Celebri (Titoli Originali Giapponesi)
    {"it": "Lupin", "orig": "Lupin", "type": "series", "year": "2021", "aliases": ["lupin 2021", "lupin serie tv", "lupin netflix"], "poster": "https://static.tvmaze.com/uploads/images/medium_portrait/646/1617244.jpg"},
    {"it": "Lupin III", "orig": "Rupan Sansei (ルパン三世)", "type": "series", "year": "1971", "aliases": ["lupin 3", "le avventure di lupin iii", "le avventure di lupin 3", "lupin prima serie", "rupan sansei"], "poster": "https://static.tvmaze.com/uploads/images/medium_portrait/38/96191.jpg"},
    {"it": "Le nuove avventure di Lupin III", "orig": "Shin Rupan Sansei (新 ルパン三世)", "type": "series", "year": "1977", "aliases": ["lupin giacca rossa", "lupin seconda serie", "shin rupan sansei"], "poster": "https://m.media-amazon.com/images/M/MV5BMjA5MjYwNDktYzM5ZC00Y2UyLTg2ODQtY2Y4NzI0NTU2M2VlXkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin, l'incorreggibile Lupin", "orig": "Rupan Sansei: Part III (ルパン三世 PARTIII)", "type": "series", "year": "1984", "aliases": ["lupin giacca rosa", "lupin terza serie", "rupan sansei part 3"], "poster": "https://m.media-amazon.com/images/M/MV5BMjA5MjYwNDktYzM5ZC00Y2UyLTg2ODQtY2Y4NzI0NTU2M2VlXkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin e le profezie di Nostradamus", "orig": "Rupan Sansei - Kutabare! Nosutoradamusu (ルパン三世 くたばれ!ノストラダムス)", "type": "movie", "year": "1995", "aliases": ["le profezie di nostradamus", "profezie di nostradamus", "lupin nostradamus", "lupin iii le profezie di nostradamus", "lupin 3 le profezie di nostradamus", "farewell to nostradamus", "kutabare nostradamus"], "poster": "https://m.media-amazon.com/images/M/MV5BMDI1MDU2MjQtODEwNi00MTEwLTkwOTUtYWZjZWNkYWJlY2ZmXkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin III - Il castello di Cagliostro", "orig": "Rupan Sansei: Kariosutoro no shiro (ルパン三世 カリオストロの城)", "type": "movie", "year": "1979", "aliases": ["il castello di cagliostro", "castello di cagliostro", "cagliostro", "lupin cagliostro", "the castle of cagliostro", "kariosutoro no shiro"], "poster": "https://m.media-amazon.com/images/M/MV5BYjQwZWNkMTYtYTU2Ny00YzgyLTljYTMtNjc0MjRkNWY5NDM4XkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin III - La pietra della saggezza", "orig": "Rupan Sansei: Rupan tai Kuron (ルパン三世 ルパンVS複製人間)", "type": "movie", "year": "1978", "aliases": ["la pietra della saggezza", "pietra della saggezza", "the mystery of mamo", "mystery of mamo", "rupan tai kuron"], "poster": "https://m.media-amazon.com/images/M/MV5BMTkzM2E4YjUtYmQ4Yi00NWZmLThiYmYtZjhhNzk3OGRhMjBlXkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin III - La leggenda dell'oro di Babilonia", "orig": "Rupan Sansei: Babiron no Ōgon Densetsu (ルパン三世 バビロンの黄金伝説)", "type": "movie", "year": "1985", "aliases": ["oro di babilonia", "babilonia", "la leggenda dell oro di babilonia", "legend of the gold of babylon"], "poster": "https://m.media-amazon.com/images/M/MV5BYTQ4YmVjNTctYTE2MS00NTUyLWE0MjMtOTFkMDQ1NGE2OTU4XkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin III - La cospirazione dei Fuma", "orig": "Rupan Sansei: Fūma Ichizoku no Inbō (ルパン三世 風魔一族の陰謀)", "type": "movie", "year": "1987", "aliases": ["cospirazione dei fuma", "fuma", "the fuma conspiracy"], "poster": "https://m.media-amazon.com/images/M/MV5BYTAwZWRmZjktMGU4MC00Zjk5LWI4YWUtMjE4MDdmMjBhYThkXkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin III - Trappola mortale", "orig": "Rupan Sansei: DEAD OR ALIVE (ルパン三世 DEAD OR ALIVE)", "type": "movie", "year": "1996", "aliases": ["trappola mortale", "dead or alive"], "poster": "https://m.media-amazon.com/images/M/MV5BMzRlZDRkMzEtODgzNi00ZGQ4LWIwMDgtMzY0YWE5NzU2MTA2XkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin III - The First", "orig": "Lupin III: The First (ルパン三世 THE FIRST)", "type": "movie", "year": "2019", "aliases": ["the first", "lupin the first"], "poster": "https://m.media-amazon.com/images/M/MV5BM2UwMjlmZWEtZjBiMi00ZmJmLTg1MDAtOWQ4NjFjMTY5MzhkXkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin the Third - La donna chiamata Fujiko Mine", "orig": "LUPIN the Third: Mine Fujiko to Iu Onna (LUPIN the Third 〜峰不二子という女〜)", "type": "series", "year": "2012", "aliases": ["la donna chiamata fujiko mine", "fujiko mine", "the woman called fujiko mine"], "poster": "https://m.media-amazon.com/images/M/MV5BYmY2ODI1YTYtZDQ4Zi00NDU0LWFkMzktOGEyMzJjYzU0OTc0XkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin III vs Detective Conan", "orig": "Rupan Sansei Vāsasu Meitantei Konan (ルパン三世VS名探偵コナン THE MOVIE)", "type": "movie", "year": "2013", "aliases": ["lupin vs detective conan", "lupin conan", "lupin terzo vs detective conan"], "poster": "https://m.media-amazon.com/images/M/MV5BNDRlNmFjMzYtMDYzZi00NDI4LWE1MDItZGJmNmEwZTRhOWFhXkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin III - Green vs Red", "orig": "Rupan Sansei: GREEN vs RED (ルパン三世 GREEN vs RED)", "type": "movie", "year": "2008", "aliases": ["green vs red", "lupin green vs red"], "poster": "https://m.media-amazon.com/images/M/MV5BZDk5NDRlNDMtNGNiNy00ZjZkLWI2NGEtMjM5ZDliNGJjNjBmXkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin III - Walther P38", "orig": "Rupan Sansei: Warusā P38 (ルパン三世 ワルサーP38)", "type": "movie", "year": "1997", "aliases": ["walther p38", "island of assassins"], "poster": "https://m.media-amazon.com/images/M/MV5BODg3ZjY2MTItODhlNy00YzkzLTk5ODgtMGI3MjI2MWI0ZmYyXkEyXkFqcGc@._V1_UX400_.jpg"},
    {"it": "Lupin Zero", "orig": "Lupin Zero (ルパンゼロ)", "type": "series", "year": "2022", "aliases": ["lupin zero"], "poster": "https://static.tvmaze.com/uploads/images/medium_portrait/435/1088890.jpg"},
    # Serie TV Celebri
    {"it": "Una mamma per amica", "orig": "Gilmore Girls", "type": "series", "year": "2000"},
    {"it": "L'ispettore Barnaby", "orig": "Midsomer Murders", "type": "series", "year": "1997"},
    {"it": "La signora in giallo", "orig": "Murder, She Wrote", "type": "series", "year": "1984"},
    {"it": "Il Trono di Spade", "orig": "Game of Thrones", "type": "series", "year": "2011"},
    {"it": "La casa di carta", "orig": "La casa de papel", "type": "series", "year": "2017", "aliases": ["money heist", "la casa de papel"]},
    {"it": "E alla fine arriva mamma", "orig": "How I Met Your Mother", "type": "series", "year": "2005"},
    {"it": "Tutto in famiglia", "orig": "My Wife and Kids", "type": "series", "year": "2001"},
    {"it": "La vita secondo Jim", "orig": "According to Jim", "type": "series", "year": "2001"},
    {"it": "Due uomini e mezzo", "orig": "Two and a Half Men", "type": "series", "year": "2003"},
    {"it": "NCIS - Unità anticrimine", "orig": "NCIS", "type": "series", "year": "2003"},
    {"it": "NCIS: Los Angeles", "orig": "NCIS: Los Angeles", "type": "series", "year": "2009"},
    {"it": "NCIS: New Orleans", "orig": "NCIS: New Orleans", "type": "series", "year": "2014"},
    {"it": "CSI - Scena del crimine", "orig": "CSI: Crime Scene Investigation", "type": "series", "year": "2000"},
    {"it": "CSI: Miami", "orig": "CSI: Miami", "type": "series", "year": "2002"},
    {"it": "CSI: NY", "orig": "CSI: NY", "type": "series", "year": "2004"},
    {"it": "Law & Order - Unità vittime speciali", "orig": "Law & Order: Special Victims Unit", "type": "series", "year": "1999"},
    {"it": "Law & Order - I due volti della giustizia", "orig": "Law & Order", "type": "series", "year": "1990"},
    {"it": "Will & Grace", "orig": "Will & Grace", "type": "series", "year": "1998"},
    {"it": "Rizzoli & Isles", "orig": "Rizzoli & Isles", "type": "series", "year": "2010"},
    {"it": "Hudson & Rex", "orig": "Hudson & Rex", "type": "series", "year": "2019"},
    {"it": "Mike & Molly", "orig": "Mike & Molly", "type": "series", "year": "2010"},
    {"it": "Superman & Lois", "orig": "Superman & Lois", "type": "series", "year": "2021"},
    {"it": "La casa nella prateria", "orig": "Little House on the Prairie", "type": "series", "year": "1974"},
    {"it": "Streghe", "orig": "Charmed", "type": "series", "year": "1998"},
    {"it": "Buffy l'ammazzavampiri", "orig": "Buffy the Vampire Slayer", "type": "series", "year": "1997"},
    {"it": "I Simpson", "orig": "The Simpsons", "type": "series", "year": "1989"},
    {"it": "I Griffin", "orig": "Family Guy", "type": "series", "year": "1999"},
    {"it": "Dr. House - Medical Division", "orig": "House", "type": "series", "year": "2004"},
    {"it": "Colombo", "orig": "Columbo", "type": "series", "year": "1971"},
    {"it": "Poirot", "orig": "Agatha Christie's Poirot", "type": "series", "year": "1989"},
    {"it": "Miss Marple", "orig": "Agatha Christie's Marple", "type": "series", "year": "2004"},
    {"it": "Le indagini di Roy Grace", "orig": "Grace", "type": "series", "year": "2021"},
    {"it": "Delitti in Paradiso", "orig": "Death in Paradise", "type": "series", "year": "2011"},
    {"it": "L'ispettore Derrick", "orig": "Derrick", "type": "series", "year": "1974"},
    {"it": "Il commissario Rex", "orig": "Inspector Rex", "type": "series", "year": "1994"},
    {"it": "Squadra speciale Cobra 11", "orig": "Alarm für Cobra 11", "type": "series", "year": "1996"},
    {"it": "Il commissario Montalbano", "orig": "Inspector Montalbano", "type": "series", "year": "1999"},
    {"it": "Don Matteo", "orig": "Don Matteo", "type": "series", "year": "2000"},
    {"it": "Mare Fuori", "orig": "The Sea Beyond", "type": "series", "year": "2020"},
    {"it": "Doc - Nelle tue mani", "orig": "DOC - Nelle tue mani", "type": "series", "year": "2020"},
    {"it": "L'amica geniale", "orig": "My Brilliant Friend", "type": "series", "year": "2018"},
    {"it": "Un passo dal cielo", "orig": "Un passo dal cielo", "type": "series", "year": "2011"},
    {"it": "Che Dio ci aiuti", "orig": "Che Dio ci aiuti", "type": "series", "year": "2011"},
    {"it": "I Cesaroni", "orig": "I Cesaroni", "type": "series", "year": "2006"},
    {"it": "Un medico in famiglia", "orig": "Un medico in famiglia", "type": "series", "year": "1998"},
    {"it": "Boris", "orig": "Boris", "type": "series", "year": "2007"},
    {"it": "Gomorra - La serie", "orig": "Gomorrah", "type": "series", "year": "2014"},
]


def damerau_levenshtein(s1: str, s2: str, max_dist: int = 2) -> int:
    """
    Compute Damerau-Levenshtein edit distance between s1 and s2
    (insertions, deletions, substitutions, adjacent transpositions).
    Early-exits with max_dist + 1 if distance exceeds max_dist.
    """
    if s1 == s2:
        return 0
    len1, len2 = len(s1), len(s2)
    if abs(len1 - len2) > max_dist:
        return max_dist + 1
    if len1 == 0:
        return len2
    if len2 == 0:
        return len1

    prev2 = list(range(len2 + 1))
    prev1 = list(range(len2 + 1))
    curr = [0] * (len2 + 1)

    for i in range(1, len1 + 1):
        curr[0] = i
        row_min = curr[0]
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            val = min(
                prev1[j] + 1,        # deletion
                curr[j - 1] + 1,     # insertion
                prev1[j - 1] + cost  # substitution
            )
            if i > 1 and j > 1 and s1[i - 1] == s2[j - 2] and s1[i - 2] == s2[j - 1]:
                val = min(val, prev2[j - 2] + 1)  # transposition
            curr[j] = val
            if val < row_min:
                row_min = val
        if row_min > max_dist:
            return max_dist + 1
        prev2, prev1, curr = prev1, curr, prev2

    return prev1[len2]


ROMAN_NUMERALS_MAP = {
    "i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5",
    "vi": "6", "vii": "7", "viii": "8", "ix": "9", "x": "10",
    "xi": "11", "xii": "12"
}

def convert_roman_numerals(text: str) -> str:
    if not text:
        return ""
    words = text.split()
    return " ".join(ROMAN_NUMERALS_MAP.get(w, w) for w in words)


def _candidate_conjunction_variants(raw_text: str) -> List[str]:
    """
    Given a raw title (possibly containing '&' or '+' or 'and'/'e'),
    return normalized variants where '&' is expanded to '', 'and', 'end', 'e',
    and Roman numerals are converted to numbers.
    """
    if not raw_text:
        return []
    variants = set()
    base_norm = normalize_title(raw_text)
    if base_norm:
        variants.add(base_norm)
        c_stripped = strip_conjunctions(base_norm)
        if c_stripped:
            variants.add(c_stripped)
        art_stripped = strip_leading_article(base_norm)
        if art_stripped:
            variants.add(art_stripped)
            variants.add(strip_conjunctions(art_stripped))

    if "&" in raw_text or "+" in raw_text:
        for repl in (" and ", " end ", " e ", " "):
            v = normalize_title(raw_text.replace("&", repl).replace("+", repl))
            if v:
                variants.add(v)

    # Add Roman numeral converted variants (e.g. 'rocky ii' <-> 'rocky 2')
    extra_roman = set()
    for v in list(variants):
        r_conv = convert_roman_numerals(v)
        if r_conv and r_conv != v:
            extra_roman.add(r_conv)
    variants.update(extra_roman)

    return [v for v in variants if v]


def fuzzy_match_title(query: str, candidate_raw: str) -> Tuple[bool, int]:
    """
    Check if `query` matches `candidate_raw` with:
      - Equivalence between '&', 'and', 'end', 'e', 'ed'
      - Omitted spaces (e.g. 'harrypotter', 'fastandfurious', 'fastendfurious')
      - Up to 2 character typos (Damerau-Levenshtein distance <= 2)
    Returns (matched: bool, score_distance: int). Lower score_distance is a better match.
    """
    if not query or not candidate_raw:
        return False, 99

    # Also expand glued 'and'/'end' when user typed no spaces (e.g. 'fastandfurious', 'fastendfurious')
    q_raw = query.strip()
    if " " not in q_raw and len(q_raw) >= 8:
        q_unglued = re.sub(r"(?<=.{3})(and|end)(?=.{3})", " & ", q_raw, flags=re.IGNORECASE)
    else:
        q_unglued = q_raw

    q_norm = normalize_title(q_unglued)
    if not q_norm:
        return False, 99
    q_conj = strip_conjunctions(q_norm) or q_norm
    q_roman = convert_roman_numerals(q_norm)
    q_conj_roman = convert_roman_numerals(q_conj)
    q_nospace = q_norm.replace(" ", "")
    q_conj_nospace = q_conj.replace(" ", "")

    cand_variants = _candidate_conjunction_variants(candidate_raw)
    if not cand_variants:
        return False, 99

    # 1. Exact or substring match (distance 0)
    for cv in cand_variants:
        cv_nospace = cv.replace(" ", "")
        if (
            q_norm in cv
            or q_roman in cv
            or (len(q_conj) >= 3 and q_conj in cv)
            or (len(q_conj_roman) >= 3 and q_conj_roman in cv)
        ):
            return True, 0
        if len(q_nospace) >= 4 and (q_nospace in cv_nospace or (len(q_conj_nospace) >= 4 and q_conj_nospace in cv_nospace)):
            return True, 0

    # Determine allowed typo distance based on query length
    q_len = len(q_conj_nospace)
    if q_len < 4:
        return False, 99
    max_dist = 1 if q_len <= 5 else 2

    best_dist = 99
    q_words = q_conj.split()
    num_q_words = len(q_words)

    for cv in cand_variants:
        cv_words = cv.split()
        if not cv_words:
            continue

        # A. Compare against full candidate variant (spaced and spaceless)
        for q_str, c_str in ((q_conj, cv), (q_conj_nospace, cv.replace(" ", "")), (q_nospace, cv.replace(" ", ""))):
            d = damerau_levenshtein(q_str, c_str, max_dist=max_dist)
            if d <= max_dist and d < best_dist:
                best_dist = d

        # B. Compare against cumulative word prefixes of candidate (both spaced & spaceless)
        # e.g. 'harri poter' or 'harripoter' vs first 2 words 'harry potter' / 'harrypotter'
        prefix_words = []
        for w in cv_words[:6]:
            prefix_words.append(w)
            pref_spaced = " ".join(prefix_words)
            pref_nospace = "".join(prefix_words)
            if len(pref_nospace) < 4:
                continue
            # Only allow prefix fuzzy match if query length is close to prefix length
            local_max = 1 if len(pref_nospace) <= 5 else max_dist
            for q_str, c_str in ((q_conj, pref_spaced), (q_conj_nospace, pref_nospace), (q_nospace, pref_nospace)):
                # Require matching first letter or length >= 6 to avoid noisy short prefix matches
                if len(q_str) >= 6 or (q_str and c_str and q_str[0] == c_str[0]):
                    d = damerau_levenshtein(q_str, c_str, max_dist=local_max)
                    if d <= local_max and d < best_dist:
                        best_dist = d

        # C. Compare against contiguous word windows of length num_q_words
        if 1 <= num_q_words <= len(cv_words):
            for start_i in range(len(cv_words) - num_q_words + 1):
                win_spaced = " ".join(cv_words[start_i : start_i + num_q_words])
                if len(win_spaced) < 5:
                    continue
                local_max = 1 if len(win_spaced) <= 5 else max_dist
                if len(q_conj) >= 6 or (q_conj and win_spaced and q_conj[0] == win_spaced[0]):
                    d = damerau_levenshtein(q_conj, win_spaced, max_dist=local_max)
                    if d <= local_max and d < best_dist:
                        best_dist = d

    return (best_dist <= max_dist), best_dist


def get_aliases_for_titles(title_it: str, title_orig: str = "") -> List[str]:
    """Return all normalized title variants/aliases for a movie or series."""
    norms = set()
    for t in (title_it, title_orig):
        for v in _candidate_conjunction_variants(t):
            norms.add(v)
        nt = normalize_title(t)
        if nt:
            # Only add prefix before colon/dash if this is NOT a numbered sequel (like Parte 1, Parte 2, II, III, 2, 3)
            if not re.search(r"\b(parte\s*\d+|part\s*\d+|ii|iii|iv|\d+)\b", nt):
                parts = [p.strip() for p in re.split(r"[:\-–]", t) if p.strip()]
                if len(parts) > 1 and len(normalize_title(parts[0])) >= 4:
                    for pv in _candidate_conjunction_variants(parts[0]):
                        norms.add(pv)

    for entry in ITALIAN_ORIGINAL_ALIASES:
        n_it = normalize_title(entry["it"])
        n_or = normalize_title(entry["orig"])
        c_it = strip_conjunctions(n_it)
        c_or = strip_conjunctions(n_or)
        if norms.intersection({n_it, n_or, c_it, c_or}):
            for v in _candidate_conjunction_variants(entry["it"]) + _candidate_conjunction_variants(entry["orig"]):
                norms.add(v)

    return sorted(x for x in norms if x)


def _http_get_json(url: str, timeout: int = 7) -> object:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return json.loads(resp.read().decode("utf-8", errors="ignore"))


def _http_post_json(url: str, payload: Dict, timeout: int = 7) -> object:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return json.loads(resp.read().decode("utf-8", errors="ignore"))


def _resolve_italian_titles_wikidata(imdb_ids: List[str]) -> Dict[str, Tuple[str, str]]:
    """
    Given a list of IMDb IDs (e.g. ['tt0241527', ...]), query Wikidata SPARQL
    to obtain the official Italian title and Italian description in a single batch call.
    """
    if not imdb_ids:
        return {}
    values = " ".join(f'"{i}"' for i in imdb_ids if i)
    sparql = (
        "SELECT ?imdb ?itemLabel ?itemDescription WHERE { "
        f"VALUES ?imdb {{ {values} }} "
        "?item wdt:P345 ?imdb . "
        'SERVICE wikibase:label { bd:serviceParam wikibase:language "it,en". } '
        "}"
    )
    url = "https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(sparql)
    try:
        data = _http_get_json(url, timeout=5)
        out = {}
        for b in (data or {}).get("results", {}).get("bindings", []):
            iid = (b.get("imdb") or {}).get("value") or ""
            lbl = (b.get("itemLabel") or {}).get("value") or ""
            desc = (b.get("itemDescription") or {}).get("value") or ""
            if iid and lbl and not re.match(r"^Q\d+$", lbl):
                out[iid] = (lbl, desc)
        return out
    except Exception:
        return {}


def _spellcheck_via_wikipedia(query: str) -> List[str]:
    """
    Use Wikipedia IT/EN CirrusSearch fuzzy operator (~2) and suggestion engine
    to auto-correct up to 2 character typos or missing spaces for any movie/series title.
    """
    q_clean = query.strip()
    if len(q_clean) < 4:
        return []
    suggestions: List[str] = []
    # Add ~2 fuzzy operator to each word of length >= 4
    fuzzy_tokens = [f"{w}~2" if len(w) >= 4 and w.isalnum() else w for w in q_clean.split()]
    sr_query = " ".join(fuzzy_tokens)

    for wiki_host in ("it.wikipedia.org", "en.wikipedia.org"):
        url = (
            f"https://{wiki_host}/w/api.php?action=query&list=search"
            f"&srsearch={urllib.parse.quote(sr_query)}&srlimit=4&format=json"
        )
        try:
            data = _http_get_json(url, timeout=3)
            q_obj = (data or {}).get("query") or {}
            s_info = (q_obj.get("searchinfo") or {}).get("suggestion") or ""
            if s_info:
                clean_sug = re.sub(r"<[^>]+>", "", s_info).replace("~2", "").strip()
                if clean_sug and clean_sug.lower() != q_clean.lower() and clean_sug not in suggestions:
                    suggestions.append(clean_sug)
            for hit in (q_obj.get("search") or [])[:3]:
                title = (hit.get("title") or "").strip()
                # Strip Wikipedia disambiguation suffixes like '(film)', '(serie televisiva)', '(film 2014)'
                title_clean = re.sub(
                    r"\s*\((?:film|serie\s+televisiva|miniserie|programma|telefilm|saga|franchise|serie|tv\s+series|movie).*?\)\s*$",
                    "",
                    title,
                    flags=re.IGNORECASE,
                ).strip()
                if title_clean and title_clean not in suggestions:
                    ok, _ = fuzzy_match_title(q_clean, title_clean)
                    if ok:
                        suggestions.append(title_clean)
        except Exception:
            continue
        if suggestions:
            break
    return suggestions[:2]


def expand_query_variants(query: str, epg_events: Optional[List[Dict]] = None) -> List[str]:
    """
    Expand user query into smart search variants handling:
      1. '&' <-> 'and' <-> 'end' <-> 'e' equivalence
      2. Glued words without spaces (e.g. 'fastandfurious', 'fastendfurious', 'harrypotter')
      3. Fuzzy typo correction (<= 2 letters) against built-in sagas and live 7-day EPG
    """
    q_raw = query.strip()
    if not q_raw:
        return []

    variants: List[str] = []

    def _add(v: str):
        v = re.sub(r"\s+", " ", v).strip()
        if v and v.lower() not in [x.lower() for x in variants]:
            variants.append(v)

    # 1. If user typed a single glued word containing 'and'/'end' (e.g. 'fastandfurious', 'fastendfurious')
    if " " not in q_raw and len(q_raw) >= 8:
        unglued = re.sub(r"(?<=.{3})(and|end)(?=.{3})", " & ", q_raw, flags=re.IGNORECASE)
        if unglued != q_raw:
            _add(unglued)
            _add(unglued.replace("&", "and"))

    # 2. If user typed 'and', 'end', 'e', 'ed' -> prioritize '&' and 'and' variants first for IMDb/TVMaze
    if re.search(r"\b(and|end|e|ed)\b", q_raw, flags=re.IGNORECASE):
        v_amp = re.sub(r"\b(and|end|e|ed)\b", "&", q_raw, flags=re.IGNORECASE)
        v_and = re.sub(r"\b(end|e|ed)\b", "and", q_raw, flags=re.IGNORECASE)
        _add(v_amp)
        _add(v_and)

    _add(q_raw)

    clean_no_ops = re.sub(r"[^\w\s]", " ", q_raw).strip()
    if clean_no_ops != q_raw:
        _add(clean_no_ops)

    # Subtitle extraction for franchises (e.g. 'Lupin III - Il castello di Cagliostro' -> 'Il castello di Cagliostro')
    m_sub = re.match(r"^(?:lupin(?:\s+(?:iii|3|terzo))?|star\s+wars|dragon\s+ball(?:\s+(?:z|super|gt))?|rocky(?:\s+\d+)?|harry\s+potter)\s*[-:–]?\s*(.+)$", q_raw, flags=re.IGNORECASE)
    if m_sub and m_sub.group(1).strip() and len(m_sub.group(1).strip()) >= 3:
        sub_title = re.sub(r"[^\w\s]", " ", m_sub.group(1)).strip()
        _add(sub_title)
        _add(re.sub(r"[-:+\"_*~]", " ", sub_title).strip())

    if "&" in q_raw:
        _add(q_raw.replace("&", " and "))
        _add(q_raw.replace("&", " e "))

    # 3. Check fuzzy matches against ITALIAN_ORIGINAL_ALIASES (corrects 'harri poter', 'harrypotter', 'fast end furius', 'il gladiatre', etc.)
    scored_aliases: List[Tuple[int, Dict[str, str]]] = []
    for al in ITALIAN_ORIGINAL_ALIASES:
        ok_it, d_it = fuzzy_match_title(q_raw, al["it"])
        ok_or, d_or = fuzzy_match_title(q_raw, al["orig"])
        ok_kw, d_kw = (fuzzy_match_title(q_raw, al["keywords"]) if al.get("keywords") else (False, 99))
        if ok_it or ok_or or ok_kw:
            best_d = min(d_it if ok_it else 99, d_or if ok_or else 99, d_kw if ok_kw else 99)
            scored_aliases.append((best_d, al))

    scored_aliases.sort(key=lambda x: x[0])
    for _, al in scored_aliases[:3]:
        # Extract main saga/prefix title before '-' or ':' (e.g. 'Harry Potter', 'Fast & Furious')
        for raw_t in (al["orig"], al["it"]):
            main_part = re.split(r"\s*[-–:]\s*", raw_t)[0].strip()
            # Also strip ' e il/la/i/l...' for Harry Potter saga prefix if query was short
            hp_part = re.split(r"\s+\b(?:e\s+(?:la|il|lo|i|gli|le|l')|and\s+the)\b", main_part, flags=re.IGNORECASE)[0].strip()
            if len(hp_part) >= 5:
                _add(hp_part)
            if len(main_part) >= 4:
                _add(main_part)

    # 4. Also check live 7-day DTT EPG for fuzzy typo auto-correction
    if epg_events and len(variants) < 3:
        seen_t = set()
        for ev in epg_events:
            if ev.get("media_type") not in ("movie", "series"):
                continue
            t = ev.get("title") or ""
            if not t or t in seen_t:
                continue
            seen_t.add(t)
            ok, dist = fuzzy_match_title(q_raw, t)
            if ok and dist <= 2:
                _add(t)
                if len(variants) >= 4:
                    break

    return variants[:4]


def _search_imdb_with_italian_labels(query: str, extra_queries: Optional[List[str]] = None) -> List[Dict]:
    """Search IMDb suggestions across expanded query variants and enrich with official Italian titles from Wikidata."""
    queries_to_run = []
    for q in ([query] + (extra_queries or [])):
        q_c = q.strip()
        if q_c and q_c.lower() not in [x.lower() for x in queries_to_run]:
            queries_to_run.append(q_c)
    if not queries_to_run:
        return []

    raw_items = []
    seen_imdb = set()
    for q_clean in queries_to_run[:3]:
        url = f"https://v3.sg.media-imdb.com/suggestion/x/{urllib.parse.quote(q_clean)}.json"
        try:
            data = _http_get_json(url, timeout=6)
        except Exception:
            continue
        for item in (data or {}).get("d", []):
            if (item.get("qid") or "") not in ("movie", "tvSeries", "tvMiniSeries", "tvMovie", "tvSpecial"):
                continue
            iid = item.get("id")
            if iid and iid not in seen_imdb:
                seen_imdb.add(iid)
                raw_items.append(item)

    imdb_ids = [item.get("id") for item in raw_items if item.get("id")]
    it_lookup = _resolve_italian_titles_wikidata(imdb_ids[:25])

    results = []
    for item in raw_items:
        qid = item.get("qid") or ""
        media_type = "series" if qid in ("tvSeries", "tvMiniSeries") else "movie"
        title_orig = (item.get("l") or "").strip()
        imdb_id = item.get("id") or ""
        year = str(item.get("y") or "")
        cast = item.get("s") or ""
        poster = ((item.get("i") or {}).get("imageUrl") or "").strip()
        if poster and "_V1_" in poster:
            poster = re.sub(r"_V1_.*?.jpg", "_V1_UX400_.jpg", poster)

        title_it = title_orig
        it_desc = ""
        has_it = False
        if imdb_id in it_lookup:
            title_it, it_desc = it_lookup[imdb_id]
            has_it = True
        norm_o = strip_conjunctions(normalize_title(title_orig))
        norm_it = strip_conjunctions(normalize_title(title_it))
        for al in ITALIAN_ORIGINAL_ALIASES:
            al_orig_norm = strip_conjunctions(normalize_title(al["orig"]))
            al_it_norm = strip_conjunctions(normalize_title(al["it"]))
            al_aliases = [strip_conjunctions(normalize_title(a)) for a in al.get("aliases", [])]
            if norm_o == al_orig_norm or norm_it == al_it_norm or norm_o in al_aliases or norm_it in al_aliases:
                title_it = al["it"]
                title_orig = al["orig"]
                has_it = True
                break

        desc_parts = []
        if it_desc:
            desc_parts.append(it_desc[0].upper() + it_desc[1:])
        if cast:
            desc_parts.append(f"Con {cast}")
        if not desc_parts:
            desc_parts.append(f"{'Serie TV' if media_type == 'series' else 'Film'} ({year})")

        results.append({
            "external_id": f"imdb_{imdb_id}",
            "imdb_id": imdb_id,
            "tvmaze_id": None,
            "media_type": media_type,
            "title_it": title_it,
            "title_original": title_orig,
            "aliases": [title_it, title_orig] if title_it != title_orig else [],
            "year": year,
            "poster": poster,
            "genre": "Serie TV" if media_type == "series" else "Film",
            "description": " • ".join(desc_parts),
            "source": "imdb",
            "popularity_rank": item.get("rank"),
            "has_it_title": has_it,
        })
    return results


def _search_tvmaze(query: str, extra_queries: Optional[List[str]] = None) -> List[Dict]:
    """Search TVMaze for TV Series (provides full episode & season tracking)."""
    search_terms: List[str] = []
    for q in ([query] + (extra_queries or [])):
        q_c = q.strip()
        if q_c and q_c.lower() not in [x.lower() for x in search_terms]:
            search_terms.append(q_c)

    for al in ITALIAN_ORIGINAL_ALIASES:
        if al["type"] != "series":
            continue
        ok_it, _ = fuzzy_match_title(query, al["it"])
        ok_or, _ = fuzzy_match_title(query, al["orig"])
        if ok_it or ok_or:
            if al["orig"] not in search_terms:
                search_terms.insert(0, al["orig"])

    results = []
    seen_ids = set()
    for term in search_terms[:3]:
        url = f"https://api.tvmaze.com/search/shows?q={urllib.parse.quote(term)}"
        try:
            data = _http_get_json(url, timeout=6)
        except Exception:
            continue
        if not isinstance(data, list):
            continue

        for row in data[:12]:
            show = row.get("show") or {}
            maze_id = show.get("id")
            if not maze_id or maze_id in seen_ids:
                continue
            seen_ids.add(maze_id)

            name_orig = (show.get("name") or "").strip()
            name_it = name_orig
            has_it = False
            norm_o = strip_conjunctions(normalize_title(name_orig))
            for al in ITALIAN_ORIGINAL_ALIASES:
                if strip_conjunctions(normalize_title(al["orig"])) == norm_o:
                    name_it = al["it"]
                    has_it = True
                    break

            premiered = (show.get("premiered") or "")[:4]
            poster = ((show.get("image") or {}).get("medium") or (show.get("image") or {}).get("original") or "").replace("http://", "https://")
            summary = re.sub(r"<[^>]+>", "", show.get("summary") or "").strip()
            genres = ", ".join(show.get("genres") or []) or "Serie TV"
            imdb_id = ((show.get("externals") or {}).get("imdb")) or ""

            results.append({
                "external_id": f"tvmaze_{maze_id}",
                "imdb_id": imdb_id,
                "tvmaze_id": maze_id,
                "media_type": "series",
                "title_it": name_it,
                "title_original": name_orig,
                "aliases": [name_it, name_orig] if name_it != name_orig else [],
                "year": premiered,
                "poster": poster,
                "genre": genres,
                "description": summary[:220] + ("..." if len(summary) > 220 else ""),
                "source": "tvmaze",
                "popularity_weight": show.get("weight") or 0,
                "has_it_title": has_it,
            })
    return results


def _poster_quality_rank(url: str) -> int:
    if not url:
        return 0
    u = url.lower()
    if any(k in u for k in [".svg", "logo_", "flag_", "icon_", "symbol"]):
        return 1
    if "screenshot" in u:
        return 2
    if "special:filepath" in u or "/wikipedia/commons/" in u or "commons.wikimedia.org" in u:
        return 3
    if "/wikipedia/it/" in u:
        return 4
    if "/wikipedia/en/" in u or "static.tvmaze.com" in u or "anilist.co" in u:
        return 5
    if "m.media-amazon.com" in u or "imdb" in u:
        return 6
    return 3


def _search_anilist(query: str, extra_queries: Optional[List[str]] = None) -> List[Dict]:
    """Query AniList GraphQL API (strictly type=ANIME, zero manga/books/games) for anime TV series, films, OVAs, and specials."""
    terms: List[str] = []
    for q in ([query] + (extra_queries or [])):
        q_c = (q or "").strip()
        if q_c and q_c.lower() not in [t.lower() for t in terms]:
            terms.append(q_c)
    if not terms:
        return []

    gql = (
        "query ($search: String) { Page(page: 1, perPage: 25) { "
        "media(search: $search, type: ANIME) { "
        "id title { romaji english } synonyms format genres description(asHtml: false) "
        "startDate { year } popularity coverImage { large } "
        "} } }"
    )
    results: List[Dict] = []
    seen_ani = set()
    for term in terms[:2]:
        try:
            data = _http_post_json("https://graphql.anilist.co", {"query": gql, "variables": {"search": term}}, timeout=6)
        except Exception:
            continue
        media_list = (((data or {}).get("data") or {}).get("Page") or {}).get("media") or []
        for m in media_list:
            aid = m.get("id")
            if not aid or aid in seen_ani:
                continue
            fmt = m.get("format") or "TV"
            if fmt == "MUSIC":
                continue
            seen_ani.add(aid)
            mtype = "movie" if fmt in ("MOVIE", "SPECIAL", "OVA") else "series"
            t_obj = m.get("title") or {}
            t_en = (t_obj.get("english") or t_obj.get("romaji") or "").strip()
            t_ro = (t_obj.get("romaji") or t_en).strip()
            if not t_en:
                continue
            year = str((m.get("startDate") or {}).get("year") or "")
            genres = ", ".join((m.get("genres") or [])[:3]) or ("Anime / Serie" if mtype == "series" else "Anime / Film")
            desc_clean = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", m.get("description") or "")).strip()[:220]
            results.append({
                "external_id": f"ani_{aid}",
                "imdb_id": "",
                "tvmaze_id": None,
                "media_type": mtype,
                "title_it": t_en,
                "title_original": t_ro,
                "aliases": [s for s in (m.get("synonyms") or []) if s],
                "year": year,
                "poster": (m.get("coverImage") or {}).get("large") or "",
                "genre": genres,
                "description": desc_clean or f"{'Serie Anime' if mtype == 'series' else 'Film Anime'}{f' ({year})' if year else ''}",
                "source": "anilist",
                "anilist_popularity": int(m.get("popularity") or 0),
                "has_it_title": False,
            })
    return results


WD_SERIES_P31 = {
    "Q5398426", "Q63952888", "Q581714", "Q117467246", "Q1259759",
    "Q15416", "Q1366112", "Q1107", "Q1047812", "Q526877",
}
WD_MOVIE_P31 = {
    "Q11424", "Q202866", "Q20650540", "Q29168811", "Q506240",
    "Q220898", "Q24862", "Q17517379", "Q93204", "Q1261214", "Q21664088",
}
WD_MOVIE_EXPLICIT_P31 = {
    "Q11424", "Q202866", "Q20650540", "Q29168811", "Q506240",
    "Q24862", "Q17517379", "Q93204", "Q1261214",
}
WD_ALL_MEDIA_P31 = WD_SERIES_P31 | WD_MOVIE_P31
WD_REJECT_P31 = {
    "Q7889", "Q7058673", "Q482994", "Q134556",
    "Q3464665", "Q21191270", "Q1983062", "Q4167410", "Q185529",
}
WD_BRIDGE_P31 = {"Q21198342", "Q196600", "Q7725634", "Q8274", "Q1667921"}
WD_STMT = "haswbstatement:" + "|".join(f"P31={q}" for q in sorted(WD_ALL_MEDIA_P31))

STOP_WORDS_SCORING = {
    "the", "il", "lo", "la", "l", "i", "gli", "le", "a", "an", "and", "e", "ed", "n",
    "di", "dei", "del", "della", "delle", "dello", "degli", "da", "dal", "dalla",
    "of", "in", "on", "per", "con", "su", "un", "uno", "una", "al", "alla", "ai", "agli", "alle",
}


def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")


def _clean_search_input(q: str) -> str:
    s = re.sub(r"['’`\-:–—.,!?/\\()\"*•·]+", " ", q or "")
    return re.sub(r"\s+", " ", s).strip()


def _core_search_input(q: str) -> str:
    cleaned = _clean_search_input(q)
    words = [w for w in cleaned.split() if _strip_accents(w).lower() not in STOP_WORDS_SCORING]
    return " ".join(words) if len(words) >= 2 else cleaned


def _clean_tokens_scoring(text: str) -> Tuple[List[str], List[str]]:
    norm = _strip_accents((text or "").lower())
    cleaned = re.sub(r"[^a-z0-9\s]", " ", norm)
    tokens = [ROMAN_NUMERALS_MAP.get(t, t) for t in cleaned.split() if t]
    core = [t for t in tokens if t not in STOP_WORDS_SCORING]
    return tokens, core


def _word_match_scoring(qw: str, cw: str) -> bool:
    if qw == cw:
        return True
    if len(qw) >= 3 and len(cw) >= 3:
        if (len(qw) >= 4 and cw.startswith(qw)) or (len(cw) >= 4 and qw.startswith(cw)):
            return True
        if min(len(qw), len(cw)) >= 5 and (qw in cw or cw in qw):
            return True
        if cw == f"{qw}s" or qw == f"{cw}s":
            return True
        min_l = min(len(qw), len(cw))
        max_d = 2 if min_l >= 6 else (1 if min_l >= 4 else 0)
        if max_d > 0 and damerau_levenshtein(qw, cw, max_dist=max_d) <= max_d:
            return True
    return False


def _score_candidate_list(query: str, primary_cands: List[str], alias_cands: List[str]) -> int:
    q_tokens, q_core = _clean_tokens_scoring(query)
    q_str = " ".join(q_tokens)
    q_core_str = " ".join(q_core)
    if not q_str and not q_core_str:
        return 0

    best_score = 0
    for is_alias, cand in [(False, c) for c in (primary_cands or [])] + [(True, c) for c in (alias_cands or [])]:
        if not cand:
            continue
        c_tokens, c_core = _clean_tokens_scoring(cand)
        if not c_tokens:
            continue
        c_str = " ".join(c_tokens)
        c_core_str = " ".join(c_core)

        s = 0
        if q_str and q_str == c_str:
            s = 1000
        elif q_core_str and q_core_str == c_core_str:
            s = 970
        elif (q_str and q_str in c_str) or (q_core_str and q_core_str in c_core_str):
            is_start = c_str.startswith(q_str) or (q_core_str and c_core_str.startswith(q_core_str))
            is_end = c_str.endswith(q_str) or (q_core_str and c_core_str.endswith(q_core_str))
            extra_words = abs(len(c_core) - len(q_core))
            if is_start and 1 <= extra_words <= 3:
                rem_tokens = c_core[len(q_core) :] if len(c_core) > len(q_core) else []
                if extra_words == 1 and rem_tokens and rem_tokens[0].isdigit():
                    s = 965
                elif rem_tokens and (
                    rem_tokens[0].isdigit()
                    or rem_tokens[0] in ("parte", "part", "capitolo", "chapter", "vol", "volume", "for", "ride", "forever")
                    or ":" in cand
                    or "-" in cand
                ):
                    s = max(935, 955 - (extra_words - 1) * 6)
                else:
                    s = max(780, 945 - extra_words * 7)
            else:
                phrase_score = 940 if is_start else (920 if is_end else 900)
                s = max(780, phrase_score - extra_words * 8)
        elif q_core:
            matched_indices = []
            matched_count = 0
            for qw in q_core:
                found_idx = -1
                for ci, cw in enumerate(c_tokens):
                    if _word_match_scoring(qw, cw):
                        matched_count += 1
                        found_idx = ci
                        break
                if found_idx != -1:
                    matched_indices.append(found_idx)

            if matched_count > 0:
                coverage = matched_count / len(q_core)
                if coverage == 1.0:
                    in_order = all(matched_indices[i] >= matched_indices[i - 1] for i in range(1, len(matched_indices)))
                    order_score = 840 if in_order else 760
                    extra_words = abs(len(c_core) - len(q_core))
                    s = max(650, order_score - extra_words * 10)
                elif coverage >= 0.5:
                    extra_words = abs(len(c_core) - len(q_core))
                    s = max(200, round(coverage * 600) - extra_words * 15)
                else:
                    extra_words = abs(len(c_core) - len(q_core))
                    s = max(100, round(coverage * 500) - extra_words * 10)

        if s > 0 and is_alias:
            s = max(90, s - 5)
        best_score = max(best_score, s)
    return best_score


def _search_wikidata_media(query: str, extra_queries: Optional[List[str]] = None) -> Tuple[List[Dict], List[str], List[str]]:
    """
    Search Wikidata using structured P31 media statements (`film`, `series`, `anime`, `OVA`, `miniseries`, `special`),
    resolving official Italian & English titles, release years, IMDb IDs, aliases, Italian Wikipedia posters,
    typographic spellcheck fallbacks, and cross-language bridge queries.
    """
    raw_trimmed = (query or "").strip()
    cq = _clean_search_input(raw_trimmed)
    core_q = _core_search_input(raw_trimmed)
    q_norm = normalize_title(cq or raw_trimmed)
    if not q_norm:
        return [], [], []

    wd_qids: List[str] = []
    seen_qids = set()
    suggestions: List[str] = []
    bridge_queries: List[str] = []

    m_sub = re.match(
        r"^(?:lupin(?:\s+(?:iii|3|terzo))?|star\s+wars|dragon\s+ball(?:\s+(?:z|super|gt))?|rocky(?:\s+\d+)?|harry\s+potter|detective\s+conan)\s*[-:–]?\s*(.+)$",
        raw_trimmed,
        flags=re.IGNORECASE,
    )
    sub_title = _clean_search_input(m_sub.group(1)) if (m_sub and m_sub.group(1).strip() and len(m_sub.group(1).strip()) >= 3) else ""

    sr_tasks: List[Tuple[str, int]] = [(cq or raw_trimmed, 35)]
    if core_q and core_q.lower() != cq.lower():
        sr_tasks.append((core_q, 25))
    if sub_title and sub_title.lower() != cq.lower():
        sr_tasks.append((sub_title, 25))
    for eq in (extra_queries or []):
        ec = _clean_search_input(eq)
        if ec and ec.lower() not in [t[0].lower() for t in sr_tasks]:
            sr_tasks.append((ec, 20))
    if q_norm == "lupin":
        sr_tasks.append(("Lupin III", 35))

    wb_tasks: List[Tuple[str, int]] = [(raw_trimmed, 25)]
    if sub_title:
        wb_tasks.append((sub_title, 20))

    def _run_sr(term: str, lim: int) -> List[str]:
        url = f"https://www.wikidata.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(term + ' ' + WD_STMT)}&srlimit={lim}&format=json"
        d = _http_get_json(url, timeout=6)
        return [h.get("title") for h in ((d or {}).get("query") or {}).get("search") or [] if h.get("title")]

    def _run_wb(term: str, lim: int) -> List[str]:
        url = f"https://www.wikidata.org/w/api.php?action=wbsearchentities&search={urllib.parse.quote(term)}&language=it&uselang=it&limit={lim}&format=json"
        d = _http_get_json(url, timeout=6)
        return [h.get("id") for h in ((d or {}).get("search") or []) if h.get("id")]

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        futs = [ex.submit(_run_sr, t, lim) for t, lim in sr_tasks] + [ex.submit(_run_wb, t, lim) for t, lim in wb_tasks]
        for fut in futs:
            try:
                for qid in fut.result():
                    if re.match(r"^Q\d+$", qid) and qid not in seen_qids:
                        seen_qids.add(qid)
                        wd_qids.append(qid)
            except Exception:
                pass

    # Typo / Low-recall fallback: Wikidata ~2 fuzzy search + it/en Wikipedia suggestion
    if len(seen_qids) < 8 and len(cq) >= 4:
        fuz_q = " ".join(f"{w}~2" if len(w) >= 4 else w for w in cq.split())

        def _wiki_sug(host: str) -> str:
            u = f"https://{host}/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(cq)}&srlimit=1&format=json"
            d = _http_get_json(u, timeout=4)
            sug = (((d or {}).get("query") or {}).get("searchinfo") or {}).get("suggestion") or ""
            return re.sub(r"<[^>]+>", "", sug).strip()

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
            f_fuz = ex.submit(_run_sr, fuz_q, 25)
            f_it = ex.submit(_wiki_sug, "it.wikipedia.org")
            f_en = ex.submit(_wiki_sug, "en.wikipedia.org")
            try:
                for qid in f_fuz.result():
                    if re.match(r"^Q\d+$", qid) and qid not in seen_qids:
                        seen_qids.add(qid)
                        wd_qids.append(qid)
            except Exception:
                pass
            for f_sug in (f_it, f_en):
                try:
                    sug = f_sug.result()
                    if sug and normalize_title(sug) != q_norm and sug not in suggestions:
                        suggestions.append(sug)
                except Exception:
                    pass

        if suggestions:
            sug = suggestions[0]
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
                fs1 = ex.submit(_run_sr, sug, 25)
                fs2 = ex.submit(_run_wb, sug, 15)
                for fut in (fs1, fs2):
                    try:
                        for qid in fut.result():
                            if re.match(r"^Q\d+$", qid) and qid not in seen_qids:
                                seen_qids.add(qid)
                                wd_qids.append(qid)
                    except Exception:
                        pass

    if not wd_qids:
        return [], [], suggestions

    # Batch hydrate up to 80 entities in parallel chunks of 40
    qid_to_fetch = wd_qids[:80]
    chunks = [qid_to_fetch[i : i + 40] for i in range(0, len(qid_to_fetch), 40)]

    def _fetch_ents(chunk: List[str]) -> Dict:
        url = (
            f"https://www.wikidata.org/w/api.php?action=wbgetentities&ids={'|'.join(chunk)}"
            "&props=labels|aliases|descriptions|claims|sitelinks&languages=it|mul|en&format=json"
        )
        return ((_http_get_json(url, timeout=7) or {}).get("entities")) or {}

    ents: Dict = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(chunks)) as ex:
        for fut in [ex.submit(_fetch_ents, c) for c in chunks]:
            try:
                ents.update(fut.result())
            except Exception:
                pass

    results: List[Dict] = []
    itwiki_map: Dict[str, Dict] = {}
    enwiki_map: Dict[str, Dict] = {}

    for qid in qid_to_fetch:
        e = ents.get(qid)
        if not e or e.get("missing"):
            continue
        claims = e.get("claims") or {}
        p31s = [
            ((c.get("mainsnak") or {}).get("datavalue") or {}).get("value", {}).get("id")
            for c in claims.get("P31", [])
            if isinstance(((c.get("mainsnak") or {}).get("datavalue") or {}).get("value"), dict)
        ]
        if any(p in WD_REJECT_P31 for p in p31s):
            continue

        lbls = e.get("labels") or {}
        it_lbl = (lbls.get("it") or {}).get("value") or ""
        mul_lbl = (lbls.get("mul") or {}).get("value") or ""
        en_lbl = (lbls.get("en") or {}).get("value") or mul_lbl or ""
        itw = ((e.get("sitelinks") or {}).get("itwiki") or {}).get("title") or ""
        enw = ((e.get("sitelinks") or {}).get("enwiki") or {}).get("title") or ""
        itw_clean = re.sub(r"\s*\([^)]*\)\s*$", "", itw).strip()
        enw_clean = re.sub(r"\s*\([^)]*\)\s*$", "", enw).strip()

        alias_set = set()
        for lang in ("it", "en", "mul"):
            for a in (e.get("aliases") or {}).get(lang, []):
                if a.get("value"):
                    alias_set.add(a["value"])
        for t in (it_lbl, itw_clean, en_lbl, enw_clean, mul_lbl):
            if t:
                alias_set.add(t)
        aliases = list(alias_set)

        if not any(p in WD_ALL_MEDIA_P31 for p in p31s):
            if any(p in WD_BRIDGE_P31 for p in p31s) and en_lbl:
                norm_en = normalize_title(en_lbl)
                if (
                    norm_en
                    and norm_en != q_norm
                    and norm_en not in q_norm
                    and _score_candidate_list(raw_trimmed, [it_lbl, itw_clean], aliases) >= 750
                    and en_lbl not in bridge_queries
                    and len(bridge_queries) < 2
                ):
                    bridge_queries.append(en_lbl)
            continue

        has_series = any(p in WD_SERIES_P31 for p in p31s)
        has_explicit_film = any(p in WD_MOVIE_EXPLICIT_P31 for p in p31s)
        mtype = "series" if (has_series and not has_explicit_film) else "movie"

        if itw_clean:
            title_it = itw_clean
        elif it_lbl:
            title_it = it_lbl
        else:
            title_it = mul_lbl or en_lbl or enw_clean

        # Resolve TRUE native original title (Italian for Italy, native language for Japan/France/Spain/etc.)
        p1476_list = claims.get("P1476") or []
        p495_ids = [(c.get("mainsnak") or {}).get("datavalue", {}).get("value", {}).get("id") for c in (claims.get("P495") or [])]
        is_italian_prod = "Q38" in p495_ids

        title_orig = ""
        if is_italian_prod:
            title_orig = title_it
        else:
            for c in p1476_list:
                val = (c.get("mainsnak") or {}).get("datavalue", {}).get("value")
                if isinstance(val, dict) and val.get("language") != "en" and val.get("text"):
                    title_orig = val["text"].strip()
                    break
            if not title_orig and p1476_list:
                v0 = ((p1476_list[0].get("mainsnak") or {}).get("datavalue", {}).get("value"))
                if isinstance(v0, dict) and v0.get("text"):
                    title_orig = v0["text"].strip()
            if not title_orig and claims.get("P1705"):
                v1705 = ((claims["P1705"][0].get("mainsnak") or {}).get("datavalue", {}).get("value"))
                if isinstance(v1705, dict) and v1705.get("text"):
                    title_orig = v1705["text"].strip()
            labels = e.get("labels") or {}
            if not title_orig and "Q17" in p495_ids and labels.get("ja"):
                title_orig = (labels["ja"].get("value") or "").strip()
            if not title_orig and "Q142" in p495_ids and labels.get("fr"):
                title_orig = (labels["fr"].get("value") or "").strip()
            if not title_orig and "Q29" in p495_ids and labels.get("es"):
                title_orig = (labels["es"].get("value") or "").strip()
            if not title_orig and "Q183" in p495_ids and labels.get("de"):
                title_orig = (labels["de"].get("value") or "").strip()

        if not title_orig:
            title_orig = en_lbl or enw_clean or title_it
        if not title_it:
            continue
        has_it = bool(it_lbl or itw_clean)

        year = ""
        for pid in ("P577", "P580"):
            cl = claims.get(pid, [])
            if cl and isinstance(((cl[0].get("mainsnak") or {}).get("datavalue") or {}).get("value"), dict):
                tv = (((cl[0].get("mainsnak") or {}).get("datavalue") or {}).get("value") or {}).get("time") or ""
                ym = re.match(r"^[+-]?(\d{4})", tv)
                if ym:
                    year = ym.group(1)
                    break

        imdb_val = (((claims.get("P345") or [{}])[0].get("mainsnak") or {}).get("datavalue") or {}).get("value") or ""
        imdb_id = imdb_val if isinstance(imdb_val, str) else ""

        p18_val = (((claims.get("P18") or [{}])[0].get("mainsnak") or {}).get("datavalue") or {}).get("value") or ""
        poster = ""
        if isinstance(p18_val, str) and p18_val and not any(b in p18_val.lower() for b in (".svg", "logo", "wordmark", "map_", "flag_")):
            poster = f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(p18_val)}?width=400"

        descs = e.get("descriptions") or {}
        desc_val = ((descs.get("it") or {}).get("value") or (descs.get("en") or {}).get("value") or "").strip()
        if any(bad_w in desc_val.lower() for bad_w in ("pornographic", "pornografico", "adult film", "hardcore")):
            continue
        desc_nice = (desc_val[0].upper() + desc_val[1:]) if desc_val else ("Serie TV" if mtype == "series" else "Film")
        sl = len(e.get("sitelinks") or {})

        item = {
            "external_id": f"wd_{qid}",
            "imdb_id": imdb_id,
            "tvmaze_id": None,
            "media_type": mtype,
            "title_it": title_it,
            "title_original": title_orig,
            "aliases": aliases,
            "year": year,
            "poster": poster,
            "genre": "Serie TV" if mtype == "series" else "Film",
            "description": f"{desc_nice}{f' ({year})' if year else ''}",
            "source": "wikidata",
            "sitelinks_count": sl,
            "has_it_title": has_it,
        }

        match_sc = _score_candidate_list(raw_trimmed, [title_it, itw_clean, en_lbl], aliases)
        sug_match = any(_score_candidate_list(s, [title_it, title_orig], aliases) > 0 for s in suggestions)
        if match_sc > 0 or sug_match:
            if itw:
                itwiki_map[itw] = item
            if enw:
                enwiki_map[enw] = item
            if match_sc >= 750 and en_lbl:
                norm_en = normalize_title(en_lbl)
                if norm_en and norm_en != q_norm and norm_en not in q_norm and en_lbl not in bridge_queries and len(bridge_queries) < 2:
                    bridge_queries.append(en_lbl)

        results.append(item)

    # Batch resolve Italian & English Wikipedia pageimages posters (including official theatrical posters via pilicense=any)
    wiki_jobs: List[Tuple[str, Dict[str, Dict], List[str]]] = []
    itwiki_titles = list(itwiki_map.keys())[:70]
    for i in range(0, len(itwiki_titles), 35):
        wiki_jobs.append(("it.wikipedia.org", itwiki_map, itwiki_titles[i : i + 35]))
    enwiki_titles = list(enwiki_map.keys())[:70]
    for i in range(0, len(enwiki_titles), 35):
        wiki_jobs.append(("en.wikipedia.org", enwiki_map, enwiki_titles[i : i + 35]))

    if wiki_jobs:
        def _fetch_pi(job: Tuple[str, Dict[str, Dict], List[str]]) -> None:
            host, wmap, tbatch = job
            url = f"https://{host}/w/api.php?action=query&titles={urllib.parse.quote('|'.join(tbatch))}&prop=pageimages&pilicense=any&pithumbsize=500&format=json"
            pi_data = _http_get_json(url, timeout=5)
            pages = ((pi_data or {}).get("query") or {}).get("pages") or {}
            for p in pages.values():
                t = p.get("title")
                src = (p.get("thumbnail") or {}).get("source") or ""
                target = t and wmap.get(t)
                if target and src and _poster_quality_rank(src) > _poster_quality_rank(target.get("poster", "")):
                    target["poster"] = src

        with concurrent.futures.ThreadPoolExecutor(max_workers=min(6, len(wiki_jobs))) as ex:
            for fut in [ex.submit(_fetch_pi, j) for j in wiki_jobs]:
                try:
                    fut.result()
                except Exception:
                    pass

    return results, bridge_queries, suggestions


def compute_relevance_score(
    query: str,
    item: Dict,
    bridge_queries: Optional[List[str]] = None,
    suggestions: Optional[List[str]] = None,
) -> int:
    primaries = [item.get("title_it", ""), item.get("title_original", "")]
    aliases: List[str] = []
    if item.get("keywords"):
        aliases.extend(str(item["keywords"]).split())
    if item.get("aliases"):
        aliases.extend(item["aliases"])

    best_score = _score_candidate_list(query, primaries, aliases)

    if suggestions:
        for sug in suggestions:
            sug_score = _score_candidate_list(sug, primaries, aliases)
            if sug_score > 0:
                best_score = max(best_score, max(120, sug_score - 40))

    if best_score == 0 and bridge_queries:
        for bq in bridge_queries:
            bs = _score_candidate_list(bq, primaries, aliases)
            if bs > 0:
                best_score = max(best_score, min(820, max(120, bs - 180)))

    if item.get("is_saga"):
        rank = item.get("saga_rank", 1)
        if best_score >= 960:
            pass
        elif best_score > 0:
            best_score = max(best_score, 960 - rank * 6)
        else:
            best_score = max(best_score, 920 - rank * 6)

    if best_score == 0:
        return 0

    pop_bonus = 0
    sl = item.get("sitelinks_count") or 0
    if isinstance(sl, (int, float)):
        if sl >= 45:
            pop_bonus = max(pop_bonus, 160)
        elif sl >= 30:
            pop_bonus = max(pop_bonus, 130)
        elif sl >= 15:
            pop_bonus = max(pop_bonus, 90)
        elif sl >= 8:
            pop_bonus = max(pop_bonus, 50)
        elif sl >= 4:
            pop_bonus = max(pop_bonus, 20)

    apop = item.get("anilist_popularity") or 0
    if isinstance(apop, (int, float)):
        if apop >= 120000:
            pop_bonus = max(pop_bonus, 150)
        elif apop >= 60000:
            pop_bonus = max(pop_bonus, 115)
        elif apop >= 25000:
            pop_bonus = max(pop_bonus, 75)
        elif apop >= 8000:
            pop_bonus = max(pop_bonus, 35)

    imdb_rank = item.get("popularity_rank")
    if imdb_rank is not None and isinstance(imdb_rank, (int, float)) and imdb_rank > 0:
        if imdb_rank <= 2500:
            pop_bonus = max(pop_bonus, 160)
        elif imdb_rank <= 10000:
            pop_bonus = max(pop_bonus, 130)
        elif imdb_rank <= 30000:
            pop_bonus = max(pop_bonus, 90)
        elif imdb_rank <= 60000:
            pop_bonus = max(pop_bonus, 50)
        elif imdb_rank <= 150000:
            pop_bonus = max(pop_bonus, 20)

    tv_weight = item.get("popularity_weight")
    if tv_weight is not None and isinstance(tv_weight, (int, float)):
        if tv_weight >= 92:
            pop_bonus = max(pop_bonus, 145)
        elif tv_weight >= 85:
            pop_bonus = max(pop_bonus, 115)
        elif tv_weight >= 70:
            pop_bonus = max(pop_bonus, 75)
        elif tv_weight >= 50:
            pop_bonus = max(pop_bonus, 35)

    if item.get("is_saga"):
        pop_bonus = max(pop_bonus, 140)

    it_bonus = 35 if item.get("has_it_title") else 0

    obscurity_penalty = 0
    src = item.get("source") or ""
    if not item.get("is_saga") and src != "catalog_it" and src != "epg_dtt":
        if src == "wikidata":
            if sl <= 1 and not item.get("has_it_title") and not item.get("imdb_id"):
                obscurity_penalty = 150
            elif sl <= 3 and not item.get("has_it_title"):
                obscurity_penalty = 95
            elif sl <= 2:
                obscurity_penalty = 60
        elif src == "anilist":
            if apop < 5000 and not item.get("has_it_title"):
                obscurity_penalty = 110
        elif src == "tvmaze":
            if (tv_weight or 0) < 40 and not item.get("has_it_title"):
                obscurity_penalty = 90

    return max(10, best_score + pop_bonus + it_bonus - obscurity_penalty)


def search_catalog(query: str, epg_events: Optional[List[Dict]] = None) -> List[Dict]:
    """
    Search strictly visual media (Movies, TV Series, Anime, OVAs, Specials) with:
      1. Built-in Italian Sagas & Aliases (Harry Potter, Fast & Furious, LOTR, Pirates, Rocky, Anime)
      2. Structured Wikidata Media Search (P31-verified film/series/anime only, zero games/books/music)
      3. AniList GraphQL Anime Search (TV, Movie, OVA, ONA, Special)
      4. IMDb + Wikidata Italian Label Resolver (Amazon posters & prominence)
      5. TVMaze TV Series Search (episodes & seasons)
      6. Live 7-day Italian DTT EPG
    Ranked cleanly by exact match -> phrase match -> word coverage -> prominence/popularity.
    """
    q_norm = normalize_title(query)
    if not q_norm:
        return []

    expanded_queries = expand_query_variants(query, epg_events=epg_events)
    primary_q = expanded_queries[0] if expanded_queries else query
    extra_qs = expanded_queries[1:] if len(expanded_queries) > 1 else []

    combined: List[Dict] = []

    # 1. Check Curated Sagas & Bilingual Aliases
    q_tokens, q_core = _clean_tokens_scoring(query)
    q_str = " ".join(q_tokens)
    q_core_str = " ".join(q_core)
    matched_saga_ids = set()
    for sg in SAGA_GROUPS:
        for sname in sg["names"]:
            st, sc = _clean_tokens_scoring(sname)
            if " ".join(st) == q_str or (sc and " ".join(sc) == q_core_str):
                matched_saga_ids.add(sg["id"])
                break

    matched_sagas: List[Tuple[int, Dict]] = []
    for al in ITALIAN_ORIGINAL_ALIASES:
        is_saga_group = bool(al.get("saga_group") and al["saga_group"] in matched_saga_ids)
        ok_it, d_it = fuzzy_match_title(query, al["it"])
        ok_or, d_or = fuzzy_match_title(query, al["orig"])
        ok_kw = False
        d_kw = 99
        if al.get("aliases"):
            for a in al["aliases"]:
                ok_a, d_a = fuzzy_match_title(query, a)
                if ok_a and d_a < d_kw:
                    ok_kw = True
                    d_kw = d_a
        elif al.get("keywords"):
            ok_kw, d_kw = fuzzy_match_title(query, al["keywords"])

        if is_saga_group or ok_it or ok_or or ok_kw:
            best_d = 0 if is_saga_group else min(d_it if ok_it else 99, d_or if ok_or else 99, d_kw if ok_kw else 99)
            matched_sagas.append((best_d, {
                "external_id": f"alias_{normalize_title(al['orig']).replace(' ', '_')}",
                "imdb_id": "",
                "tvmaze_id": None,
                "media_type": al["type"],
                "title_it": al["it"],
                "title_original": al["orig"],
                "year": al.get("year") or "",
                "poster": al.get("poster") or "",
                "genre": "Serie TV" if al["type"] == "series" else "Film",
                "description": f"{'Serie TV' if al['type'] == 'series' else 'Film'}{' (' + al['year'] + ')' if al.get('year') else ''} • Titolo orig.: {al['orig']}",
                "source": "catalog_it",
                "is_saga": bool(al.get("saga_group")),
                "saga_rank": al.get("saga_rank", 1),
                "aliases": al.get("aliases") or [],
                "has_it_title": True,
            }))

    matched_sagas.sort(key=lambda x: x[0])
    combined.extend(item for _, item in matched_sagas)

    # 2. Phase 1 Parallel Queries: Wikidata structured media + IMDb + TVMaze + AniList
    wd_items: List[Dict] = []
    bridge_queries: List[str] = []
    suggestions: List[str] = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        f_wd = ex.submit(_search_wikidata_media, query, extra_qs)
        f_imdb = ex.submit(_search_imdb_with_italian_labels, primary_q, extra_qs)
        f_maze = ex.submit(_search_tvmaze, primary_q, extra_qs)
        f_ani = ex.submit(_search_anilist, primary_q, extra_qs)
        try:
            wd_items, bridge_queries, suggestions = f_wd.result()
            combined.extend(wd_items)
        except Exception:
            pass
        for fut in (f_imdb, f_maze, f_ani):
            try:
                combined.extend(fut.result())
            except Exception:
                pass

    # 3. Phase 2 Conditional Follow-up for verified bridge_queries & spellcheck suggestions
    searched_lower = {q_item.strip().lower() for q_item in ([query, primary_q] + extra_qs) if q_item}
    follow_terms: List[str] = []
    for t in (suggestions[:1] + bridge_queries[:1]):
        if t and t.strip().lower() not in searched_lower and t.strip().lower() not in [f.lower() for f in follow_terms]:
            follow_terms.append(t.strip())

    if follow_terms:
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
            f_imdb2 = ex.submit(_search_imdb_with_italian_labels, follow_terms[0], follow_terms[1:])
            f_maze2 = ex.submit(_search_tvmaze, follow_terms[0], follow_terms[1:])
            f_ani2 = ex.submit(_search_anilist, follow_terms[0], follow_terms[1:])
            for fut in (f_imdb2, f_maze2, f_ani2):
                try:
                    combined.extend(fut.result())
                except Exception:
                    pass

    # 4. Search live 7-day Italian DTT EPG for titles currently airing on TV
    if epg_events:
        seen_epg = set()
        for ev in epg_events:
            if ev.get("media_type") not in ("movie", "series"):
                continue
            ev_norm = ev.get("norm_title") or ""
            if not ev_norm or ev_norm in seen_epg:
                continue
            ok_epg, _ = fuzzy_match_title(query, ev.get("title") or ev_norm)
            if ok_epg:
                seen_epg.add(ev_norm)
                combined.append({
                    "external_id": f"epg_{ev_norm.replace(' ', '_')}",
                    "imdb_id": "",
                    "tvmaze_id": None,
                    "media_type": ev["media_type"],
                    "title_it": ev["title"],
                    "title_original": ev["title"],
                    "aliases": [],
                    "year": "",
                    "poster": ev.get("poster") or "",
                    "genre": ev.get("genre") or ("Serie TV" if ev["media_type"] == "series" else "Film"),
                    "description": f"📡 In onda questa settimana su {ev['channel_name']} (Canale {ev['lcn']}) • " + (ev.get("description") or ""),
                    "source": "epg_dtt",
                    "has_it_title": True,
                })

    # 5. Honest Scoring (> 0 ONLY) & Sort Descending before Dedup so highest-relevance/authority leads
    scored_pre: List[Tuple[int, Dict]] = []
    for item in combined:
        sc = compute_relevance_score(query, item, bridge_queries=bridge_queries, suggestions=suggestions)
        if sc > 0:
            item["relevance_score"] = sc
            scored_pre.append((sc, item))

    scored_pre.sort(key=lambda x: (-x[0], -_poster_quality_rank(x[1].get("poster", ""))))

    # 6. Year-Guarded Cross-Language & IMDb-ID Deduplication
    def _build_item_keys(it: Dict) -> set:
        ks = set()
        for field in (it.get("title_it"), it.get("title_original")):
            n = normalize_title(field or "")
            if n:
                ks.add(n)
                sc = strip_conjunctions(n)
                if sc:
                    ks.add(sc)
        for a in (it.get("aliases") or [])[:12]:
            na = normalize_title(a)
            if len(na) >= 4:
                ks.add(na)
        return ks

    dedup: List[Dict] = []
    for _, item in scored_pre:
        it_keys = _build_item_keys(item)
        it_year_s = str(item.get("year") or "").strip()
        it_year = int(it_year_s) if it_year_s.isdigit() else 0
        it_imdb = (item.get("imdb_id") or "").strip()
        it_ext = str(item.get("external_id") or "")
        it_src = str(item.get("source") or "")

        matched_ex = None
        for ex in dedup:
            if ex["media_type"] != item["media_type"]:
                continue
            ex_imdb = (ex.get("imdb_id") or "").strip()
            ex_ext = str(ex.get("external_id") or "")
            ex_src = str(ex.get("source") or "")

            if it_imdb and ex_imdb:
                if it_imdb == ex_imdb:
                    matched_ex = ex
                    break
                else:
                    continue

            if it_ext.startswith("wd_") and ex_ext.startswith("wd_") and it_ext != ex_ext:
                continue

            ex_year_s = str(ex.get("year") or "").strip()
            ex_year = int(ex_year_s) if ex_year_s.isdigit() else 0
            if ex_year and it_year:
                if abs(ex_year - it_year) > 1:
                    continue
            elif (ex_year and not it_year) or (it_year and not ex_year):
                if ex_src not in ("catalog_it", "epg_dtt") and it_src not in ("catalog_it", "epg_dtt"):
                    continue

            if (it_src == "anilist") != (ex_src == "anilist"):
                other = ex if it_src == "anilist" else item
                other_blob = f"{other.get('genre', '')} {other.get('description', '')}".lower()
                if not any(w in other_blob for w in ("anime", "animat", "animazione", "manga", "japanese")):
                    continue

            ex_keys = _build_item_keys(ex)
            if it_keys & ex_keys:
                matched_ex = ex
                break

        if matched_ex:
            if _poster_quality_rank(item.get("poster", "")) > _poster_quality_rank(matched_ex.get("poster", "")):
                matched_ex["poster"] = item["poster"]
            elif not matched_ex.get("poster") and item.get("poster"):
                matched_ex["poster"] = item["poster"]
            if not matched_ex.get("year") and item.get("year"):
                matched_ex["year"] = item["year"]
            if not matched_ex.get("tvmaze_id") and item.get("tvmaze_id"):
                matched_ex["tvmaze_id"] = item["tvmaze_id"]
            if not matched_ex.get("imdb_id") and item.get("imdb_id"):
                matched_ex["imdb_id"] = item["imdb_id"]

            ex_desc = matched_ex.get("description") or ""
            it_desc = item.get("description") or ""
            ex_is_it_desc = bool(matched_ex.get("has_it_title")) or ex_desc.startswith(("Film ", "Serie ", "📡"))
            it_is_it_desc = bool(item.get("has_it_title")) or it_desc.startswith(("Film ", "Serie ", "📡"))
            if it_desc and (
                (it_is_it_desc and not ex_is_it_desc)
                or (it_is_it_desc == ex_is_it_desc and len(it_desc) > len(ex_desc) and "Titolo orig.:" not in it_desc)
                or ("Titolo orig.:" in ex_desc and len(it_desc) > 15)
            ):
                matched_ex["description"] = it_desc

            if not matched_ex.get("has_it_title") and item.get("has_it_title"):
                matched_ex["title_it"] = item["title_it"]
                matched_ex["has_it_title"] = True

            if (item.get("sitelinks_count") or 0) > (matched_ex.get("sitelinks_count") or 0):
                matched_ex["sitelinks_count"] = item["sitelinks_count"]
            if (item.get("anilist_popularity") or 0) > (matched_ex.get("anilist_popularity") or 0):
                matched_ex["anilist_popularity"] = item["anilist_popularity"]
            if (item.get("popularity_weight") or 0) > (matched_ex.get("popularity_weight") or 0):
                matched_ex["popularity_weight"] = item["popularity_weight"]
            it_pr = item.get("popularity_rank")
            ex_pr = matched_ex.get("popularity_rank")
            if it_pr and (not ex_pr or it_pr < ex_pr):
                matched_ex["popularity_rank"] = it_pr

            if item.get("is_saga"):
                matched_ex["is_saga"] = True
                matched_ex["saga_rank"] = item.get("saga_rank", 1)
            if item.get("aliases"):
                existing_al = set(matched_ex.get("aliases") or [])
                existing_al.update(item["aliases"])
                matched_ex["aliases"] = list(existing_al)
        else:
            dedup.append(item)

    for d in dedup:
        d["relevance_score"] = compute_relevance_score(query, d, bridge_queries=bridge_queries, suggestions=suggestions)

    dedup.sort(key=lambda d: (-d.get("relevance_score", 0), -_poster_quality_rank(d.get("poster", ""))))
    return dedup[:100]


def fetch_series_episodes(tvmaze_id: Optional[int] = None, title_original: str = "", title_it: str = "", epg_events: Optional[List[Dict]] = None) -> List[Dict]:
    """
    Fetch all seasons and episodes for a TV Series (TV Time style).
    Uses TVMaze API by tvmaze_id or title lookup, supplemented by Italian EPG episodes.
    """
    resolved_id = tvmaze_id
    if not resolved_id:
        for candidate in [title_original, title_it]:
            if not candidate:
                continue
            c_norm = normalize_title(candidate)
            for al in ITALIAN_ORIGINAL_ALIASES:
                if normalize_title(al["it"]) == c_norm:
                    candidate = al["orig"]
                    break
            url = f"https://api.tvmaze.com/singlesearch/shows?q={urllib.parse.quote(candidate)}"
            try:
                show = _http_get_json(url, timeout=6)
                if isinstance(show, dict) and show.get("id"):
                    resolved_id = show["id"]
                    break
            except Exception:
                continue

    episodes: List[Dict] = []
    if resolved_id:
        try:
            raw_eps = _http_get_json(f"https://api.tvmaze.com/shows/{resolved_id}/episodes", timeout=8)
            if isinstance(raw_eps, list):
                for ep in raw_eps:
                    s_num = ep.get("season")
                    e_num = ep.get("number")
                    if s_num is None or e_num is None:
                        continue
                    episodes.append({
                        "season": int(s_num),
                        "episode": int(e_num),
                        "title": (ep.get("name") or f"Episodio {e_num}").strip(),
                        "airdate": ep.get("airdate") or "",
                        "runtime": ep.get("runtime") or 45,
                    })
        except Exception:
            pass

    if epg_events:
        aliases = set(get_aliases_for_titles(title_it, title_original))
        existing_se = {(ep["season"], ep["episode"]): ep for ep in episodes}
        for ev in epg_events:
            if ev.get("media_type") == "series" and ev.get("norm_title") in aliases:
                s_num = ev.get("season") or 1
                e_num = ev.get("episode")
                if e_num is not None:
                    if (s_num, e_num) not in existing_se:
                        ep_obj = {
                            "season": int(s_num),
                            "episode": int(e_num),
                            "title": ev.get("episode_title") or f"Episodio {e_num}",
                            "airdate": ev.get("date") or "",
                            "runtime": ev.get("duration_min") or 50,
                        }
                        episodes.append(ep_obj)
                        existing_se[(s_num, e_num)] = ep_obj
                    elif ev.get("episode_title") and existing_se[(s_num, e_num)]["title"].startswith("Episodio"):
                        existing_se[(s_num, e_num)]["title"] = ev["episode_title"]

    if not episodes:
        for ep_i in range(1, 13):
            episodes.append({
                "season": 1,
                "episode": ep_i,
                "title": f"Episodio {ep_i}",
                "airdate": "",
                "runtime": 50,
            })

    episodes.sort(key=lambda x: (x["season"], x["episode"]))
    return episodes


# Official Italian Streaming Platforms (100% Free Lookup, Strictly Flatrate / Included in Subscription)
STREAMING_PLATFORMS: List[Dict] = [
    {"id": "netflix", "name": "Netflix", "short_codes": ["nfx", "nfk"], "color": "#e50914"},
    {"id": "prime", "name": "Prime Video", "short_codes": ["prv", "pva"], "color": "#00a8e1"},
    {"id": "disney", "name": "Disney+", "short_codes": ["dnp"], "color": "#113ccf"},
    {"id": "now", "name": "NOW", "short_codes": ["ntv"], "color": "#00d66c"},
    {"id": "sky", "name": "Sky Go", "short_codes": ["skg", "sky"], "color": "#0072ce"},
    {"id": "hbo", "name": "HBO / Max", "short_codes": ["mxx", "hbo"], "color": "#7b2cbf"},
    {"id": "apple", "name": "Apple TV+", "short_codes": ["atp"], "color": "#a2aaad"},
    {"id": "paramount", "name": "Paramount+", "short_codes": ["pmp"], "color": "#0064ff"},
    {"id": "raiplay", "name": "RaiPlay", "short_codes": ["rpl"], "color": "#0046ad"},
    {"id": "mediaset", "name": "Mediaset Infinity", "short_codes": ["mds", "mde"], "color": "#f39200"},
    {"id": "crunchyroll", "name": "Crunchyroll", "short_codes": ["fuj", "cru"], "color": "#f47521"},
    {"id": "timvision", "name": "TIMVISION", "short_codes": ["tvi"], "color": "#003399"},
]

JUSTWATCH_PACKAGE_MAP: Dict[str, Dict] = {}
for _plat in STREAMING_PLATFORMS:
    for _sc in _plat["short_codes"]:
        JUSTWATCH_PACKAGE_MAP[_sc] = _plat

_JW_GRAPHQL_QUERY = """
query SearchTitleOffers($searchQuery: String!, $country: Country!, $language: Language!, $objectTypes: [ObjectType!]) {
  popularTitles(
    country: $country
    first: 6
    filter: {
      searchQuery: $searchQuery
      objectTypes: $objectTypes
    }
  ) {
    edges {
      node {
        objectId
        objectType
        content(country: $country, language: $language) {
          title
          originalReleaseYear
        }
        content_en: content(country: US, language: "en") {
          title
        }
        offers(country: $country, platform: WEB) {
          monetizationType
          standardWebURL
          package {
            shortName
            clearName
          }
        }
      }
    }
  }
}
"""


def fetch_justwatch_streaming_offers(
    title_it: str,
    title_original: str = "",
    media_type: str = "movie",
    year: str = "",
) -> List[Dict]:
    """
    Query JustWatch Italy GraphQL API (100% free, no API key) to find which Italian streaming
    platforms currently include this movie or series in their subscription (FLATRATE / FREE / ADS).
    Strictly excludes rentals (RENT), purchases (BUY), and paid Prime add-on channels.
    """
    obj_type = "SHOW" if media_type == "series" else "MOVIE"
    queries = []
    for q in (title_it, title_original):
        q_clean = (q or "").strip()
        if q_clean and q_clean.lower() not in [x.lower() for x in queries]:
            queries.append(q_clean)
    if not queries:
        return []

    target_norms = set()
    for t in (title_it, title_original):
        for v in _candidate_conjunction_variants(t):
            target_norms.add(v)
        for al in get_aliases_for_titles(title_it, title_original):
            target_norms.add(al)

    target_year = int(str(year).strip()) if str(year).strip().isdigit() else 0

    best_node = None
    best_score = -1

    for q_str in queries[:2]:
        payload = {
            "query": _JW_GRAPHQL_QUERY,
            "variables": {
                "searchQuery": q_str,
                "country": "IT",
                "language": "it",
                "objectTypes": [obj_type],
            },
        }
        try:
            data = _http_post_json("https://apis.justwatch.com/graphql", payload, timeout=7)
        except Exception:
            continue

        edges = (((data or {}).get("data") or {}).get("popularTitles") or {}).get("edges") or []
        for idx, edge in enumerate(edges):
            node = edge.get("node") or {}
            c_it = node.get("content") or {}
            c_en = node.get("content_en") or {}
            jw_title_it = (c_it.get("title") or "").strip()
            jw_title_en = (c_en.get("title") or "").strip()
            jw_year = int(c_it.get("originalReleaseYear") or 0)

            node_norms = set()
            for jt in (jw_title_it, jw_title_en):
                for v in _candidate_conjunction_variants(jt):
                    node_norms.add(v)

            score = 0
            if target_norms & node_norms:
                score += 100
            else:
                # Check fuzzy or substring match
                ok_it, d_it = fuzzy_match_title(title_it, jw_title_it)
                ok_or, d_or = fuzzy_match_title(title_original or title_it, jw_title_en or jw_title_it)
                if (ok_it and d_it <= 1) or (ok_or and d_or <= 1):
                    score += 65

            if score == 0:
                continue

            if target_year and jw_year:
                year_diff = abs(target_year - jw_year)
                if year_diff == 0:
                    score += 40
                elif year_diff <= 1:
                    score += 25
                elif year_diff <= 2 and media_type == "series":
                    score += 10
                elif year_diff > 3:
                    score -= 60

            # Slight preference to higher ranked popular result when tied
            score -= idx * 2

            if score > best_score and score >= 50:
                best_score = score
                best_node = node

        if best_score >= 120:
            break

    if not best_node:
        return []

    seen_plat = set()
    providers: List[Dict] = []
    for off in best_node.get("offers") or []:
        mtype = (off.get("monetizationType") or "").upper()
        # Strictly included in subscription or free streaming (no RENT, no BUY)
        if mtype not in ("FLATRATE", "FREE", "ADS"):
            continue
        pkg = off.get("package") or {}
        short_name = (pkg.get("shortName") or "").lower()
        plat = JUSTWATCH_PACKAGE_MAP.get(short_name)
        if not plat:
            continue
        pid = plat["id"]
        if pid in seen_plat:
            continue
        seen_plat.add(pid)
        providers.append({
            "id": pid,
            "name": plat["name"],
            "monetization": mtype,
            "url": off.get("standardWebURL") or "",
        })

    # Sort providers in the canonical order defined in STREAMING_PLATFORMS
    plat_order = {p["id"]: idx for idx, p in enumerate(STREAMING_PLATFORMS)}
    providers.sort(key=lambda x: plat_order.get(x["id"], 99))
    return providers


def enrich_items_with_streaming(items: List[Dict], max_workers: int = 8) -> Dict[str, List[Dict]]:
    """
    Batch-resolve Italian streaming availability for a list of library/catalog items in parallel.
    Updates each item's `streaming_providers` in place and returns a lookup dict keyed by
    `{media_type}_{norm_title}` for static caching (`data/streaming_catalog.json`).
    """
    catalog_map: Dict[str, List[Dict]] = {}
    if not items:
        return catalog_map

    def _task(it: Dict) -> Tuple[Dict, List[Dict]]:
        t_it = (it.get("title_it") or it.get("title") or "").strip()
        t_or = (it.get("title_original") or t_it).strip()
        mtype = it.get("media_type") if it.get("media_type") in ("movie", "series") else "movie"
        yr = str(it.get("year") or "").strip()
        offers = fetch_justwatch_streaming_offers(t_it, t_or, mtype, yr)
        return it, offers

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as ex:
        futs = [ex.submit(_task, item) for item in items]
        for fut in concurrent.futures.as_completed(futs):
            try:
                it, offers = fut.result()
                it["streaming_providers"] = offers
                mtype = it.get("media_type") if it.get("media_type") in ("movie", "series") else "movie"
                for field in (it.get("title_it"), it.get("title_original")):
                    norm = normalize_title(field or "")
                    if norm:
                        catalog_map[f"{mtype}_{norm}"] = offers
                        c_norm = strip_conjunctions(norm)
                        if c_norm:
                            catalog_map[f"{mtype}_{c_norm}"] = offers
                for al in it.get("aliases") or []:
                    na = normalize_title(al)
                    if na:
                        catalog_map[f"{mtype}_{na}"] = offers
            except Exception:
                pass

    return catalog_map

