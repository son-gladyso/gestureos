# GestureOS

[简体中文](README.zh-CN.md) · [English](../../README.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md)

**Verwandle eine Pinzettengeste, eine offene Hand oder eine Faust in eine Interaktion mit einer Partikelszene im Browser.**

GestureOS ist eine kleine experimentelle Spielwiese für Creative-Coding-Entwickler und alle, die sich für kamerabasierte Interaktion interessieren. Das Projekt verbindet die Handverfolgung von MediaPipe mit Partikel-VFX und trennt die Gestenregeln vom Rendering, damit du sowohl den Effekt als auch seine Funktionsweise erkunden kannst.

Kamerabilder bleiben im Browser und werden von diesem Projekt nicht hochgeladen. Die Demo lädt MediaPipe zur Laufzeit von einem CDN; der erste Start erfordert daher Netzwerkzugriff.

[Lokal ausprobieren](#run-locally) · [Gestenszenarien](#what-to-try) · [Fehlerbehebung](#troubleshooting) · [Mitentwickeln](#help-improve-gestureos)

<a id="why-try-it"></a>

## Warum ausprobieren?

Erkunde kamerabasierte Interaktion, ohne eine Pipeline zur Handverfolgung von Grund auf aufzubauen. GestureOS verbindet einen kleinen, nachvollziehbaren Gestenklassifikator mit einer Partikelszene im Browser, sodass du mit der Interaktion experimentieren und die zugrunde liegenden Regeln verstehen kannst.

- Probiere drei eindeutige Gestenzustände aus: Pinzettengeste, offene Hand und Faust, ergänzt um einen Fallback-Zustand für die Verfolgung.
- Untersuche den Klassifikator unabhängig von Kamera und Rendering-Schleife.
- Behalte die Kamerabilder in deinem Browser und beachte zugleich, dass Laufzeitbibliotheken weiterhin von einem CDN geladen werden.

Dies ist eine experimentelle Browserszene, kein Ersatzbetriebssystem und kein Werkzeug zur Steuerung anderer Desktop-Anwendungen. Das Gestenverhalten hängt von Kameraposition, Beleuchtung und der Sichtbarkeit deiner Hand ab.

<a id="what-to-try"></a>

## Was du ausprobieren kannst

| Szenario | Was du untersuchen solltest | Warum es wichtig ist |
| --- | --- | --- |
| Von einer offenen Hand zu einer Faust wechseln | Den erkannten Zustand und die entsprechende Partikelreaktion | Verknüpfe eine körperliche Aktion mit einer sichtbaren Reaktion im Browser. |
| Daumen und Zeigefinger zusammenführen | Die Klassifikation als Pinzettengeste | Erkunde eine kleine, eindeutige Geste statt eines undurchsichtigen Befehlssatzes. |
| Eine Haltung nahe einer Erkennungsgrenze halten | Zustandswechsel bei veränderten Abständen zwischen Landmarken | Verstehe, warum Kameraabstand und die Wahl der Schwellenwerte wichtig sind. |
| Eine Klassifikatorregel ändern | Einen gezielten Test und die Live-Szene | Entwickle das Interaktionsverhalten, ohne es mit der Rendering-Schleife zu vermischen. |

Der Klassifikator verwendet Schwellenwerte für Landmarkenabstände, kein eigens trainiertes Gestenmodell. Seine Schwellenwerte lassen sich untersuchen, doch das belegt keine Genauigkeit über verschiedene Nutzer, Kameras oder Aufnahmeabstände hinweg.

<a id="try-the-interaction"></a>

## Interaktion ausprobieren

Befolge [Lokal ausführen](#run-locally), erlaube den Kamerazugriff und probiere eine offene Hand, eine Faust sowie eine Pinzettengeste mit Daumen und Zeigefinger aus. Vergleiche den erkannten Zustand mit der sichtbaren Reaktion der Szene. Falls die Verfolgung unzuverlässig ist, ändere zunächst die Beleuchtung oder den Abstand, bevor du dies als Ergebnis des Klassifikators deutest.

Diese README enthält noch keine aufgezeichnete Demonstration mit einer echten Kamera. Mit den obigen Schritten kannst du die tatsächliche Anwendung untersuchen; sie behaupten nicht, dass jede Kamera oder jeder Browser validiert wurde.

<a id="requirements"></a>

## Voraussetzungen

- Node.js 20+ (das Projekt verwendet derzeit Node 24 für lokale Überprüfungen)
- Ein moderner Browser mit Kamerazugriff
- HTTPS oder `localhost` (von Kamera-APIs vorausgesetzt)

<a id="run-locally"></a>

## Lokal ausführen

1. Installiere die Abhängigkeiten:

```bash
npm install
```

2. Stelle diesen Ordner über einen lokalen statischen Server bereit. Beispiel:

```bash
npx http-server . -p 8080
```

3. Öffne `http://localhost:8080` und erlaube dieser Seite, die Kamera zu verwenden.

**Deine erste erfolgreiche Prüfung:** Die Seite zeigt eine kameragesteuerte Interaktion, und der Wechsel zwischen offener Hand, Faust und Pinzettengeste führt zu beobachtbaren Zustands- oder Szenenänderungen. Falls die Seite geladen wird, die Verfolgung aber nicht funktioniert, nutze die unten beschriebenen Schritte zur Fehlerbehebung. Eine geladene Seite allein ist noch kein Kamera-Abnahmetest.

Der Befehl für den statischen Server verwendet `npx` und lädt möglicherweise `http-server` herunter, wenn es noch nicht verfügbar ist. Auch die MediaPipe-Skripte zur Laufzeit und die Webfonts verwenden externe Hosts. Lokale Kameraverarbeitung bedeutet nicht, dass der erste Start vollständig offline erfolgt.

<a id="quality-commands"></a>

## Qualitätsprüfungen

- `npm run lint`: ESLint-Prüfungen
- `npm run format:check`: Prettier-Prüfung
- `npm test`: Unit-Tests + Integritätsprüfungen
- `npm run check`: Lint + Formatprüfung + Tests

<a id="project-structure"></a>

## Projektstruktur

- `index.html`: App-Grundgerüst und UI-Layout
- `styles.css`: visuelles System und Animationen
- `script.js`: Laufzeitschleife, Partikel, Gesten und Kamera-Lebenszyklus
- `gesture-config.js`: unveränderliche Laufzeitkonstanten
- `gesture-helpers.js`: gemeinsam genutzte Hilfsfunktionen
- `gesture-detector.js`: reine Logik zur Gestenklassifikation
- `gesture-policies.js`: Entscheidungen zu Qualitäts-/Kamerarichtlinien und Fehlerzuordnung
- `tests/run-tests.mjs`: Unit-Prüfungen für Konfiguration, Hilfsfunktionen, Detektor und Richtlinien
- `scripts/quality-check.mjs`: strenge UTF-8- und Strukturintegritätsprüfungen

<a id="troubleshooting"></a>

## Fehlerbehebung

- Falls die Kamera nicht funktioniert, prüfe die Berechtigungen und schließe andere Apps, die die Kamera verwenden.
- Bei Ausführung auf einem entfernten Host verwende HTTPS.
- Falls CDN-Skripte nicht geladen werden, prüfe den Netzwerkzugriff auf `cdn.jsdelivr.net`.

<a id="common-questions"></a>

### Häufige Fragen

**Kann es meinen Desktop oder andere Apps steuern?** Nein. Die Interaktion ist auf diese Browserdemo beschränkt.

**Kann ich `index.html` direkt öffnen?** Verwende stattdessen den dokumentierten lokalen Server. Kamera-APIs benötigen einen geeigneten sicheren Kontext wie `localhost` oder HTTPS.

**Warum ändert sich eine Geste, wenn ich näher komme?** Die Klassifikation verwendet normalisierte Landmarkenabstände und feste Schwellenwerte. Kameraposition, Sichtbarkeit der Hand und Haltung können das Ergebnis beeinflussen. Dies ist eine sinnvolle Grenze zum Testen, kein Beleg für ein universelles Steuerungssystem.

**Muss ich für einen Fehlerbericht Kameravideos teilen?** Nein. Beginne mit Browser-/Betriebssystemversionen, Haltung, Lichtverhältnissen, erwartetem und beobachtetem Zustand sowie nach Möglichkeit einem Test mit synthetischen Landmarken.

<a id="repository-scope"></a>

## Umfang des Repositorys

Dieses Repository enthält den Browser-Quellcode, deterministische Gestenklassifikationslogik, Tests und Qualitätsprüfungen. Lokale Binärdateien, Editor-Zustände, Protokolle, Abhängigkeitsordner und experimentelle Entwurfsseiten sind bewusst ausgeschlossen.

<a id="help-improve-gestureos"></a>

## GestureOS verbessern

Kleine, gezielte Beiträge sind willkommen. Gute Einstiegspunkte sind Grenzfälle des Klassifikators, verständlichere Fehler bei Kameraberechtigungen, Tastaturzugänglichkeit und Dokumentation, die anderen hilft, eine Interaktion nachzustellen.

1. Lies die obige Modulübersicht und wähle ein Verhalten aus, das du verbessern möchtest.
2. Ergänze bei Änderungen am Klassifikator oder an Richtlinien einen gezielten Fall in `tests/run-tests.mjs`.
3. Führe `npm run check` aus und beschreibe, welche Browser-/Kameraprüfungen du tatsächlich vorgenommen hast.
4. Öffne einen Pull Request, der das beobachtete Problem, die Änderung und verbleibende Einschränkungen erklärt.

| Erster Beitrag | Hier beginnen | Inhalt des PRs |
| --- | --- | --- |
| Ein falsch klassifizierter Grenzfall | `gesture-detector.js`, `tests/run-tests.mjs` | Synthetische Landmarken und der erwartete Zustand; erläutere, warum die Regel geändert werden sollte. |
| Ein verständlicherer Kamerafehler | `gesture-policies.js`, `script.js` | Fehlerbedingung, erwartete Meldung und Regressionstest für die Richtlinie. |
| Leichter verständliche Anleitungen | `index.html`, `README.md` | Eine reproduzierbare Interaktion oder ein Einrichtungsschritt; unterscheide tatsächliche Geräteprüfungen von statischer Durchsicht. |

Halte bei Rendering-Änderungen die Klassifikationslogik unabhängig testbar. Berücksichtige bei Kameraänderungen gegebenenfalls verweigerte Berechtigungen, nicht verfügbare Kameras und das Verhalten bei erneuten Versuchen.

Öffne bei größeren Interaktionsänderungen zuerst ein [Issue](https://github.com/son-gladyso/gestureos/issues), um den Umfang zu besprechen. Verwende möglichst synthetische Testeingaben; hänge keine Kameraaufnahmen anderer Personen ohne deren Erlaubnis an.
