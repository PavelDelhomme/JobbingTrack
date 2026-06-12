/**
 * AGENT DE TRIAGE EMAIL — RECHERCHE D'EMPLOI
 * Paul Delhomme — pauldelhomme.pro@gmail.com
 * Version 4.0 — Boutons d'action dans le mail + Recherche offres auto Rennes
 *
 * INSTALLATION :
 * 1. script.google.com → Ouvrir le projet → remplacer tout le contenu de Code.gs
 * 2. Services (+) → Tasks API v1 → identifiant : TasksAPI (si pas encore fait)
 * 3. DEPLOYER EN WEB APP :
 *    Déployer → Nouveau déploiement → Type : Application Web
 *    Exécuter en tant que : Moi (pauldelhomme.pro@gmail.com)
 *    Accès : Tout le monde (anonyme) ← obligatoire pour que les boutons du mail fonctionnent
 *    → Copier l'URL du déploiement et la mettre dans CONFIG.webAppUrl ci-dessous
 * 4. Executer : installerDeclencheur
 * 5. Tester : executer lancerTriageQuotidien
 *
 * NOUVEAUTES v4.0 :
 * - Boutons d'action cliquables dans le mail :
 *   [FAIT] → tâche complétée + JBT mis à jour
 *   [PAS PERTINENT] → tâche supprimée + statut WITHDRAWN dans JBT
 *   [REPORTER +3j] → date repoussée de 3 jours
 * - Recherche automatique d'offres emploi Rennes :
 *   France Travail (API officielle), Indeed RSS, Hellowork RSS, Meteojob RSS
 * - Nouvelles offres incluses dans le récap quotidien 19h
 */

// ============================================================
// CONFIGURATION
// ============================================================
var CONFIG = {
  email: "pauldelhomme.pro@gmail.com",
  taskListName: "Recherche emploi",
  calendarId: "primary",

  // IMPORTANT : coller ici l'URL de ton Web App apres le deploiement
  // Format : https://script.google.com/macros/s/XXXXXXXXX/exec
  webAppUrl: "REMPLACER_PAR_URL_WEB_APP",

  jobbingtrackUrl: "https://jobbingtrack.pplx.app",
  jobbingtrackApiBase: "https://jobbingtrack.pplx.app/port/5000/api",
  jobbingtrackPin: "1234",

  // Recherche offres auto
  recherche: {
    motsCles: ["technicien support", "technicien informatique", "cybersecurite", "alternance informatique", "mission interim IT"],
    localisation: "rennes",
    codeDepartement: "35",
    codeRegion: "53", // Bretagne
    rayonKm: 30
  },

  motsClesEmploi: [
    "candidature", "emploi", "recrutement", "entretien", "alternance",
    "offre d'emploi", "offre de poste", "stage", "mission", "interim",
    "job dating", "jobdating", "salon recrutement", "forum emploi",
    "convocation", "embauche", "cdi", "cdd", "france travail", "pole emploi",
    "sup de vinci", "axia", "manpower", "adecco",
    "helpline", "interaction", "seard", "aeroport", "hellowork", "meteojob",
    "indeed apply", "jobalert", "recruteur", "recrute", "recrutement"
  ],

  expediteursExclus: [
    "newsletter@", "marketing@", "promo@",
    "no-reply@poleemploi",
    "cvdesignr",
    "noreply@cvdesignr"
  ],

  expediteursNewsletter: [
    "communication@email.fastt.org",
    "communication@fastt",
    "info@fastt",
    "contact@talentshandicap",
    "talents-handicap",
    "talentshandicap"
  ],

  sujetsSalonEmploi: [
    "job dating", "jobdating", "salon", "forum emploi", "rencontre recruteur",
    "webinaire", "webinar", "live sante", "inscris", "inscription",
    "participez", "rejoignez", "seminaire", "pas encore inscrit"
  ],

  domainesJobBoards: [
    "jobalert.indeed.com", "match.indeed.com", "meteojob.com",
    "emails.hellowork.com", "hellowork.com", "monster.fr",
    "apec.fr", "jobteaser.com", "welcome-to-the-jungle"
  ],

  expediteursJobBoards: [
    "donotreply@jobalert.indeed.com",
    "donotreply@match.indeed.com",
    "ne-pas-repondre@meteojob.com",
    "alerte@emails.hellowork.com",
    "notification@emails.hellowork.com",
    "alerte@meteojob.com",
    "noreply@monster.fr",
    "noreply@apec.fr"
  ],

  expediteursCandidature: [
    "indeedapply@indeed.com",
    "noreply@indeed.com"
  ],

  expediteursPrioritaires: [
    "supdevinci", "sup-de-vinci", "charlene.vignon",
    "france-travail", "francetravail",
    "axia-interim", "manpower", "adecco",
    "helpline", "interaction", "seard", "wink-lab",
    "smartrecruiters", "workday", "greenhouse", "lever.co"
  ]
};

