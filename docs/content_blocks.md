# Bloki treści chatbota Brama

> Dokument dla zespołu. Definiuje, jakie elementy ("content blocks") chatbot dokleja do odpowiedzi.
> Źródło danych: `docs/bip_db/` (389 usług BIP Lublin).

## Koncepcja

Brama to chatbot. Użytkownik pisze pytanie, bot odpowiada tekstem **plus** gotowymi, klikalnymi blokami.
Każdy blok pochodzi wprost z pola w bazie — nie tworzymy treści, tylko ją prezentujemy.

Przykład rozmowy:

> **Użytkownik:** Jak wyrobić dowód osobisty?
>
> **Bot:** Aby wyrobić dowód, potrzebujesz: *(tekst)*
> - 📥 [Pobierz wniosek]
> - 💰 Opłata: 0 zł
> - 📍 ul. Wieniawska 14 [Mapa]
> - 📞 [Zadzwoń: 81 466 1002]
> - 📋 Dokumenty: zdjęcie, stary dowód

---

## Pełna tabela bloków

| # | Blok | Skąd z bazy | Jak wygląda | Kiedy pokazać |
|---|---|---|---|---|
| 1 | 🔢 Numer karty | `numer_karty` | Etykieta „MKZ-006" | Zawsze (źródło) |
| 2 | 🏢 Wydział | `komorka` | Plakietka z nazwą urzędu | Zawsze |
| 3 | 📋 Lista dokumentów | sekcje *Wymagane wnioski / załączniki / do wglądu* | Lista co przynieść | Zawsze |
| 4 | 📥 Pobierz formularz | `wnioski_do_pobrania` | Przycisk → pobiera plik | Gdy są pliki |
| 5 | 💰 Opłata | sekcja *Wymagane opłaty* | Plakietka „82 zł" / „bezpłatne" | Zawsze |
| 6 | ⏱️ Termin załatwienia | sekcja *Termin załatwienia* | Plakietka „do 30 dni" | Zawsze |
| 7 | 📅 Termin złożenia | sekcja *Termin złożenia* | Plakietka „do dnia…" | Gdy istnieje |
| 8 | 📍 Mapa | adres z *miejsce składania* | Przycisk → otwiera mapę | Gdy pytanie „gdzie" |
| 9 | 📞 Zadzwoń | telefon z *miejsce składania* | Przycisk → dzwoni | Zawsze (jeśli jest) |
| 10 | 🕐 Godziny urzędu | godziny z *miejsce składania* | Plakietka „pon 7:45–16:45" | Przy adresie |
| 11 | 📤 Miejsce odbioru | sekcja *Sposób i miejsce odbioru* | Adres + mapa | Gdy istnieje |
| 12 | ↩️ Tryb odwoławczy | sekcja *Tryb odwoławczy* | Blok składany | Na żądanie |
| 13 | ⚖️ Podstawa prawna | sekcja *Podstawa prawna* | Blok składany | Na żądanie |
| 14 | 🔒 Klauzula RODO | sekcja *Klauzula informacyjna* | Blok składany | Na żądanie |
| 15 | ℹ️ Informacje dodatkowe | sekcja *Informacje dodatkowe* | Tekst | Gdy istnieje |
| 16 | 🔄 Sprawy powiązane | sekcja *Czynności powiązane* | Przyciski → kolejne pytanie | Gdy istnieją |
| 17 | 🔗 Zobacz w BIP | `url` | Link do pełnej karty | Zawsze (stopka) |
| 18 | 🟢 Status karty | `status` | Plakietka / ostrzeżenie | Gdy nieobowiązująca |
| 19 | 🕒 Data aktualizacji | `aktualizacja` | Tekst „aktualne na: …" | Stopka |
| 20 | 💬 Ocena rozmowy | *nowe — zapis do bazy* | 👍/👎 + ⭐ + komentarz | Na koniec rozmowy |

## Grupy

- **🟦 Zawsze (akcja dla mieszkańca):** 1, 2, 3, 4, 5, 6, 9, 17
- **🟨 Warunkowo (zależnie od pytania):** 7, 8, 10, 11, 15, 16, 18, 19
- **🟩 Składane (formalności na żądanie):** 12, 13, 14
- **🟪 Specjalny (koniec rozmowy):** 20

---

## Blok 20 — Ocena rozmowy (szczegóły)

Pojawia się gdy rozmowa się kończy.

> **Czy pomogliśmy załatwić sprawę?**
> 👍 Tak  👎 Nie
> *(opcjonalnie)* ⭐ 1–5 + pole „Co możemy poprawić?"

Do zapisu przy ocenie:

| Pole | Po co |
|---|---|
| ocena (tak/nie lub 1–5) | statystyka jakości |
| `numer_karty` | która usługa słaba |
| pytanie użytkownika | co pytał |
| komentarz | konkretny feedback |
| data | trendy w czasie |

---

## Role (warianty prezentacji)

Dane te same — zmienia się **co** i **jak** pokazujemy.

| Rola | Co pokazać | Jak |
|---|---|---|
| Mieszkaniec | bloki akcji, formalności zwinięte | krótko, proste 👍/👎 |
| Urzędnik | wszystkie sekcje, numer karty na wierzchu | wyszukiwanie po numerze/wydziale, zgłaszanie błędów karty |
| Senior | minimum naraz, krok po kroku | duża czcionka/przyciski, głos, wyróżniony „Zadzwoń" |
| Osoba z niepełnosprawnością | te same dane + udogodnienia dostępu | patrz sekcja niżej |

---

## Dostępność (osoby z niepełnosprawnością)

Dwie warstwy: (A) jak osoba korzysta z chatbota, (B) co dodać z bazy.

### A) Udogodnienia interfejsu

| Udogodnienie | Dla kogo |
|---|---|
| Czytnik ekranu (poprawny HTML/ARIA, opisy przycisków) | niewidomi |
| Sterowanie głosem + odczyt odpowiedzi na głos | niewidomi, ruchowe |
| Wysoki kontrast + regulacja czcionki | słabowidzący |
| Duże cele dotykowe, obsługa klawiaturą / Tab | ruchowe |
| Prosty język (ETR) + tryb krok-po-kroku | poznawcze |
| Napisy / tekst zamiast samego dźwięku | niesłyszący |

### B) Bloki z bazy dla osób z niepełnosprawnością

W bazie jest **Miejski Zespół do Spraw Orzekania o Niepełnosprawności** (7 usług) oraz
**Karta Dużej Rodziny / Lubelska Karta Seniora**. Można dodać:

| Blok | Skąd | Po co |
|---|---|---|
| ♿ Skrót „Niepełnosprawność" | usługi wydziału orzekania | szybkie wejście w orzeczenia, karty parkingowe, świadczenia |
| 🅿️ Karta parkingowa / ulgi | odpowiednie karty usług | częsta potrzeba |
| 🏛️ Dostępność urzędu | brak w bazie — do uzupełnienia | winda / podjazd / pętla indukcyjna w danym urzędzie |

> Uwaga: informacji o dostępności samego budynku (winda, podjazd) **nie ma w bazie** —
> trzeba by dodać jako nowe pole przy adresie.

---

## Problemy danych do naprawy przed renderem

- `obszar` pusty dla 105/389 usług → słabsza nawigacja po kategoriach.
- Tekst sekcji bywa ucięty / urwany w połowie słowa → czyścić przed wyświetleniem.
- Formularze głównie `.odt` → rozważyć PDF lub podgląd.
- Telefon/e-mail ukryte w tekście → wyciągnąć do osobnego bloku kontaktu.
