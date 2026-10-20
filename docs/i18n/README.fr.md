# GestureOS

[简体中文](README.zh-CN.md) · [English](../../README.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md)

**Transformez un pincement des doigts, une main ouverte ou un poing en interaction avec une scène de particules dans le navigateur.**

GestureOS est un petit terrain d'expérimentation destiné aux développeurs de programmation créative et à toute personne curieuse des interactions par caméra. Il associe le suivi des mains de MediaPipe à des effets visuels de particules et sépare les règles des gestes du rendu, pour vous permettre d'explorer à la fois l'effet et son fonctionnement.

Les images de la caméra restent dans le navigateur et ne sont pas téléversées par ce projet. La démo charge MediaPipe depuis un CDN à l'exécution ; le premier lancement nécessite donc un accès réseau.

[Essayer en local](#run-locally) · [Scénarios gestuels](#what-to-try) · [Dépannage](#troubleshooting) · [Contribuer](#help-improve-gestureos)

<a id="why-try-it"></a>

## Pourquoi l'essayer ?

Explorez les interactions par caméra sans construire une chaîne de suivi des mains de toutes pièces. GestureOS relie un petit classificateur de gestes inspectable à une scène de particules dans le navigateur, pour expérimenter l'interaction et comprendre les règles qui la régissent.

- Essayez trois états gestuels explicites : pincement, main ouverte et poing, avec un état de repli pour le suivi.
- Inspectez le classificateur indépendamment de la caméra et de la boucle de rendu.
- Gardez les images de la caméra dans votre navigateur, tout en sachant que les bibliothèques d'exécution sont toujours chargées depuis un CDN.

Il s'agit d'une scène expérimentale dans le navigateur, et non d'un système d'exploitation de remplacement ou d'un outil de contrôle d'autres applications de bureau. Le comportement des gestes dépend du placement de la caméra, de l'éclairage et de la visibilité de votre main.

<a id="what-to-try"></a>

## Que tester ?

| Scénario | Points à observer | Intérêt |
| --- | --- | --- |
| Passer d'une main ouverte à un poing | L'état détecté et la réaction correspondante des particules | Relier une action physique à une réponse visible dans le navigateur. |
| Rapprocher le pouce et l'index | La classification du pincement | Explorer un geste simple et explicite plutôt qu'un vocabulaire de commandes opaque. |
| Maintenir une pose près d'une limite de détection | Les changements d'état lorsque les distances entre repères varient | Comprendre l'importance de la distance à la caméra et du choix des seuils. |
| Modifier une règle du classificateur | Un test ciblé et la scène en direct | Développer le comportement de l'interaction sans le mêler à la boucle de rendu. |

Le classificateur utilise des seuils de distance entre repères, et non un modèle de gestes personnalisé entraîné. Ses seuils sont inspectables, mais cela ne démontre pas sa précision pour différents utilisateurs, caméras ou distances d'observation.

<a id="try-the-interaction"></a>

## Essayer l'interaction

Suivez les instructions d'[exécution en local](#run-locally), autorisez l'accès à la caméra, puis essayez une main ouverte, un poing et un pincement entre le pouce et l'index. Comparez l'état détecté à la réaction visible de la scène. Si le suivi est irrégulier, changez l'éclairage ou la distance avant d'y voir un résultat du classificateur.

Ce README ne contient pas encore de démonstration enregistrée avec une vraie caméra. Les étapes ci-dessus permettent d'inspecter l'application réelle ; elles ne prétendent pas que toutes les caméras ou tous les navigateurs ont été validés.

<a id="requirements"></a>

## Prérequis

- Node.js 20+ (le projet utilise actuellement Node 24 pour les vérifications locales)
- Un navigateur moderne avec accès à la caméra
- HTTPS ou `localhost` (exigence des API de caméra)

<a id="run-locally"></a>

## Exécution en local

1. Installez les dépendances :

```bash
npm install
```

2. Servez ce dossier avec un serveur statique local. Exemple :

```bash
npx http-server . -p 8080
```

3. Ouvrez `http://localhost:8080` et autorisez cette page à utiliser la caméra.

**Votre première vérification réussie :** la page affiche une interaction pilotée par la caméra, et le passage entre main ouverte, poing et pincement produit des changements observables d'état ou de scène. Si la page se charge mais que le suivi ne fonctionne pas, utilisez les étapes de dépannage ci-dessous ; le seul chargement de la page ne constitue pas un test de réception de la caméra.

La commande du serveur statique utilise `npx` et peut télécharger `http-server` s'il n'est pas déjà disponible. Les scripts MediaPipe chargés à l'exécution et les polices web utilisent aussi des hôtes externes ; le traitement local de la caméra ne signifie pas que le premier lancement est entièrement hors ligne.

<a id="quality-commands"></a>

## Commandes de qualité

- `npm run lint` : vérifications ESLint
- `npm run format:check` : vérification Prettier
- `npm test` : tests unitaires + vérifications d'intégrité
- `npm run check` : lint + formatage + tests

<a id="project-structure"></a>

## Structure du projet

- `index.html` : structure de l'application et disposition de l'interface
- `styles.css` : système visuel et animations
- `script.js` : boucle d'exécution, particules, gestes et cycle de vie de la caméra
- `gesture-config.js` : constantes d'exécution immuables
- `gesture-helpers.js` : fonctions utilitaires partagées
- `gesture-detector.js` : logique pure de classification des gestes
- `gesture-policies.js` : décisions de politique de qualité/caméra et correspondance des erreurs
- `tests/run-tests.mjs` : vérifications unitaires de la configuration, des utilitaires, du détecteur et des politiques
- `scripts/quality-check.mjs` : vérifications strictes de l'UTF-8 et de l'intégrité structurelle

<a id="troubleshooting"></a>

## Dépannage

- Si la caméra ne fonctionne pas, vérifiez les autorisations et fermez les autres applications qui l'utilisent.
- Si vous utilisez un hôte distant, utilisez HTTPS.
- Si les scripts du CDN ne se chargent pas, vérifiez l'accès réseau à `cdn.jsdelivr.net`.

<a id="common-questions"></a>

### Questions fréquentes

**Peut-il contrôler mon bureau ou d'autres applications ?** Non. L'interaction se limite à cette démo dans le navigateur.

**Puis-je ouvrir directement `index.html` ?** Utilisez plutôt le serveur local indiqué dans la documentation. Les API de caméra nécessitent un contexte sécurisé adapté, tel que `localhost` ou HTTPS.

**Pourquoi un geste change-t-il lorsque je me rapproche ?** La classification utilise des distances normalisées entre repères et des seuils fixes. La position de la caméra, la visibilité de la main et la pose peuvent influer sur le résultat ; c'est une limite intéressante à tester, pas la preuve d'un mode de contrôle universel.

**Dois-je partager une vidéo de la caméra pour signaler un bug ?** Non. Commencez par les versions du navigateur et du système d'exploitation, la pose, les conditions d'éclairage, l'état attendu et l'état observé, et si possible un test à partir de repères synthétiques.

<a id="repository-scope"></a>

## Périmètre du dépôt

Ce dépôt contient le code pour le navigateur, la logique déterministe de classification des gestes, les tests et les vérifications de qualité. Les binaires locaux, l'état de l'éditeur, les journaux, les dossiers de dépendances et les pages temporaires d'expérimentation sont volontairement exclus.

<a id="help-improve-gestureos"></a>

## Aider à améliorer GestureOS

Les contributions petites et ciblées sont les bienvenues. Les cas limites du classificateur, des erreurs d'autorisation de caméra plus claires, l'accessibilité au clavier et une documentation facilitant la reproduction d'une interaction constituent de bons points de départ.

1. Lisez la carte des modules ci-dessus et choisissez un comportement à améliorer.
2. Pour une modification du classificateur ou des politiques, ajoutez un cas ciblé dans `tests/run-tests.mjs`.
3. Exécutez `npm run check` et décrivez les vérifications de navigateur/caméra réellement effectuées.
4. Ouvrez une demande de fusion expliquant le problème observé, la modification et les limites restantes.

| Première contribution | Point de départ | Éléments à inclure dans la PR |
| --- | --- | --- |
| Un cas limite mal classé | `gesture-detector.js`, `tests/run-tests.mjs` | Les repères synthétiques et l'état attendu ; expliquez pourquoi la règle devrait changer. |
| Un échec de caméra plus explicite | `gesture-policies.js`, `script.js` | La condition d'échec, le message attendu et un test de non-régression de la politique. |
| Des instructions plus faciles à suivre | `index.html`, `README.md` | Une interaction ou une étape de configuration reproductible ; distinguez les vérifications sur appareil réel de la revue statique. |

Pour les modifications de rendu, gardez la logique de classification testable indépendamment. Pour les modifications liées à la caméra, incluez, si nécessaire, les cas de refus d'autorisation, de caméra indisponible et de nouvelle tentative.

Pour les changements d'interaction plus importants, ouvrez d'abord une [issue](https://github.com/son-gladyso/gestureos/issues) pour discuter du périmètre. Utilisez des entrées de test synthétiques lorsque c'est possible ; ne joignez pas l'enregistrement de la caméra d'une autre personne sans son autorisation.