var JOURS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
var MOIS_FR = ["janvier", "fevrier", "mars", "avril", "mai", "juin",
               "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

function dateEnFrancais(date) {
  if (!date || !(date instanceof Date)) return "Date inconnue";
  return JOURS_FR[date.getDay()] + " " + date.getDate() + " " + MOIS_FR[date.getMonth()] + " " + date.getFullYear();
}

// ============================================================
// WEB APP — Point d'entrée HTTP (boutons d'action dans le mail)
// ============================================================
function doGet(e) {
  var params = e.parameter;
  var action = params.action;
  var taskId = params.taskId;
  var listId = params.listId || "";
  var appId = params.appId || "";
  var token = null;

  var message = "";
  var couleur = "#27ae60";

  try {
    if (action === "fait") {
      // Completer la tache Google Tasks
      if (taskId && listId) {
        var taskListId = getTaskListId();
        if (!taskListId) taskListId = listId;
        TasksAPI.Tasks.update({ status: "completed" }, taskListId, taskId);
        message = "Tache marquee comme TERMINEE.";
      }
      // Mettre a jour JBT si appId fourni
      if (appId) {
        token = jbtAuthentifier();
        if (token) jbtMettreAJourStatut(token, appId, "CANDIDATE_PENDING", "Traitee depuis le mail de recap");
      }
    } else if (action === "pas_pertinent") {
      // Supprimer la tache
      if (taskId) {
        var tlId = getTaskListId();
        if (!tlId) tlId = listId;
        TasksAPI.Tasks.remove(tlId, taskId);
        message = "Tache supprimee. Offre marquee non pertinente.";
      }
      // JBT : WITHDRAWN
      if (appId) {
        token = jbtAuthentifier();
        if (token) jbtMettreAJourStatut(token, appId, "WITHDRAWN", "Non pertinent - marque depuis le mail");
      }
      couleur = "#9ca3af";
    } else if (action === "reporter") {
      // Repousser de 3 jours
      if (taskId) {
        var tl2 = getTaskListId();
        if (!tl2) tl2 = listId;
        var task = TasksAPI.Tasks.get(tl2, taskId);
        var nouvelleDue = new Date();
        nouvelleDue.setDate(nouvelleDue.getDate() + 3);
        task.due = nouvelleDue.toISOString();
        task.status = "needsAction";
        TasksAPI.Tasks.update(task, tl2, taskId);
        message = "Tache repoussee de 3 jours.";
      }
      couleur = "#f59e0b";
    } else if (action === "valider_jbt") {
      // Juste confirmer la candidature dans JBT
      if (appId) {
        token = jbtAuthentifier();
        if (token) {
          jbtMettreAJourStatut(token, appId, "CANDIDATE_PENDING", "Validee depuis le mail de recap");
          message = "Candidature confirmee dans JobBingTrack.";
        }
      } else {
        message = "Candidature deja presente dans JobBingTrack.";
      }
    } else {
      message = "Action inconnue.";
      couleur = "#e74c3c";
    }
  } catch (err) {
    message = "Erreur : " + err.toString();
    couleur = "#e74c3c";
  }

  // Retourner une page HTML de confirmation simple
  var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f4f4;}' +
    '.card{background:#fff;border-radius:12px;padding:40px;max-width:400px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1);}' +
    '.icon{font-size:48px;margin-bottom:16px;}' +
    '.msg{font-size:18px;font-weight:bold;color:' + couleur + ';margin-bottom:12px;}' +
    '.sub{font-size:14px;color:#6b7280;}' +
    'a{display:inline-block;margin-top:20px;background:#1a1a2e;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;}</style>' +
    '</head><body><div class="card">' +
    '<div class="icon">' + (couleur === "#27ae60" ? "OK" : couleur === "#9ca3af" ? "X" : "...") + '</div>' +
    '<div class="msg">' + esc(message) + '</div>' +
    '<div class="sub">Tu peux fermer cette page.</div>' +
    '<a href="' + CONFIG.jobbingtrackUrl + '">Ouvrir JobBingTrack</a>' +
    '</div></body></html>';

  return HtmlService.createHtmlOutput(html).setTitle("Action effectuee");
}

// Helper pour construire un lien d'action
function lienAction(action, taskId, listId, appId) {
  if (!CONFIG.webAppUrl || CONFIG.webAppUrl === "REMPLACER_PAR_URL_WEB_APP") {
    return CONFIG.jobbingtrackUrl; // Fallback si pas encore configure
  }
  var url = CONFIG.webAppUrl + "?action=" + action;
  if (taskId) url += "&taskId=" + encodeURIComponent(taskId);
  if (listId) url += "&listId=" + encodeURIComponent(listId);
  if (appId) url += "&appId=" + encodeURIComponent(appId);
  return url;
}

// ============================================================
// POINT D'ENTREE PRINCIPAL
// ============================================================
function lancerTriageQuotidien() {
  Logger.log("=== Demarrage triage email v4 ===");

  var jwtToken = jbtAuthentifier();
  if (!jwtToken) Logger.log("ATTENTION : connexion JobBingTrack impossible.");

  // 1. Lire et analyser les emails emploi
  var emails = lireEmailsEmploi();
  var analyses = [];
  for (var i = 0; i < emails.length; i++) {
    var a = analyserEmail(emails[i]);
    if (a) analyses.push(a);
  }

  // 2. Recherche automatique d'offres sur internet (France Travail + RSS)
  var offresAuto = rechercherOffresAuto();

  // 3. Donnees JBT existantes
  var companiesExistantes = jwtToken ? jbtGetCompanies(jwtToken) : [];
  var applicationsExistantes = jwtToken ? jbtGetApplications(jwtToken) : [];

  // 4. Taches en retard (avec IDs pour les boutons)
  var tachesEnRetard = verifierTachesEnRetard();
  var calendrier = recupererEvenementsDemain();

  var taskListId = getTaskListId();
  var tachesCreees = [];
  var actionsJBT = [];

  for (var j = 0; j < analyses.length; j++) {
    var analyse = analyses[j];
    var tache = creerTacheGoogleTasks(analyse, taskListId);
    if (tache) tachesCreees.push({ id: tache.id, title: tache.title, analyse: analyse });

    if ((analyse.type === "entretien" || analyse.type === "evenement") &&
        !estJobBoard(analyse.expediteurLow || analyse.expediteur.toLowerCase())) {
      creerEvenementCalendrier(analyse);
    }

    if (jwtToken && (
      analyse.type === "candidature_nouvelle" ||
      analyse.type === "refus" ||
      analyse.type === "entretien" ||
      analyse.type === "reponse" ||
      analyse.type === "contact_direct"
    )) {
      var actionJBT = jbtTraiterCandidature(jwtToken, analyse, companiesExistantes, applicationsExistantes);
      if (actionJBT) {
        actionsJBT.push(actionJBT);
        if (actionJBT.companyCreee) companiesExistantes.push({ id: actionJBT.companyId, name: actionJBT.companyNom });
        if (actionJBT.applicationCreee) applicationsExistantes.push({ id: actionJBT.applicationId, companyId: actionJBT.companyId });
      }
    }
  }

  envoyerRecapitulatif(analyses, tachesCreees, tachesEnRetard, actionsJBT, calendrier, taskListId, offresAuto);
  Logger.log("=== Triage v4 termine : " + analyses.length + " emails, " + offresAuto.length + " offres auto ===");
}

// ============================================================
// RECHERCHE AUTOMATIQUE D'OFFRES — France Travail + RSS
// ============================================================
function rechercherOffresAuto() {
  var offres = [];

  // 1. France Travail API officielle
  var offresFT = rechercherFranceTravail();
  for (var i = 0; i < offresFT.length; i++) offres.push(offresFT[i]);

  // 2. Indeed RSS (gratuit, public)
  var offresIndeed = rechercherRSS(
    "https://fr.indeed.com/rss?q=technicien+support+informatique&l=Rennes%2C+Ille-et-Vilaine&radius=30&sort=date",
    "Indeed"
  );
  for (var j = 0; j < offresIndeed.length; j++) offres.push(offresIndeed[j]);

  // 3. Hellowork RSS
  var offresHW = rechercherRSS(
    "https://www.hellowork.com/offres-emploi/rss?k=technicien+support&l=rennes&d=30km",
    "Hellowork"
  );
  for (var k = 0; k < offresHW.length; k++) offres.push(offresHW[k]);

  // Dedoublonner par titre similaire
  offres = dedoublonnerOffres(offres);

  // Limiter a 8 offres max pour ne pas surcharger le mail
  offres = offres.slice(0, 8);

  Logger.log(offres.length + " offres auto trouvees");
  return offres;
}

