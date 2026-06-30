DropTune v1.9 Album Database + Asset System

CO NOWE W v1.9:
- Albumy przeniesione do osobnego pliku database.js.
- Script.js sam tworzy rarity, value, Daily Shop, album progress i drop system na podstawie database.js.
- Dodana zakładka Album DB, gdzie widzisz ścieżki okładek i wszystkich preview mp3.
- Popup tracka ma lepszy Audio Preview 2.0: pokazuje dokładną ścieżkę mp3 i komunikat, jeśli pliku jeszcze nie ma.
- Okładki mają fallback: jeśli brakuje jpg, gra nie wygląda jak błąd, tylko pokazuje elegancki placeholder z tytułem albumu.
- README jest przygotowany pod szybkie dodawanie kolejnych albumów.

NAJWAŻNIEJSZE PLIKI:
- index.html
- style.css
- database.js   <-- tu dodajesz albumy i tracklisty
- script.js
- assets/covers/
- assets/previews/

DEV MODE:
Dopisz do linku:
?owner=1
np. https://goat69420-lol.github.io/DropTune/?owner=1

JAK DODAĆ NOWY ALBUM:
1. Otwórz database.js.
2. Skopiuj template z dołu pliku albo z zakładki Album DB w grze.
3. Dodaj nowy obiekt albumu do tablicy window.DROPTUNE_ALBUMS.
4. Każdy track dawaj w formacie:
   { id: "artist_album_track", title: "Nazwa tracka", rating: 8.5 }
5. rating null oznacza X / intro / skit.

JAK RATING ZMIENIA SIĘ W RARITY:
- X/null -> Common
- 0-5 -> Common
- 5.5-6.5 -> Uncommon
- 7-7.5 -> Rare
- 8-8.5 -> Epic
- 9-9.5 -> Legendary
- 10 -> Divine

JAK DODAĆ PRAWDZIWE OKŁADKI:
1. Wejdź w grze w zakładkę Album DB.
2. Przy każdym albumie masz dokładną ścieżkę typu:
   assets/covers/bedoes_kwiat.jpg
3. Pobierz legalnie okładkę albumu.
4. Zmień nazwę pliku dokładnie na tę z Album DB.
5. Wrzuć ją do assets/covers/ i podmień placeholder.
6. Wrzuć pliki na GitHub.

JAK DODAĆ 30-SEKUNDOWE PREVIEW MP3:
1. Wejdź w zakładkę Album DB albo popup tracka.
2. Skopiuj dokładną ścieżkę, np.:
   assets/previews/bedoes_kwiat_chlopaki_nie_placza.mp3
3. Przygotuj legalny 30-sekundowy plik mp3.
4. Nazwij go dokładnie tak samo.
5. Wrzuć do assets/previews/.
6. Odśwież grę. W popupie tracka player zacznie działać.

WAŻNE:
Nie wrzucaj pełnych cudzych piosenek bez praw. Najbezpieczniej używać własnych/legalnych 30-sekundowych preview.

PO UPDATE NA GITHUB:
Jeśli coś trzyma stare dane, zrób:
Settings -> Reset Game
