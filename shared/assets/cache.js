// Cache client léger, partagé entre les pages MARCHAND (nav.js/guard.js) et les
// pages ACHETEUR public (accueil.js/catalogue) - deux "types d'utilisateur"
// distincts, chacun avec ses propres clés de cache (préfixées, jamais mélangées).
//
// But (voir cahier des charges) : au premier chargement, chaque type de page
// récupère ses informations comme avant ; ensuite, en NAVIGUANT d'une page à
// l'autre du même type (ex. dashboard.html -> orders.html, ou accueil.html ->
// boutique.html), la donnée déjà connue est affichée INSTANTANÉMENT depuis ce
// cache local persistant, pendant qu'une requête réseau part en arrière-plan
// pour vérifier s'il y a du nouveau. Si la réponse
// diffère de ce qui était affiché, le rappel onDonnees est appelé une seconde
// fois avec la version fraîche.
const KADOSK_CACHE = (function () {
  const memoire = new Map();

  function lire(cle) {
    try {
      return memoire.has(cle) ? memoire.get(cle) : null;
    } catch (erreur) {
      return null;
    }
  }

  function ecrire(cle, valeur) {
    try {
      memoire.set(cle, valeur);
    } catch (erreur) {
      // Stockage indisponible (navigation privée, quota plein...) : le cache est
      // simplement désactivé, chaque page continue de charger normalement.
    }
  }

  function effacer(cle) {
    try {
      memoire.delete(cle);
    } catch (erreur) {
      // sans conséquence
    }
  }

  // Déduplique les requêtes concurrentes sur une même clé : si nav.js et
  // dashboard.js demandent tous les deux "dashboardStats" au chargement de
  // dashboard.html, une seule requête réseau part réellement - les deux
  // appelants reçoivent chacun leur callback (cache puis fraîche) normalement.
  const requetesEnCours = {};

  // chargeur() doit renvoyer une Promise (typiquement un appel KADOSK_API.xxx()).
  // onDonnees(valeur, depuisLeCache) est appelé :
  //   - immédiatement et de façon SYNCHRONE si une valeur est déjà en cache
  //     (depuisLeCache = true) ;
  //   - à nouveau dès que la requête réseau répond, SEULEMENT si la donnée a
  //     changé par rapport au cache (depuisLeCache = false), ou si rien n'était
  //     en cache.
  // Renvoie la Promise du chargeur (donnée fraîche, ou donnée en cache si le
  // réseau échoue et qu'un affichage a déjà pu être fait).
  function chargerAvecCache(cle, chargeur, onDonnees) {
    const enCache = lire(cle);
    const avaitDejaUneValeur = enCache !== null;

    if (avaitDejaUneValeur) {
      try {
        onDonnees(enCache, true);
      } catch (erreur) {
        console.error("KADOSK_CACHE : erreur dans onDonnees (valeur en cache) pour", cle, erreur);
      }
    }

    if (!requetesEnCours[cle]) {
      requetesEnCours[cle] = chargeur().finally(() => {
        delete requetesEnCours[cle];
      });
    }

    return requetesEnCours[cle]
      .then((fraiches) => {
        const identiqueAuCache = avaitDejaUneValeur && JSON.stringify(fraiches) === JSON.stringify(enCache);
        ecrire(cle, fraiches);
        if (!identiqueAuCache) {
          try {
            onDonnees(fraiches, false);
          } catch (erreur) {
            console.error("KADOSK_CACHE : erreur dans onDonnees (donnée fraîche) pour", cle, erreur);
          }
        }
        return fraiches;
      })
      .catch((erreur) => {
        if (!avaitDejaUneValeur) {
          throw erreur;
        }
        // Une valeur en cache a déjà été affichée à l'utilisateur - on avale
        // l'erreur réseau plutôt que de casser une page qui montre déjà quelque
        // chose de valide (juste potentiellement pas tout à fait à jour).
        console.error("KADOSK_CACHE : rafraîchissement en arrière-plan échoué pour", cle, erreur);
        return enCache;
      });
  }

  function clear() { memoire.clear(); }
  return { lire, ecrire, effacer, chargerAvecCache, clear };
})();

// Voir le commentaire équivalent dans assets/panier2.js : sans cette ligne,
// tous les `if (window.KADOSK_CACHE)` du code (accueil.js, catalogue, nav.js,
// dashboard.js, boutique2.js, categories.js, commercants.js...) échouaient
// silencieusement et le cache n'était jamais réellement utilisé (chaque page
// retombait systématiquement sur l'appel réseau direct, sans planter - donc
// invisible, juste plus lent qu'attendu).
window.KADOSK_CACHE = KADOSK_CACHE;