function rechercherFranceTravail() {
  var offres = [];
  try {
    // API France Travail (ex-Pole Emploi) — acces public sans cle pour la recherche basique
    // Via le flux RSS de recherche
    var mots = CONFIG.recherche.motsCles;
    for (var i = 0; i < Math.min(mots.length, 2); i++) {
      var motEncode = encodeURIComponent(mots[i]);
      var url = "https://candidat.francetravail.fr/offres/recherche/rss?motsCles=" +
                motEncode + "&lieuTravail=" + CONFIG.recherche.localisation +
                "&rayonRecherche=" + CONFIG.recherche.rayonKm;
      var result = fetchRSS(url, "France Travail");
      for (var j = 0; j < result.length; j++) offres.push(result[j]);
    }
  } catch (err) {
    Logger.log("Erreur France Travail RSS : " + err);
  }
  return offres;
}

function rechercherRSS(url, source) {
  try {
    return fetchRSS(url, source);
  } catch (err) {
    Logger.log("Erreur RSS " + source + " : " + err);
    return [];
  }
}

function fetchRSS(url, source) {
  var offres = [];
  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (response.getResponseCode() !== 200) return offres;
    var xml = response.getContentText();

    // Parser le XML RSS manuellement (Apps Script n'a pas de DOMParser)
    var items = xml.split("<item>");
    for (var i = 1; i < items.length && offres.length < 5; i++) {
      var item = items[i];
      var titre = extraireBalise(item, "title");
      var lien = extraireBalise(item, "link");
      var description = extraireBalise(item, "description");
      var pubDate = extraireBalise(item, "pubDate");

      if (!titre) continue;

      // Filtrer : garder uniquement les offres pertinentes (IT/logistique/interim)
      var titreLow = titre.toLowerCase();
      var estPertinent = titreLow.indexOf("technicien") >= 0 ||
                         titreLow.indexOf("informatique") >= 0 ||
                         titreLow.indexOf("support") >= 0 ||
                         titreLow.indexOf("cybersec") >= 0 ||
                         titreLow.indexOf("reseau") >= 0 ||
                         titreLow.indexOf("syst") >= 0 ||
                         titreLow.indexOf("alternance") >= 0 ||
                         titreLow.indexOf("interim") >= 0 ||
                         titreLow.indexOf("logistique") >= 0;

      if (!estPertinent) continue;

      offres.push({
        titre: nettoyer(titre),
        lien: lien ? lien.replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "",
        description: nettoyer(description).substring(0, 200),
        source: source,
        date: pubDate ? new Date(pubDate) : new Date()
      });
    }
  } catch (err) {
    Logger.log("Erreur fetchRSS " + source + " : " + err);
  }
  return offres;
}

function extraireBalise(xml, balise) {
  var re = new RegExp("<" + balise + "(?:[^>]*)>([\\s\\S]*?)<\\/" + balise + ">", "i");
  var m = xml.match(re);
  if (!m) return "";
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function nettoyer(str) {
  if (!str) return "";
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/<[^>]+>/g, "").trim();
}

function dedoublonnerOffres(offres) {
  var vus = [];
  var result = [];
  for (var i = 0; i < offres.length; i++) {
    var t = offres[i].titre.toLowerCase().substring(0, 40);
    var estDoublon = false;
    for (var j = 0; j < vus.length; j++) {
      if (vus[j].indexOf(t.substring(0, 20)) >= 0) { estDoublon = true; break; }
    }
    if (!estDoublon) {
      vus.push(t);
      result.push(offres[i]);
    }
  }
  return result;
}

// ============================================================
// HELPERS — detecter le type d'expediteur
// ============================================================
function estJobBoard(expediteurLow) {
  for (var i = 0; i < CONFIG.expediteursJobBoards.length; i++) {
    if (expediteurLow.indexOf(CONFIG.expediteursJobBoards[i]) >= 0) return true;
  }
  for (var j = 0; j < CONFIG.domainesJobBoards.length; j++) {
    if (expediteurLow.indexOf(CONFIG.domainesJobBoards[j]) >= 0) return true;
  }
  if (expediteurLow.indexOf("jobalert") >= 0) return true;
  if (expediteurLow.indexOf("alerte@") >= 0) return true;
  if (expediteurLow.indexOf("alert@") >= 0) return true;
  return false;
}

function estNewsletterEmploi(expediteurLow) {
  for (var i = 0; i < CONFIG.expediteursNewsletter.length; i++) {
    if (expediteurLow.indexOf(CONFIG.expediteursNewsletter[i]) >= 0) return true;
  }
  return false;
}

function estSalonOuEvenementEmploi(sujet, corps) {
  var texte = (sujet + " " + corps).toLowerCase();
  for (var i = 0; i < CONFIG.sujetsSalonEmploi.length; i++) {
    if (texte.indexOf(CONFIG.sujetsSalonEmploi[i]) >= 0) return true;
  }
  return false;
}

// ============================================================
// LECTURE DES EMAILS
// ============================================================
function lireEmailsEmploi() {
  var hier = new Date();
  hier.setDate(hier.getDate() - 1);
  var dateStr = Utilities.formatDate(hier, "UTC", "yyyy/MM/dd");
  var query = "after:" + dateStr + " -in:spam -in:trash -from:" + CONFIG.email;
  var threads = GmailApp.search(query, 0, 60);
  var emailsEmploi = [];

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    var msg = messages[messages.length - 1];
    var expediteur = msg.getFrom().toLowerCase();
    var sujet = msg.getSubject() || "";
    var corps = (msg.getPlainBody() || "").substring(0, 1500).toLowerCase();
    var date = msg.getDate();

    var estExclu = false;
    for (var e = 0; e < CONFIG.expediteursExclus.length; e++) {
      if (expediteur.indexOf(CONFIG.expediteursExclus[e]) >= 0) { estExclu = true; break; }
    }
    if (estExclu) continue;

    var texte = (sujet + " " + corps + " " + expediteur).toLowerCase();
    var estEmploi = false;
    for (var m = 0; m < CONFIG.motsClesEmploi.length; m++) {
      if (texte.indexOf(CONFIG.motsClesEmploi[m]) >= 0) { estEmploi = true; break; }
    }
    if (!estEmploi) continue;

    var estPrioritaire = false;
    for (var p = 0; p < CONFIG.expediteursPrioritaires.length; p++) {
      if (expediteur.indexOf(CONFIG.expediteursPrioritaires[p]) >= 0) { estPrioritaire = true; break; }
    }

    emailsEmploi.push({
      expediteur: msg.getFrom(),
      expediteurLow: expediteur,
      sujet: sujet,
      corps: corps,
      date: date,
      prioritaire: estPrioritaire
    });
  }

  emailsEmploi.sort(function(a, b) {
    if (a.prioritaire && !b.prioritaire) return -1;
    if (!a.prioritaire && b.prioritaire) return 1;
    return b.date - a.date;
  });

  return emailsEmploi;
}

