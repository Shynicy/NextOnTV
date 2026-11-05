import concurrent.futures
import html
import json
import re
import ssl
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Tuple

from epg_engine import normalize_title, strip_conjunctions, strip_leading_article

SSL_CTX = ssl._create_unverified_context()
USER_AGENT = "NextOnTV/1.0 (https://localhost; contact@localhost)"

# Comprehensive bilingual alias & saga catalog (Italian broadcast title <-> Original title)
ITALIAN_ORIGINAL_ALIASES: List[Dict[str, str]] = [
    # Harry Potter Complete 8-Movie Saga
    {"it": "Harry Potter e la pietra filosofale", "orig": "Harry Potter and the Sorcerer's Stone", "type": "movie", "year": "2001"},
    {"it": "Harry Potter e la camera dei segreti", "orig": "Harry Potter and the Chamber of Secrets", "type": "movie", "year": "2002"},
    {"it": "Harry Potter e il prigioniero di Azkaban", "orig": "Harry Potter and the Prisoner of Azkaban", "type": "movie", "year": "2004"},
    {"it": "Harry Potter e il calice di fuoco", "orig": "Harry Potter and the Goblet of Fire", "type": "movie", "year": "2005"},
    {"it": "Harry Potter e l'Ordine della Fenice", "orig": "Harry Potter and the Order of the Phoenix", "type": "movie", "year": "2007"},
    {"it": "Harry Potter e il principe mezzosangue", "orig": "Harry Potter and the Half-Blood Prince", "type": "movie", "year": "2009"},
    {"it": "Harry Potter e i Doni della Morte - Parte 1", "orig": "Harry Potter and the Deathly Hallows: Part 1", "type": "movie", "year": "2010"},
    {"it": "Harry Potter e i Doni della Morte - Parte 2", "orig": "Harry Potter and the Deathly Hallows: Part 2", "type": "movie", "year": "2011"},
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
    {"it": "Il Signore degli Anelli - La Compagnia dell'Anello", "orig": "The Lord of the Rings: The Fellowship of the Ring", "type": "movie", "year": "2001"},
    {"it": "Il Signore degli Anelli - Le due torri", "orig": "The Lord of the Rings: The Two Towers", "type": "movie", "year": "2002"},
    {"it": "Il Signore degli Anelli - Il ritorno del re", "orig": "The Lord of the Rings: The Return of the King", "type": "movie", "year": "2003"},
    {"it": "Lo Hobbit - Un viaggio inaspettato", "orig": "The Hobbit: An Unexpected Journey", "type": "movie", "year": "2012"},
    {"it": "Lo Hobbit - La desolazione di Smaug", "orig": "The Hobbit: The Desolation of Smaug", "type": "movie", "year": "2013"},
    {"it": "Lo Hobbit - La battaglia delle cinque armate", "orig": "The Hobbit: The Battle of the Five Armies", "type": "movie", "year": "2014"},
    # Ritorno al futuro
    {"it": "Ritorno al futuro", "orig": "Back to the Future", "type": "movie", "year": "1985"},
    {"it": "Ritorno al futuro - Parte II", "orig": "Back to the Future Part II", "type": "movie", "year": "1989"},
    {"it": "Ritorno al futuro - Parte III", "orig": "Back to the Future Part III", "type": "movie", "year": "1990"},
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
    {"it": "La maledizione della prima luna", "orig": "Pirates of the Caribbean: The Curse of the Black Pearl", "type": "movie", "year": "2003", "keywords": "pirati dei caraibi 1"},
    {"it": "Pirati dei Caraibi - La maledizione del forziere fantasma", "orig": "Pirates of the Caribbean: Dead Man's Chest", "type": "movie", "year": "2006"},
    {"it": "Pirati dei Caraibi - Ai confini del mondo", "orig": "Pirates of the Caribbean: At World's End", "type": "movie", "year": "2007"},
    {"it": "Pirati dei Caraibi - Oltre i confini del mare", "orig": "Pirates of the Caribbean: On Stranger Tides", "type": "movie", "year": "2011"},
    {"it": "Pirati dei Caraibi - La vendetta di Salazar", "orig": "Pirates of the Caribbean: Dead Men Tell No Tales", "type": "movie", "year": "2017"},
    # Altri Film Celebri (inclusi titoli con & / and / e)
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
    # Lupin III Film Celebri
    {"it": "Lupin e le profezie di Nostradamus", "orig": "Lupin III - Kutabare! Nostradamus", "type": "movie", "year": "1995", "aliases": ["le profezie di nostradamus", "profezie di nostradamus", "lupin nostradamus", "lupin iii le profezie di nostradamus", "lupin 3 le profezie di nostradamus"]},
    {"it": "Lupin III - Il castello di Cagliostro", "orig": "The Castle of Cagliostro", "type": "movie", "year": "1979", "aliases": ["il castello di cagliostro", "castello di cagliostro", "cagliostro"]},
    {"it": "Lupin III - La pietra della saggezza", "orig": "The Mystery of Mamo", "type": "movie", "year": "1978", "aliases": ["la pietra della saggezza", "pietra della saggezza"]},
    # Serie TV Celebri
    {"it": "Una mamma per amica", "orig": "Gilmore Girls", "type": "series", "year": "2000"},
    {"it": "L'ispettore Barnaby", "orig": "Midsomer Murders", "type": "series", "year": "1997"},
    {"it": "La signora in giallo", "orig": "Murder, She Wrote", "type": "series", "year": "1984"},
    {"it": "Il Trono di Spade", "orig": "Game of Thrones", "type": "series", "year": "2011"},
    {"it": "La casa di carta", "orig": "Money Heist", "type": "series", "year": "2017"},
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
            if (item.get("qid") or "") not in ("movie", "tvSeries", "tvMiniSeries", "tvMovie"):
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
        if imdb_id in it_lookup:
            title_it, it_desc = it_lookup[imdb_id]
        else:
            norm_o = strip_conjunctions(normalize_title(title_orig))
            for al in ITALIAN_ORIGINAL_ALIASES:
                if strip_conjunctions(normalize_title(al["orig"])) == norm_o:
                    title_it = al["it"]
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
            "year": year,
            "poster": poster,
            "genre": "Serie TV" if media_type == "series" else "Film",
            "description": " • ".join(desc_parts),
            "source": "imdb",
            "popularity_rank": item.get("rank"),
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

        for row in data[:8]:
            show = row.get("show") or {}
            maze_id = show.get("id")
            if not maze_id or maze_id in seen_ids:
                continue
            seen_ids.add(maze_id)

            name_orig = (show.get("name") or "").strip()
            name_it = name_orig
            norm_o = strip_conjunctions(normalize_title(name_orig))
            for al in ITALIAN_ORIGINAL_ALIASES:
                if strip_conjunctions(normalize_title(al["orig"])) == norm_o:
                    name_it = al["it"]
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
                "year": premiered,
                "poster": poster,
                "genre": genres,
                "description": summary[:320] + ("..." if len(summary) > 320 else ""),
                "source": "tvmaze",
                "popularity_weight": show.get("weight") or 0,
            })
    return results