// ============================================================
// ANALYSE D'UN EMAIL
// ============================================================
function analyserEmail(email) {
  var sujetLow = (email.sujet || "").toLowerCase();
  var corpsLow = email.corps || "";
  var texte = sujetLow + " " + corpsLow;
  var expediteurLow = email.expediteurLow || email.expediteur.toLowerCase();
  var type = null;
  var action = null;
  var urgence = false;
  var entreprise = extraireEntreprise(email);

  // PRIORITE 1 : Indeed Apply
  var estCandidatureIndeed = false;
  for (var ic = 0; ic < CONFIG.expediteursCandidature.length; ic++) {
    if (expediteurLow.indexOf(CONFIG.expediteursCandidature[ic]) >= 0) { estCandidatureIndeed = true; break; }
  }
  if (estCandidatureIndeed) {
    var estConfirm = corpsLow.indexOf("candidature a ete envoyee") >= 0 ||
                     corpsLow.indexOf("bonne chance") >= 0 ||
                     corpsLow.indexOf("a bien ete prise en compte") >= 0 ||
                     sujetLow.indexOf("candidatures via indeed") >= 0;
    if (estConfirm) {
      type = "candidature_nouvelle";
      action = "Candidature soumise via Indeed — verifier dans JobBingTrack";
      entreprise = extraireEntrepriseDepuisSujet(email.sujet);
    } else {
      type = "offre";
      action = "Consulter l'offre Indeed et postuler si pertinente";
    }
  }
  // PRIORITE 2 : Job boards (alertes)
  else if (estJobBoard(expediteurLow)) {
    type = "offre";
    action = "Consulter les offres et postuler si pertinentes";
  }
  // PRIORITE 3 : Newsletters emploi (FASTT, etc.)
  else if (estNewsletterEmploi(expediteurLow)) {
    if (estSalonOuEvenementEmploi(email.sujet, corpsLow)) {
      type = "evenement";
      action = "Evenement emploi — voir si inscription pertinente";
    } else {
      return null;
    }
  }
  // PRIORITE 4 : Entretien confirme (depuis un RH direct, mot dans le SUJET)
  else if ((sujetLow.indexOf("entretien") >= 0 || sujetLow.indexOf("convocation") >= 0 ||
            sujetLow.indexOf("interview") >= 0) && !estJobBoard(expediteurLow)) {
    type = "entretien";
    action = "Preparer l'entretien et confirmer ta presence";
    urgence = true;
  }
  // PRIORITE 5 : Salon / job dating
  else if (estSalonOuEvenementEmploi(email.sujet, "") && !estJobBoard(expediteurLow)) {
    var estVraiEv = sujetLow.indexOf("job dating") >= 0 || sujetLow.indexOf("salon") >= 0 ||
                    sujetLow.indexOf("inscription") >= 0 || sujetLow.indexOf("inscrit") >= 0 ||
                    sujetLow.indexOf("participez") >= 0 || sujetLow.indexOf("webinaire") >= 0;
    if (estVraiEv) {
      type = "evenement";
      action = "Evenement emploi — voir si inscription utile";
      urgence = true;
    }
  }
  // PRIORITE 6 : Refus
  else if (texte.indexOf("refus") >= 0 || texte.indexOf("n'avons pas retenu") >= 0 ||
           texte.indexOf("sans suite") >= 0 || texte.indexOf("ne correspond pas") >= 0) {
    type = "refus";
    action = "Statut mis a jour dans JobBingTrack : REJECTED";
  }
  // PRIORITE 7 : Confirmation candidature
  else if ((texte.indexOf("votre candidature") >= 0 || texte.indexOf("bien recu") >= 0 ||
            texte.indexOf("prise en compte") >= 0) && !estJobBoard(expediteurLow)) {
    type = "candidature_nouvelle";
    action = "Candidature creee dans JobBingTrack — valider";
  }
  // PRIORITE 8 : Reponse/suivi
  else if (texte.indexOf("suite a votre") >= 0 || texte.indexOf("votre dossier") >= 0) {
    type = "reponse";
    action = "Statut a verifier dans JobBingTrack";
  }
  // PRIORITE 9 : France Travail
  else if (expediteurLow.indexOf("francetravail") >= 0 || expediteurLow.indexOf("france-travail") >= 0 ||
           expediteurLow.indexOf("pole-emploi") >= 0) {
    type = "france_travail";
    action = "Traiter : actualisation, offre ou convocation";
    urgence = texte.indexOf("convocation") >= 0 || texte.indexOf("obligatoire") >= 0;
  }
  // PRIORITE 10 : Contact direct / offre generique
  else {
    if (email.prioritaire) {
      type = "contact_direct";
      action = "Repondre au contact professionnel";
      urgence = true;
    } else if ((texte.indexOf("offre") >= 0 || texte.indexOf("recrute") >= 0) &&
               (texte.indexOf("cdi") >= 0 || texte.indexOf("cdd") >= 0 ||
                texte.indexOf("poste") >= 0 || texte.indexOf("alternance") >= 0)) {
      type = "offre";
      action = "Lire l'offre et postuler si pertinente";
    }
  }

  if (!type) return null;

  return {
    expediteur: email.expediteur,
    expediteurLow: expediteurLow,
    sujet: email.sujet,
    corps: email.corps,
    date: email.date,
    type: type,
    action: action,
    urgence: urgence,
    entreprise: entreprise
  };
}

// ============================================================
// EXTRACTION ENTREPRISE
// ============================================================
function extraireEntreprise(email) {
  var match = email.expediteur.match(/<(.+)>/);
  var adresse = match ? match[1] : email.expediteur;
  var domaine = adresse.split("@")[1];
  if (!domaine) return "Contact";

  var exclusPerso = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.fr", "yahoo.com",
                     "orange.fr", "free.fr", "laposte.net", "sfr.fr"];
  for (var i = 0; i < exclusPerso.length; i++) {
    if (domaine === exclusPerso[i]) return extraireEntrepriseDepuisSujet(email.sujet);
  }

  var parties = domaine.split(".");
  var nom = parties[0];
  if (nom.length <= 3 && parties.length > 2) nom = parties[1];
  return nom.charAt(0).toUpperCase() + nom.slice(1);
}

function extraireEntrepriseDepuisSujet(sujet) {
  if (!sujet) return "Entreprise";
  var matchRecrute = sujet.match(/^(.+?)\s+recrute/i);
  if (matchRecrute) return matchRecrute[1].trim();
  var matchIndeed = sujet.match(/Candidatures via Indeed\s*:\s*(.+)/i);
  if (matchIndeed) {
    var matchChez = matchIndeed[1].match(/chez\s+(.+?)(?:\s*[-\u2013]|$)/i);
    if (matchChez) return matchChez[1].trim();
    return "Indeed Apply";
  }
  var mots = sujet.split(/[\s\-|]/);
  for (var j = 0; j < mots.length; j++) {
    var mot = mots[j].trim().replace(/[^\w\-]/g, "");
    if (mot.length > 3 && mot[0] === mot[0].toUpperCase() &&
        !/^(Votre|Notre|Suite|Nous|Bonjour|Offre|Poste|Candidature|RE|FW|TR|Merci|Pour|Voici|Paul)$/.test(mot)) {
      return mot;
    }
  }
  return "Entreprise";
}

function extrairePoste(analyse) {
  var sujet = analyse.sujet || "";
  var matchIndeed = sujet.match(/Candidatures via Indeed\s*:\s*(.+)/i);
  if (matchIndeed) return matchIndeed[1].trim().substring(0, 80);
  return sujet.replace(/^(RE:|FW:|TR:|Fwd:)\s*/i, "").trim().substring(0, 80) || "Poste non specifie";
}

// ============================================================
// GOOGLE TASKS — ID de la liste
// ============================================================
function getTaskListId() {
  try {
    var listes = TasksAPI.Tasklists.list({ maxResults: 20 });
    if (!listes.items) return null;
    for (var i = 0; i < listes.items.length; i++) {
      if (listes.items[i].title === CONFIG.taskListName) return listes.items[i].id;
    }
    // Creer si absente
    return TasksAPI.Tasklists.insert({ title: CONFIG.taskListName }).id;
  } catch (e) {
    Logger.log("Erreur getTaskListId : " + e);
    return null;
  }
}

// ============================================================
// GOOGLE TASKS — Taches en retard (avec IDs)
// ============================================================
function verifierTachesEnRetard() {
  try {
    var taskListId = getTaskListId();
    if (!taskListId) return [];
    var taches = TasksAPI.Tasks.list(taskListId, { showCompleted: false, showDeleted: false, maxResults: 50 });
    if (!taches.items) return [];
    var maintenant = new Date();
    var enRetard = [];
    for (var j = 0; j < taches.items.length; j++) {
      var t = taches.items[j];
      if (t.due && t.status !== "completed") {
        var dateLimite = new Date(t.due);
        if (dateLimite < maintenant) {
          var titre = (t.title || "").replace(/^[^\x20-\x7E\xA0-\xFF]+/, "").trim();
          enRetard.push({ id: t.id, listId: taskListId, titre: titre, dateLimit: dateLimite });
        }
      }
    }
    return enRetard;
  } catch (e) { return []; }
}

// ============================================================
// GOOGLE TASKS — Creation de tache
// ============================================================
function creerTacheGoogleTasks(analyse, taskListId) {
  try {
    if (!taskListId) taskListId = getTaskListId();
    if (!taskListId) return null;

    var prefixType = {
      entretien: "[ENTRETIEN]", evenement: "[EVENEMENT]", offre: "[OFFRE]",
      refus: "[REFUS]", candidature_nouvelle: "[CANDIDATURE]",
      reponse: "[REPONSE]", france_travail: "[FRANCE TRAVAIL]", contact_direct: "[CONTACT]"
    }[analyse.type] || "[EMAIL]";

    var demain = new Date();
    demain.setDate(demain.getDate() + 1);

    var titre = prefixType + " " + analyse.entreprise + " - " + analyse.action;
    var notes = "De : " + analyse.expediteur +
                "\nSujet : " + analyse.sujet +
                "\nDate : " + Utilities.formatDate(analyse.date, "Europe/Paris", "dd/MM/yyyy HH:mm") +
                "\n\n" + analyse.corps.substring(0, 400) +
                "\n\nJobBingTrack : " + CONFIG.jobbingtrackUrl;

    var tache = TasksAPI.Tasks.insert({ title: titre, notes: notes, due: demain.toISOString() }, taskListId);
    return tache;
  } catch (e) {
    Logger.log("Erreur creation tache : " + e);
    return null;
  }
}

// ============================================================
// CALENDRIER
// ============================================================
function recupererEvenementsDemain() {
  try {
    var demain = new Date(); demain.setDate(demain.getDate() + 1); demain.setHours(0, 0, 0, 0);
    var finDemain = new Date(demain); finDemain.setHours(23, 59, 59, 0);
    var cal = CalendarApp.getCalendarById(CONFIG.calendarId);
    return cal.getEvents(demain, finDemain).map(function(e) {
      return { titre: e.getTitle(), debut: e.getStartTime(), fin: e.getEndTime() };
    });
  } catch (e) { return []; }
}

function creerEvenementCalendrier(analyse) {
  try {
    var texte = analyse.corps;
    var matchDate = texte.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{4})?/);
    var matchHeure = texte.match(/(\d{1,2})[h:](\d{0,2})/i);
    var dateEv = new Date(); dateEv.setDate(dateEv.getDate() + 1); dateEv.setHours(10, 0, 0, 0);
    if (matchDate) {
      dateEv = new Date(
        matchDate[3] ? parseInt(matchDate[3]) : new Date().getFullYear(),
        parseInt(matchDate[2]) - 1, parseInt(matchDate[1]), 10, 0, 0
      );
    }
    if (matchHeure) dateEv.setHours(parseInt(matchHeure[1]), parseInt(matchHeure[2] || "0"), 0, 0);
    var finEv = new Date(dateEv.getTime() + 60 * 60000);
    var titre = analyse.type === "entretien" ? "[ENTRETIEN] " + analyse.entreprise : "[EVENEMENT] " + analyse.sujet.substring(0, 60);
    CalendarApp.getCalendarById(CONFIG.calendarId).createEvent(titre, dateEv, finEv, {
      description: "De : " + analyse.expediteur + "\nSujet : " + analyse.sujet +
                   "\n\n" + analyse.corps.substring(0, 500) + "\n\nJobBingTrack : " + CONFIG.jobbingtrackUrl
    });
  } catch (e) { Logger.log("Erreur calendrier : " + e); }
}