def _search_wikipedia_generator(query: str) -> List[Dict]:
    """
    Query Italian Wikipedia Search Generator to find movie/series/anime titles
    where keywords appear in ANY position (beginning, middle, or end).
    """
    url = (
        f"https://it.wikipedia.org/w/api.php?action=query&generator=search"
        f"&gsrsearch={urllib.parse.quote(query)}&gsrlimit=12"
        f"&prop=pageprops|pageimages|extracts&exintro=1&explaintext=1&pithumbsize=400&format=json"
    )
    try:
        data = _http_get_json(url, timeout=5)
    except Exception:
        return []

    pages = (data.get("query") or {}).get("pages") or {}
    results = []
    for p in pages.values():
        raw_t = p.get("title") or ""
        extract = (p.get("extract") or "").lower()
        is_movie = any(k in extract for k in ["film", "pellicola", "lungometraggio", "anime", "regia di", "diretto da"])
        is_series = any(k in extract for k in ["serie televisiva", "serie tv", "telefilm", "fiction", "miniserie"])
        if not is_movie and not is_series:
            continue
        clean_t = re.sub(
            r"\s*\((?:film|serie\s+televisiva|miniserie|telefilm|anime|movie|franchise).*?\)\s*$",
            "",
            raw_t,
            flags=re.IGNORECASE,
        ).strip()
        y_match = re.search(r"\b(19\d\d|20\d\d)\b", p.get("extract") or "")
        thumb = (p.get("thumbnail") or {}).get("source") or ""
        qid = (p.get("pageprops") or {}).get("wikibase_item") or ""
        m_type = "series" if (is_series and not is_movie) else "movie"
        results.append({
            "external_id": f"wiki_{qid or p.get('pageid')}",
            "imdb_id": "",
            "tvmaze_id": None,
            "media_type": m_type,
            "title_it": clean_t,
            "title_original": clean_t,
            "year": y_match.group(1) if y_match else "",
            "poster": thumb,
            "genre": "Serie TV" if m_type == "series" else "Film",
            "description": (p.get("extract") or "")[:240],
            "source": "wikipedia_it",
            "popularity_rank": 50000,
        })
    return results