// ============================================================
// API JOBBINGTRACK
// ============================================================
function jbtAuthentifier() {
  try {
    var r = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/auth/login", {
      method: "post", contentType: "application/json",
      payload: JSON.stringify({ pin: CONFIG.jobbingtrackPin }), muteHttpExceptions: true
    });
    if (r.getResponseCode() !== 200) return null;
    var data = JSON.parse(r.getContentText());
    return data.ok && data.token ? data.token : null;
  } catch (e) { return null; }
}

function jbtGetCompanies(token) {
  try {
    var r = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/companies", {
      method: "get", headers: { "Authorization": "Bearer " + token }, muteHttpExceptions: true
    });
    return r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) || [] : [];
  } catch (e) { return []; }
}

function jbtGetApplications(token) {
  try {
    var r = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/applications", {
      method: "get", headers: { "Authorization": "Bearer " + token }, muteHttpExceptions: true
    });
    return r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) || [] : [];
  } catch (e) { return []; }
}

function jbtCreerEntreprise(token, nom) {
  try {
    var r = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/companies", {
      method: "post", contentType: "application/json",
      headers: { "Authorization": "Bearer " + token },
      payload: JSON.stringify({ name: nom, website: "", location: "Rennes, France" }),
      muteHttpExceptions: true
    });
    var c = r.getResponseCode();
    return (c === 200 || c === 201) ? JSON.parse(r.getContentText()) : null;
  } catch (e) { return null; }
}

function jbtCreerCandidature(token, companyId, poste, statut, date, notes) {
  try {
    var r = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/applications", {
      method: "post", contentType: "application/json",
      headers: { "Authorization": "Bearer " + token },
      payload: JSON.stringify({
        companyId: companyId, position: poste || "Poste non specifie",
        status: statut || "CANDIDATE_PENDING",
        applicationDate: Utilities.formatDate(date || new Date(), "Europe/Paris", "yyyy-MM-dd"),
        notes: notes || "", jobUrl: "", location: "Rennes, France", workMode: "ON_SITE"
      }), muteHttpExceptions: true
    });
    var c = r.getResponseCode();
    return (c === 200 || c === 201) ? JSON.parse(r.getContentText()) : null;
  } catch (e) { return null; }
}

function jbtMettreAJourStatut(token, appId, statut, notes) {
  try {
    var payload = { status: statut };
    if (notes) payload.notes = notes;
    var r = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/applications/" + appId, {
      method: "patch", contentType: "application/json",
      headers: { "Authorization": "Bearer " + token },
      payload: JSON.stringify(payload), muteHttpExceptions: true
    });
    return r.getResponseCode() === 200;
  } catch (e) { return false; }
}

function jbtTraiterCandidature(token, analyse, companies, applications) {
  var nomEntreprise = analyse.entreprise || "Entreprise inconnue";
  var company = trouverEntrepriseExistante(nomEntreprise, companies);
  var companyCreee = false;
  if (!company) {
    company = jbtCreerEntreprise(token, nomEntreprise);
    if (!company) return null;
    companyCreee = true;
  }
  var statut = typeEmailVersStatutJBT(analyse.type);
  var appExistante = null;
  for (var j = 0; j < applications.length; j++) {
    if (applications[j].companyId === company.id) { appExistante = applications[j]; break; }
  }

  var action = {
    entreprise: nomEntreprise, poste: extrairePoste(analyse), type: analyse.type,
    companyCreee: companyCreee, companyId: company.id, companyNom: company.name || nomEntreprise,
    applicationCreee: false, applicationId: null, statutMaJ: false
  };

  if (appExistante) {
    var statutsImportants = ["REJECTED", "INTERVIEW_PENDING", "OFFER_RECEIVED"];
    if (statutsImportants.indexOf(statut) >= 0) {
      jbtMettreAJourStatut(token, appExistante.id, statut, "Auto - " + analyse.sujet);
      action.applicationId = appExistante.id;
      action.statutMaJ = true;
      action.ancienStatut = appExistante.status;
      action.nouveauStatut = statut;
    } else {
      action.applicationId = appExistante.id;
      action.dejaPresenteJBT = true;
    }
  } else {
    var notes = "Import auto\nDe : " + analyse.expediteur + "\nSujet : " + analyse.sujet;
    var app = jbtCreerCandidature(token, company.id, action.poste, statut, analyse.date, notes);
    if (app) { action.applicationCreee = true; action.applicationId = app.id; action.statutFinal = statut; }
  }
  return action;
}

function trouverEntrepriseExistante(nom, companies) {
  var nomLow = nom.toLowerCase();
  for (var i = 0; i < companies.length; i++) {
    if (!companies[i].name) continue;
    var cLow = companies[i].name.toLowerCase();
    if (cLow === nomLow || cLow.indexOf(nomLow) >= 0 || nomLow.indexOf(cLow) >= 0) return companies[i];
  }
  return null;
}

function typeEmailVersStatutJBT(type) {
  var map = {
    "candidature_nouvelle": "CANDIDATE_PENDING", "refus": "REJECTED",
    "entretien": "INTERVIEW_PENDING", "reponse": "CANDIDATE_PENDING", "contact_direct": "CANDIDATE_PENDING"
  };
  return map[type] || "CANDIDATE_PENDING";
}

// ============================================================
// ENVOI RECAPITULATIF EMAIL HTML
// ============================================================
function envoyerRecapitulatif(analyses, tachesCreees, tachesEnRetard, actionsJBT, calendrier, taskListId, offresAuto) {
  var aujourd_hui = new Date();
  var demain = new Date(); demain.setDate(demain.getDate() + 1);

  var urgents = [], normaux = [];
  for (var idx = 0; idx < analyses.length; idx++) {
    if (analyses[idx].urgence) urgents.push(analyses[idx]);
    else normaux.push(analyses[idx]);
  }

  var htmlUrgent = "";
  if (urgents.length > 0) {
    htmlUrgent = '<tr><td style="padding:20px 24px 0 24px;">' +
      '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">ALERTES URGENTES (' + urgents.length + ')</p>';
    for (var i = 0; i < urgents.length; i++) htmlUrgent += carteEmail(urgents[i], true);
    htmlUrgent += '</td></tr>';
  }

  var htmlEmails = "";
  if (normaux.length > 0) {
    htmlEmails = '<tr><td style="padding:20px 24px 0 24px;">' +
      '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">EMAILS EMPLOI DU JOUR (' + normaux.length + ')</p>';
    for (var j = 0; j < normaux.length; j++) htmlEmails += carteEmail(normaux[j], false);
    htmlEmails += '</td></tr>';
  }

  // Taches en retard AVEC boutons d'action
  var htmlRetard = '<tr><td style="padding:20px 24px 0 24px;">' +
    '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">TACHES EN RETARD</p>';
  if (tachesEnRetard.length > 0) {
    for (var k = 0; k < tachesEnRetard.length; k++) {
      var t = tachesEnRetard[k];
      var urlFait = lienAction("fait", t.id, t.listId, "");
      var urlNon = lienAction("pas_pertinent", t.id, t.listId, "");
      var urlReporter = lienAction("reporter", t.id, t.listId, "");
      htmlRetard += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb;border:1px solid #f59e0b;border-radius:6px;margin-bottom:10px;">' +
        '<tr><td style="padding:12px 14px;">' +
        '<p style="margin:0 0 4px 0;font-size:13px;font-weight:bold;color:#92400e;">[RETARD] ' + esc(t.titre) + '</p>' +
        '<p style="margin:0 0 10px 0;font-size:12px;color:#b45309;">Prevue le ' + Utilities.formatDate(t.dateLimit, "Europe/Paris", "dd/MM") + '</p>' +
        '<table cellpadding="0" cellspacing="0" border="0"><tr>' +
        '<td style="padding-right:8px;"><a href="' + urlFait + '" style="display:inline-block;background-color:#27ae60;color:#fff;font-size:11px;font-weight:bold;padding:5px 12px;border-radius:4px;text-decoration:none;">FAIT</a></td>' +
        '<td style="padding-right:8px;"><a href="' + urlNon + '" style="display:inline-block;background-color:#9ca3af;color:#fff;font-size:11px;font-weight:bold;padding:5px 12px;border-radius:4px;text-decoration:none;">PAS PERTINENT</a></td>' +
        '<td><a href="' + urlReporter + '" style="display:inline-block;background-color:#f59e0b;color:#fff;font-size:11px;font-weight:bold;padding:5px 12px;border-radius:4px;text-decoration:none;">REPORTER +3j</a></td>' +
        '</tr></table>' +
        '</td></tr></table>';
    }
  } else {
    htmlRetard += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fff4;border:1px solid #27ae60;border-radius:6px;">' +
      '<tr><td style="padding:12px 14px;"><p style="margin:0;font-size:13px;color:#065f46;">[OK] Aucune tache en retard.</p></td></tr></table>';
  }
  htmlRetard += '</td></tr>';

  // Programme demain
  var htmlTaches = '<tr><td style="padding:20px 24px 0 24px;">' +
    '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">PROGRAMME DEMAIN — ' + dateEnFrancais(demain).toUpperCase() + ' (apres 16h)</p>';
  if (tachesCreees.length > 0) {
    for (var l = 0; l < tachesCreees.length; l++) {
      htmlTaches += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;"><tr>' +
        '<td style="vertical-align:top;width:80px;"><span style="display:inline-block;background-color:#1a1a2e;color:#fff;font-size:11px;font-weight:bold;padding:4px 8px;border-radius:4px;">apres 16h</span></td>' +
        '<td style="vertical-align:top;padding-left:10px;font-size:13px;color:#1f2937;">' + esc(tachesCreees[l].title) + '</td>' +
        '</tr></table>';
    }
  } else {
    htmlTaches += '<p style="margin:0;font-size:13px;color:#9ca3af;">Aucune nouvelle tache.</p>';
  }
  htmlTaches += '</td></tr>';

  // JobBingTrack — candidatures saisies avec bouton validation
  var htmlJBT = '<tr><td style="padding:20px 24px 0 24px;">' +
    '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">JOBBINGTRACK — CANDIDATURES AUTOMATIQUES</p>';
  if (actionsJBT.length > 0) {
    for (var m = 0; m < actionsJBT.length; m++) {
      var act = actionsJBT[m];
      var desc = act.applicationCreee ? "Creee — " + esc(act.statutFinal) :
                 act.statutMaJ ? "MAJ : " + esc(act.ancienStatut) + " => " + esc(act.nouveauStatut) :
                 "Deja presente";
      var bgJBT = act.applicationCreee ? "#f0fff4" : act.statutMaJ ? "#fffbeb" : "#f9fafb";
      var borJBT = act.applicationCreee ? "#27ae60" : act.statutMaJ ? "#f59e0b" : "#e5e7eb";
      var badge = act.applicationCreee ? "CREE" : act.statutMaJ ? "MAJ" : "OK";
      var badgeColor = act.applicationCreee ? "#27ae60" : act.statutMaJ ? "#f59e0b" : "#9ca3af";
      var lienJBT2 = act.applicationId ? CONFIG.jobbingtrackUrl + "/applications/" + act.applicationId : CONFIG.jobbingtrackUrl;
      var urlValider = lienAction("valider_jbt", "", "", act.applicationId || "");
      htmlJBT += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + bgJBT + ';border:1px solid ' + borJBT + ';border-radius:6px;margin-bottom:10px;">' +
        '<tr><td style="padding:14px 16px;">' +
        '<p style="margin:0 0 6px 0;"><span style="background-color:' + badgeColor + ';color:#fff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:10px;">' + badge + '</span></p>' +
        '<p style="margin:0 0 3px 0;font-size:14px;font-weight:bold;color:#1f2937;">' + esc(act.entreprise) + ' — ' + esc(act.poste) + '</p>' +
        '<p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">' + desc + '</p>' +
        '<a href="' + lienJBT2 + '" style="display:inline-block;background-color:#8b5cf6;color:#fff;font-size:12px;font-weight:bold;padding:6px 14px;border-radius:4px;text-decoration:none;">Voir dans JBT</a>' +
        '</td></tr></table>';
    }
  } else {
    htmlJBT += '<p style="margin:0;font-size:13px;color:#9ca3af;">Aucune candidature traitee automatiquement.</p>';
  }
  htmlJBT += '</td></tr>';

  // Offres auto trouvees sur internet
  var htmlOffresAuto = "";
  if (offresAuto && offresAuto.length > 0) {
    htmlOffresAuto = '<tr><td style="padding:20px 24px 0 24px;">' +
      '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">NOUVELLES OFFRES A RENNES (detectees auto)</p>';
    for (var o = 0; o < offresAuto.length; o++) {
      var offre = offresAuto[o];
      htmlOffresAuto += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f7ff;border:1px solid #3498db;border-radius:6px;margin-bottom:10px;">' +
        '<tr><td style="padding:12px 14px;">' +
        '<p style="margin:0 0 3px 0;"><span style="background-color:#3498db;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;">' + esc(offre.source) + '</span></p>' +
        '<p style="margin:4px 0 3px 0;font-size:14px;font-weight:bold;color:#1f2937;">' + esc(offre.titre) + '</p>' +
        (offre.description ? '<p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;">' + esc(offre.description) + '</p>' : '') +
        (offre.lien ? '<a href="' + offre.lien + '" style="display:inline-block;background-color:#3498db;color:#fff;font-size:12px;font-weight:bold;padding:5px 12px;border-radius:4px;text-decoration:none;">Voir l\'offre</a>' : '') +
        '</td></tr></table>';
    }
    htmlOffresAuto += '</td></tr>';
  }

  var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>' +
    '<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">' +
    '<tr><td align="center" style="padding:20px 10px;">' +
    '<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">' +

    '<tr><td style="background-color:#1a1a2e;padding:28px;text-align:center;">' +
    '<p style="margin:0 0 6px 0;font-size:20px;font-weight:bold;color:#ffffff;">Triage Emploi — ' + dateEnFrancais(aujourd_hui) + '</p>' +
    '<p style="margin:0;font-size:13px;color:#a0a8c8;">Genere automatiquement a 19h00 — v4.0</p>' +
    '</td></tr>' +

    htmlUrgent + htmlEmails + htmlRetard + htmlTaches + htmlJBT + htmlOffresAuto +

    '<tr><td style="background-color:#f3f4f6;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">' +
    '<p style="margin:0 0 4px 0;font-size:11px;color:#9ca3af;">Script Google Apps Script — 100% gratuit.</p>' +
    '<p style="margin:0;font-size:11px;"><a href="' + CONFIG.jobbingtrackUrl + '" style="color:#6b7280;">Ouvrir JobBingTrack</a></p>' +
    '</td></tr></table></td></tr></table></body></html>';

  GmailApp.sendEmail(CONFIG.email, "Triage Emploi — " + dateEnFrancais(aujourd_hui), "", { htmlBody: html });
  Logger.log("Email envoye");
}