STOP_WORDS_SCORING = {
    "the", "il", "lo", "la", "l", "i", "gli", "le", "a", "an", "and", "e", "ed", "n",
    "di", "dei", "del", "della", "delle", "of", "in", "on", "per", "con", "su"
}

def _clean_tokens_scoring(text: str) -> Tuple[List[str], List[str]]:
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", (text or "").lower())
    tokens = [t for t in cleaned.split() if t]
    core = [t for t in tokens if t not in STOP_WORDS_SCORING]
    return tokens, core

def _word_match_scoring(qw: str, cw: str) -> bool:
    if qw == cw:
        return True
    if len(qw) >= 4 and len(cw) >= 4:
        if qw in cw or cw in qw:
            return True
        if damerau_levenshtein(qw, cw, max_dist=1) <= 1:
            return True
    return False

def compute_relevance_score(query: str, item: Dict) -> int:
    q_tokens, q_core = _clean_tokens_scoring(query)
    q_str = " ".join(q_tokens)
    q_core_str = " ".join(q_core)

    candidates = [item.get("title_it", ""), item.get("title_original", "")]
    if item.get("keywords"):
        candidates.extend(str(item["keywords"]).split())
    if item.get("aliases"):
        candidates.extend(item["aliases"])

    best_score = 0
    for cand in candidates:
        if not cand:
            continue
        c_tokens, c_core = _clean_tokens_scoring(cand)
        if not c_tokens:
            continue
        c_str = " ".join(c_tokens)
        c_core_str = " ".join(c_core)

        # 1. Punteggio Massimo Assoluto (1000 Punti): Corrispondenza Esatta sul titolo completo
        if q_str and q_str == c_str:
            best_score = max(best_score, 1000)
            continue

        # 2. Quasi Esatto (970 Punti): Corrispondenza Esatta sulle parole chiave (esclusi articoli)
        if q_core_str and q_core_str == c_core_str:
            best_score = max(best_score, 970)
            continue

        # 3. Frase Esatta Contenuta (900-940 Punti): La sequenza esatta cercata è presente nel titolo
        # (all'inizio, in mezzo o alla fine, es. "le profezie di nostradamus" in "Lupin e le profezie di Nostradamus")
        has_full_phrase = (q_str and q_str in c_str) or (q_core_str and q_core_str in c_core_str)
        if has_full_phrase:
            is_start = c_str.startswith(q_str) or (q_core_str and c_core_str.startswith(q_core_str))
            is_end = c_str.endswith(q_str) or (q_core_str and c_core_str.endswith(q_core_str))
            phrase_score = 940 if is_start else (920 if is_end else 900)
            extra_words = abs(len(c_core) - len(q_core))
            phrase_score = max(780, phrase_score - extra_words * 8)
            best_score = max(best_score, phrase_score)
            continue

        # 4. Tutte le parole core cercate sono presenti nel titolo (anche sparse)
        if q_core:
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

            coverage = matched_count / len(q_core)

            # Se tutte le parole sono presenti (100% delle parole chiave nel titolo)
            if coverage == 1.0:
                in_order = all(matched_indices[i] > matched_indices[i - 1] for i in range(1, len(matched_indices)))
                order_score = 840 if in_order else 760
                extra_words = abs(len(c_core) - len(q_core))
                order_score = max(650, order_score - extra_words * 10)
                best_score = max(best_score, order_score)
                continue

            # Se almeno la metà delle parole cercate è presente
            if coverage >= 0.5:
                extra_words = abs(len(c_core) - len(q_core))
                partial_score = round(coverage * 600) - extra_words * 15
                best_score = max(best_score, max(200, partial_score))
                continue

    if item.get("is_saga"):
        rank = item.get("saga_rank", 1)
        if best_score >= 950:
            pass  # Keep 1000 or 970
        elif best_score > 0:
            best_score = max(best_score, 900 - rank * 8)
        else:
            best_score = max(best_score, 850 - rank * 8)

    # Popularity & Prominence Bonus (dà una spinta ai titoli celebri senza mai superare la pertinenza delle parole cercate)
    if best_score > 0:
        pop_bonus = 0
        imdb_rank = item.get("popularity_rank")
        if imdb_rank is not None and isinstance(imdb_rank, (int, float)) and imdb_rank > 0:
            if imdb_rank <= 2500:
                pop_bonus = max(pop_bonus, 70)
            elif imdb_rank <= 15000:
                pop_bonus = max(pop_bonus, 45)
            elif imdb_rank <= 60000:
                pop_bonus = max(pop_bonus, 25)
            elif imdb_rank <= 150000:
                pop_bonus = max(pop_bonus, 10)

        tv_weight = item.get("popularity_weight")
        if tv_weight is not None and isinstance(tv_weight, (int, float)):
            if tv_weight >= 85:
                pop_bonus = max(pop_bonus, 60)
            elif tv_weight >= 70:
                pop_bonus = max(pop_bonus, 40)
            elif tv_weight >= 50:
                pop_bonus = max(pop_bonus, 20)

        best_score += pop_bonus

    return best_score