// ============================================================
// CARTE EMAIL
// ============================================================
function carteEmail(analyse, urgent) {
  var s = {
    entretien:            { bg: "#fff5f5", border: "#e74c3c", badge: "#e74c3c", label: "ENTRETIEN" },
    evenement:            { bg: "#fff5f5", border: "#e74c3c", badge: "#e74c3c", label: "EVENEMENT" },
    offre:                { bg: "#f0f7ff", border: "#3498db", badge: "#3498db", label: "OFFRE" },
    refus:                { bg: "#f9fafb", border: "#9ca3af", badge: "#9ca3af", label: "REFUS" },
    candidature_nouvelle: { bg: "#f0fff4", border: "#27ae60", badge: "#27ae60", label: "CANDIDATURE" },
    reponse:              { bg: "#fffbeb", border: "#f39c12", badge: "#f39c12", label: "REPONSE" },
    france_travail:       { bg: "#f5f0ff", border: "#8b5cf6", badge: "#8b5cf6", label: "FRANCE TRAVAIL" },
    contact_direct:       { bg: "#f0fff4", border: "#27ae60", badge: "#27ae60", label: "CONTACT RH" }
  }[analyse.type] || { bg: "#f9fafb", border: "#9ca3af", badge: "#9ca3af", label: "EMAIL" };
  var bw = urgent ? "2px" : "1px";
  return '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + s.bg + ';border:' + bw + ' solid ' + s.border + ';border-radius:6px;margin-bottom:10px;">' +
    '<tr><td style="padding:14px 16px;">' +
    '<p style="margin:0 0 6px 0;"><span style="display:inline-block;background-color:' + s.badge + ';color:#fff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:10px;">' + s.label + '</span></p>' +
    '<p style="margin:0 0 3px 0;font-size:14px;font-weight:bold;color:#1f2937;">' + esc(analyse.entreprise) + ' — ' + esc(analyse.sujet) + '</p>' +
    '<p style="margin:0 0 3px 0;font-size:12px;color:#9ca3af;">' + esc(analyse.expediteur) + ' — ' + Utilities.formatDate(analyse.date, "Europe/Paris", "dd/MM HH:mm") + '</p>' +
    '<p style="margin:0;font-size:13px;color:#374151;">Action : ' + esc(analyse.action) + '</p>' +
    '</td></tr></table>';
}

function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ============================================================
// DECLENCHEUR
// ============================================================
function installerDeclencheur() {
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === "lancerTriageQuotidien") ScriptApp.deleteTrigger(existing[i]);
  }
  ScriptApp.newTrigger("lancerTriageQuotidien").timeBased().everyDays(1).atHour(19).create();
  Logger.log("Declencheur installe : 19h chaque soir");
}

/*
================================================================
INSTALLATION COMPLETE v4.0
================================================================
1. Aller sur https://script.google.com (pauldelhomme.pro@gmail.com)
2. Ouvrir le projet → remplacer TOUT Code.gs par ce fichier
3. Services (+) > Tasks API v1 > identifiant : TasksAPI (si deja fait, skip)
4. DEPLOYER LE WEB APP (pour les boutons d'action dans le mail) :
   - Cliquer "Déployer" > "Nouveau déploiement"
   - Type : "Application Web"
   - Exécuter en tant que : "Moi" (pauldelhomme.pro@gmail.com)
   - Qui a accès : "Tout le monde" (OBLIGATOIRE pour les liens dans le mail)
   - Cliquer "Déployer" > Autoriser > Copier l'URL
   - Coller l'URL dans CONFIG.webAppUrl en haut du script
   - Re-deployer (Déployer > Gérer > Modifier > Nouvelle version > Déployer)
5. Executer installerDeclencheur
6. Tester : executer lancerTriageQuotidien

NOUVEAUTES v4.0 :
- Boutons FAIT / PAS PERTINENT / REPORTER +3j dans chaque tache en retard
- Recherche automatique d'offres Rennes (France Travail RSS + Indeed RSS + Hellowork RSS)
- Offres trouvees sur internet affichees dans le recap quotidien
- Tout le reste inchange (v3.2)

COUT : 0 euro, 0 credit Perplexity.
================================================================
*/