def search_catalog(query: str, epg_events: Optional[List[Dict]] = None) -> List[Dict]:
    """
    Search Movies & TV Series with 2-letter typo tolerance, space insensitivity,
    and '&' / 'and' / 'end' / 'e' equivalence across:
      1. Built-in Italian Sagas & Aliases (Harry Potter, Fast & Furious, LOTR, Pirates, etc.)
      2. Live 7-day Italian DTT EPG (exact & fuzzy titles airing on TV)
      3. IMDb + Wikidata Italian Title Resolver (all movies & series in Italian)
      4. TVMaze (TV series with full episode lists)
      5. Wikipedia/MediaWiki fuzzy spellchecker fallback for arbitrary titles with typos
    Ranked with smart relevance scoring prioritizing exact & near-exact matches.
    """
    q_norm = normalize_title(query)
    if not q_norm:
        return []

    expanded_queries = expand_query_variants(query, epg_events=epg_events)
    primary_q = expanded_queries[0] if expanded_queries else query
    extra_qs = expanded_queries[1:] if len(expanded_queries) > 1 else []

    combined: List[Dict] = []

    # 1. Check built-in bilingual sagas/aliases using fuzzy_match_title (<= 2 letters, no spaces, &/and/end/e)
    matched_sagas: List[Tuple[int, Dict]] = []
    for al in ITALIAN_ORIGINAL_ALIASES:
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

        if ok_it or ok_or or ok_kw:
            best_d = min(d_it if ok_it else 99, d_or if ok_or else 99, d_kw if ok_kw else 99)
            matched_sagas.append((best_d, {
                "external_id": f"alias_{normalize_title(al['orig']).replace(' ', '_')}",
                "imdb_id": "",
                "tvmaze_id": None,
                "media_type": al["type"],
                "title_it": al["it"],
                "title_original": al["orig"],
                "year": al.get("year") or "",
                "poster": "",
                "genre": "Serie TV" if al["type"] == "series" else "Film",
                "description": f"{'Serie TV' if al['type'] == 'series' else 'Film'}{' (' + al['year'] + ')' if al.get('year') else ''} • Titolo orig.: {al['orig']}",
                "source": "catalog_it",
                "is_saga": True,
                "saga_rank": al.get("saga_rank", 1),
                "aliases": al.get("aliases") or [],
            }))

    # Add matched sagas at the TOP so they are preserved and prioritized during deduplication
    matched_sagas.sort(key=lambda x: x[0])
    combined.extend(item for _, item in matched_sagas)

    # 2. Query IMDb+Wikidata, TVMaze, and Wikipedia in parallel (using expanded & typo-corrected queries)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        f_imdb = ex.submit(_search_imdb_with_italian_labels, primary_q, extra_qs)
        f_maze = ex.submit(_search_tvmaze, primary_q, extra_qs)
        f_wiki = ex.submit(_search_wikipedia_generator, query)
        try:
            combined.extend(f_imdb.result())
        except Exception:
            pass
        try:
            combined.extend(f_maze.result())
        except Exception:
            pass
        try:
            combined.extend(f_wiki.result())
        except Exception:
            pass

    # If external results are empty or didn't match well (e.g. typo on a non-saga title like 'interstelar' or 'stranger tings'),
    # run Wikipedia fuzzy spellcheck (~2) and query IMDb/TVMaze with the corrected title
    if not combined and not matched_sagas:
        wiki_corrections = _spellcheck_via_wikipedia(query)
        if wiki_corrections:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
                f_imdb2 = ex.submit(_search_imdb_with_italian_labels, wiki_corrections[0], wiki_corrections[1:])
                f_maze2 = ex.submit(_search_tvmaze, wiki_corrections[0], wiki_corrections[1:])
                try:
                    combined.extend(f_imdb2.result())
                except Exception:
                    pass
                try:
                    combined.extend(f_maze2.result())
                except Exception:
                    pass

    # 3. Search live 7-day Italian DTT EPG for titles currently airing on TV (exact + fuzzy <= 2 letters)
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
                    "year": "",
                    "poster": ev.get("poster") or "",
                    "genre": ev.get("genre") or ("Serie TV" if ev["media_type"] == "series" else "Film"),
                    "description": f"📡 In onda questa settimana su {ev['channel_name']} (Canale {ev['lcn']}) • " + (ev.get("description") or ""),
                    "source": "epg_dtt",
                })

    # Merge/deduplicate by (media_type, conjunction-stripped normalized title_it or title_original)
    merged: Dict[str, Dict] = {}
    key_aliases: Dict[str, str] = {}
    for item in combined:
        norm_it = strip_conjunctions(normalize_title(item["title_it"])) or normalize_title(item["title_it"])
        norm_or = strip_conjunctions(normalize_title(item["title_original"])) or normalize_title(item["title_original"])
        
        # Sagas are uniquely identified by their distinct chapter title and release year
        if item.get("is_saga"):
            primary_key = f"saga_{item['media_type']}_{norm_it}_{item.get('year', '')}"
        else:
            k_it = f"{item['media_type']}_{norm_it}"
            k_or = f"{item['media_type']}_{norm_or}"
            primary_key = key_aliases.get(k_it) or key_aliases.get(k_or)

            # Do not merge completely different movies with the same name if released in different decades (e.g. 1954 vs 2001)
            if primary_key and primary_key in merged:
                ex_year = str(merged[primary_key].get("year") or "").strip()
                item_year = str(item.get("year") or "").strip()
                if ex_year.isdigit() and item_year.isdigit() and abs(int(ex_year) - int(item_year)) > 10:
                    primary_key = f"{primary_key}_{item_year}"

        if not primary_key or primary_key not in merged:
            primary_key = primary_key or f"{item['media_type']}_{norm_it}"
            merged[primary_key] = item
            key_aliases[f"{item['media_type']}_{norm_it}"] = primary_key
            key_aliases[f"{item['media_type']}_{norm_or}"] = primary_key
        else:
            existing = merged[primary_key]
            # Prefer Italian title over English title
            if existing["title_it"] == existing["title_original"] and item["title_it"] != item["title_original"]:
                existing["title_it"] = item["title_it"]
            if not existing.get("poster") and item.get("poster"):
                existing["poster"] = item["poster"]
            if not existing.get("tvmaze_id") and item.get("tvmaze_id"):
                existing["tvmaze_id"] = item["tvmaze_id"]
            if not existing.get("imdb_id") and item.get("imdb_id"):
                existing["imdb_id"] = item["imdb_id"]
            if not existing.get("year") and item.get("year"):
                existing["year"] = item["year"]
            if len(item.get("description") or "") > len(existing.get("description") or ""):
                existing["description"] = item["description"]
            if item.get("is_saga"):
                existing["is_saga"] = True
                existing["saga_rank"] = item.get("saga_rank", 1)
            if not existing.get("popularity_rank") and item.get("popularity_rank"):
                existing["popularity_rank"] = item["popularity_rank"]
            if not existing.get("popularity_weight") and item.get("popularity_weight"):
                existing["popularity_weight"] = item["popularity_weight"]

    # 4. Score every merged result by relevance against user query
    scored_results: List[Tuple[int, Dict]] = []
    for item in merged.values():
        score = compute_relevance_score(query, item)
        # Keep all items with score > 0 (preserves exact matches, phrase matches, and niche/anime cult titles!)
        if score > 0:
            scored_results.append((score, item))

    # Sort descending by relevance score (exact/near-exact matches first!)
    scored_results.sort(key=lambda x: -x[0])

    return [item for _, item in scored_results][:25]


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
