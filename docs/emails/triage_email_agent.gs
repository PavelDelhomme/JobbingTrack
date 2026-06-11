/**
 * AGENT DE TRIAGE EMAIL — RECHERCHE D'EMPLOI
 * Paul Delhomme — pauldelhomme.pro@gmail.com
 * Version 3.1 — Correctifs + integration API JobBingTrack (creation auto, validation par lien)
 *
 * INSTALLATION :
 * 1. script.google.com → Ouvrir le projet existant → remplacer tout le contenu de Code.gs
 * 2. Services (+) → Tasks API v1 → identifiant : TasksAPI (si pas encore fait)
 * 3. Executer : installerDeclencheur (accepter toutes les permissions)
 * 4. Tester : executer lancerTriageQuotidien
 *
 * CORRECTIFS v3.1 :
 * - Fix categorisation INFO : l'analyse est passee correctement a carteEmail
 * - Fix action vide : affichage de l'action issue de l'analyse
 * - Fix boucle : exclusion de l'adresse email de l'expediteur propre (pauldelhomme.pro@gmail.com)
 * - Fix emojis taches en retard : les vieilles taches conservent leur nom, les nouvelles sont propres
 * - NOUVEAU : le script cree lui-meme les candidatures dans JobBingTrack
 * - NOUVEAU : lien direct vers la candidature creee pour validation en un clic
 */

// ============================================================
// CONFIGURATION — modifier ici si besoin
// ============================================================
var CONFIG = {
  email: "pauldelhomme.pro@gmail.com",
  taskListName: "Recherche emploi",
  calendarId: "primary",
  heureDebutTaches: 16,

  jobbingtrackUrl: "https://jobbingtrack.pplx.app",
  jobbingtrackApiBase: "https://jobbingtrack.pplx.app/port/5000/api",
  jobbingtrackPin: "1234",

  motsClesEmploi: [
    "candidature", "emploi", "recrutement", "entretien", "alternance",
    "offre d'emploi", "offre de poste", "stage", "mission", "interim",
    "job dating", "jobdating", "salon recrutement", "forum emploi",
    "convocation", "embauche", "cdi", "cdd", "france travail", "pole emploi",
    "sup de vinci", "fastt", "agence interim", "axia", "manpower", "adecco",
    "helpline", "interaction", "seard", "aeroport", "hellowork", "meteojob",
    "indeed apply", "jobalert", "recruteur", "recrute", "recrutement"
  ],

  // Expediteurs toujours exclus (newsletters pures)
  expediteursExclus: [
    "newsletter@", "marketing@", "promo@",
    "no-reply@poleemploi"
  ],

  // Expediteurs Indeed/job boards : traites comme [OFFRE] sauf si c'est "Indeed Apply" (= candidature)
  expediteursJobBoards: [
    "donotreply@jobalert.indeed.com",
    "donotreply@match.indeed.com",
    "ne-pas-repondre@meteojob.com",
    "alerte@emails.hellowork.com",
    "notification@emails.hellowork.com"
  ],

  // Expediteurs qui indiquent une candidature soumise
  expediteursCandidature: [
    "indeedapply@indeed.com",
    "noreply@indeed.com"
  ],

  expediteursPrioritaires: [
    "supdevinci", "sup-de-vinci", "charlene.vignon",
    "france-travail", "francetravail",
    "axia-interim", "manpower", "adecco", "fastt",
    "helpline", "interaction", "seard", "wink-lab"
  ]
};

var JOURS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
var MOIS_FR = ["janvier", "fevrier", "mars", "avril", "mai", "juin",
               "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

function dateEnFrancais(date) {
  return JOURS_FR[date.getDay()] + " " + date.getDate() + " " + MOIS_FR[date.getMonth()] + " " + date.getFullYear();
}

// ============================================================
// POINT D'ENTREE PRINCIPAL
// ============================================================
function lancerTriageQuotidien() {
  Logger.log("=== Demarrage triage email ===");

  // 1. Authentification JobBingTrack
  var jwtToken = jbtAuthentifier();
  if (!jwtToken) {
    Logger.log("ATTENTION : connexion JobBingTrack impossible, les candidatures ne seront pas creees.");
  }

  // 2. Lire les emails emploi des 24h
  var emails = lireEmailsEmploi();

  // 3. Analyser chaque email (une seule fois, resultat reutilise partout)
  var analyses = [];
  for (var i = 0; i < emails.length; i++) {
    var a = analyserEmail(emails[i]);
    if (a) analyses.push(a);
  }

  // 4. Recup donnees JBT existantes
  var companiesExistantes = jwtToken ? jbtGetCompanies(jwtToken) : [];
  var applicationsExistantes = jwtToken ? jbtGetApplications(jwtToken) : [];

  // 5. Verifier taches en retard et evenements de demain
  var tachesEnRetard = verifierTachesEnRetard();
  var calendrier = recupererEvenementsDemain();

  var tachesCreees = [];
  var actionsJBT = [];

  for (var j = 0; j < analyses.length; j++) {
    var analyse = analyses[j];

    // Creer la tache Google Tasks
    var tache = creerTacheGoogleTasks(analyse);
    if (tache) tachesCreees.push({ title: tache.title, analyse: analyse });

    // Creer evenement calendrier si entretien ou evenement emploi
    if (analyse.type === "entretien" || analyse.type === "evenement") {
      creerEvenementCalendrier(analyse);
    }

    // Integrer dans JobBingTrack pour les emails candidature/suivi
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
        if (actionJBT.companyCreee) {
          companiesExistantes.push({ id: actionJBT.companyId, name: actionJBT.companyNom });
        }
        if (actionJBT.applicationCreee) {
          applicationsExistantes.push({ id: actionJBT.applicationId, companyId: actionJBT.companyId });
        }
      }
    }
  }

  // 6. Envoyer le recapitulatif
  envoyerRecapitulatif(analyses, tachesCreees, tachesEnRetard, actionsJBT, calendrier);

  Logger.log("=== Triage termine : " + analyses.length + " emails, " + tachesCreees.length + " taches, " + actionsJBT.length + " actions JBT ===");
}

// ============================================================
// LECTURE DES EMAILS DES 24 DERNIERES HEURES
// ============================================================
function lireEmailsEmploi() {
  var hier = new Date();
  hier.setDate(hier.getDate() - 1);
  var dateStr = Utilities.formatDate(hier, "UTC", "yyyy/MM/dd");

  // Exclure directement les emails envoyes par soi-meme (recaps precedents)
  var query = "after:" + dateStr + " -in:spam -in:trash -from:" + CONFIG.email;
  var threads = GmailApp.search(query, 0, 60);

  var emailsEmploi = [];

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    var msg = messages[messages.length - 1];

    var expediteur = msg.getFrom().toLowerCase();
    var sujet = msg.getSubject() || "";
    var corpsRaw = msg.getPlainBody() || "";
    var corps = corpsRaw.substring(0, 1500).toLowerCase();
    var date = msg.getDate();

    // Exclure newsletters pures
    var estExclu = false;
    for (var e = 0; e < CONFIG.expediteursExclus.length; e++) {
      if (expediteur.indexOf(CONFIG.expediteursExclus[e]) >= 0) {
        estExclu = true;
        break;
      }
    }
    if (estExclu) continue;

    // Verifier si c'est un email emploi
    var texte = (sujet + " " + corps + " " + expediteur).toLowerCase();
    var estEmploi = false;
    for (var m = 0; m < CONFIG.motsClesEmploi.length; m++) {
      if (texte.indexOf(CONFIG.motsClesEmploi[m]) >= 0) {
        estEmploi = true;
        break;
      }
    }
    if (!estEmploi) continue;

    // Prioritaire ?
    var estPrioritaire = false;
    for (var p = 0; p < CONFIG.expediteursPrioritaires.length; p++) {
      if (expediteur.indexOf(CONFIG.expediteursPrioritaires[p]) >= 0) {
        estPrioritaire = true;
        break;
      }
    }

    emailsEmploi.push({
      expediteur: msg.getFrom(),
      expediteurLow: expediteur,
      sujet: sujet,
      corps: corps,
      corpsRaw: corpsRaw,
      date: date,
      prioritaire: estPrioritaire
    });
  }

  // Trier prioritaires en premier, puis par date decroissante
  emailsEmploi.sort(function(a, b) {
    if (a.prioritaire && !b.prioritaire) return -1;
    if (!a.prioritaire && b.prioritaire) return 1;
    return b.date - a.date;
  });

  Logger.log(emailsEmploi.length + " emails emploi detectes");
  return emailsEmploi;
}

// ============================================================
// ANALYSE D'UN EMAIL — retourne objet analyse ou null
// ============================================================
function analyserEmail(email) {
  var texte = (email.sujet + " " + email.corps).toLowerCase();
  var expediteurLow = email.expediteurLow || email.expediteur.toLowerCase();
  var type = null;
  var action = null;
  var urgence = false;
  var entreprise = extraireEntreprise(email);

  // --- Cas Indeed Apply : candidature soumise ---
  var estCandidatureIndeed = false;
  for (var ic = 0; ic < CONFIG.expediteursCandidature.length; ic++) {
    if (expediteurLow.indexOf(CONFIG.expediteursCandidature[ic]) >= 0) {
      estCandidatureIndeed = true;
      break;
    }
  }
  if (estCandidatureIndeed) {
    type = "candidature_nouvelle";
    action = "Candidature soumise via Indeed — creee dans JobBingTrack";
    entreprise = extraireEntrepriseDepuisSujet(email.sujet);
  }

  // --- Entretien / convocation ---
  else if (texte.indexOf("entretien") >= 0 || texte.indexOf("convocation") >= 0 ||
           texte.indexOf("rendez-vous") >= 0 || texte.indexOf("interview") >= 0) {
    type = "entretien";
    action = "Preparer l'entretien et confirmer ta presence";
    urgence = true;
  }

  // --- Job dating / evenement emploi ---
  else if (texte.indexOf("job dating") >= 0 || texte.indexOf("jobdating") >= 0 ||
           texte.indexOf("forum emploi") >= 0 || texte.indexOf("salon recrutement") >= 0) {
    type = "evenement";
    action = "S'inscrire a l'evenement";
    urgence = true;
  }

  // --- Refus ---
  else if (texte.indexOf("refus") >= 0 || texte.indexOf("n'avons pas retenu") >= 0 ||
           texte.indexOf("sans suite") >= 0 || texte.indexOf("ne correspond pas") >= 0 ||
           texte.indexOf("nous ne pouvons pas donner") >= 0 || texte.indexOf("ne donnera pas") >= 0 ||
           texte.indexOf("nous n'avons pas") >= 0) {
    type = "refus";
    action = "Statut mis a jour dans JobBingTrack : REJECTED";
  }

  // --- Confirmation / accuse reception candidature ---
  else if (texte.indexOf("votre candidature") >= 0 ||
           texte.indexOf("accuse de reception") >= 0 || texte.indexOf("accuse reception") >= 0 ||
           texte.indexOf("accuse de recc") >= 0 ||
           texte.indexOf("bien recu votre") >= 0 || texte.indexOf("prise en compte") >= 0 ||
           (texte.indexOf("accusé de réception") >= 0)) {
    type = "candidature_nouvelle";
    action = "Candidature creee dans JobBingTrack — valider";
  }

  // --- Reponse / suivi ---
  else if (texte.indexOf("suite a votre") >= 0 || texte.indexOf("en reponse a") >= 0 ||
           texte.indexOf("votre dossier") >= 0 || texte.indexOf("retour sur") >= 0) {
    type = "reponse";
    action = "Statut a verifier dans JobBingTrack";
  }

  // --- France Travail ---
  else if (expediteurLow.indexOf("francetravail") >= 0 ||
           expediteurLow.indexOf("france-travail") >= 0 ||
           expediteurLow.indexOf("pole-emploi") >= 0 ||
           expediteurLow.indexOf("poleemploi") >= 0) {
    type = "france_travail";
    action = "Traiter : actualisation, offre ou convocation";
    urgence = texte.indexOf("convocation") >= 0 || texte.indexOf("obligatoire") >= 0;
  }

  // --- Job boards (alertes offres) ---
  else {
    var estJobBoard = false;
    for (var jb = 0; jb < CONFIG.expediteursJobBoards.length; jb++) {
      if (expediteurLow.indexOf(CONFIG.expediteursJobBoards[jb]) >= 0) {
        estJobBoard = true;
        break;
      }
    }
    // Aussi detecter les noreply de job boards generiques
    if (!estJobBoard && (expediteurLow.indexOf("jobalert") >= 0 ||
                          expediteurLow.indexOf("hellowork") >= 0 ||
                          expediteurLow.indexOf("meteojob") >= 0 ||
                          expediteurLow.indexOf("indeed.com") >= 0)) {
      estJobBoard = true;
    }

    if (estJobBoard) {
      type = "offre";
      action = "Consulter les offres et postuler si pertinentes";
    }
    // Contact RH prioritaire direct
    else if (email.prioritaire) {
      type = "contact_direct";
      action = "Repondre au contact professionnel";
      urgence = true;
    }
    // Offre detectee par mot-cle
    else if ((texte.indexOf("offre") >= 0 || texte.indexOf("recrute") >= 0) &&
             (texte.indexOf("cdi") >= 0 || texte.indexOf("cdd") >= 0 ||
              texte.indexOf("poste") >= 0 || texte.indexOf("alternance") >= 0 ||
              texte.indexOf("mission") >= 0)) {
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
// EXTRACTION ENTREPRISE DEPUIS L'EXPEDITEUR
// ============================================================
function extraireEntreprise(email) {
  var match = email.expediteur.match(/<(.+)>/);
  var adresse = match ? match[1] : email.expediteur;
  var domaine = adresse.split("@")[1];
  if (!domaine) return "Contact";

  var exclusPersonnel = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.fr",
                         "yahoo.com", "orange.fr", "free.fr", "laposte.net", "sfr.fr"];
  for (var i = 0; i < exclusPersonnel.length; i++) {
    if (domaine === exclusPersonnel[i]) {
      return extraireEntrepriseDepuisSujet(email.sujet);
    }
  }

  // Extraire le nom propre du domaine (ex: "wink-lab.com" → "Wink-lab")
  var partiesDomaine = domaine.split(".");
  var nom = partiesDomaine[0];
  // Si sous-domaine type "emails.hellowork.com" → prendre la 2e partie
  if (nom.length <= 3 && partiesDomaine.length > 2) nom = partiesDomaine[1];
  return nom.charAt(0).toUpperCase() + nom.slice(1);
}

// ============================================================
// EXTRACTION ENTREPRISE DEPUIS LE SUJET (pour Indeed Apply, etc.)
// ============================================================
function extraireEntrepriseDepuisSujet(sujet) {
  if (!sujet) return "Entreprise";

  // Pattern "Candidatures via Indeed : [POSTE] H/F" → extraire depuis le corps
  // Pattern "NomEntreprise recrute un/e..." → extraire NomEntreprise
  var matchRecrute = sujet.match(/^(.+?)\s+recrute/i);
  if (matchRecrute) return matchRecrute[1].trim();

  // Pattern "Candidatures via Indeed : [POSTE]" → on prend le poste comme nom court
  var matchIndeed = sujet.match(/Candidatures via Indeed\s*:\s*(.+)/i);
  if (matchIndeed) {
    // Extraire l'entreprise du poste si disponible, sinon "Indeed"
    var poste = matchIndeed[1].trim();
    // Chercher "chez NomEntreprise" ou "[NomEntreprise]"
    var matchChez = poste.match(/chez\s+(.+?)(?:\s*[-–]|$)/i);
    if (matchChez) return matchChez[1].trim();
    return "Indeed Apply";
  }

  // Fallback : premier mot en majuscule de plus de 3 caracteres
  var mots = sujet.split(/[\s\-|]/);
  for (var j = 0; j < mots.length; j++) {
    var mot = mots[j].trim().replace(/[^\w\-]/g, "");
    if (mot.length > 3 && mot[0] === mot[0].toUpperCase() &&
        !/^(Votre|Notre|Suite|Nous|Bonjour|Offre|Poste|Candidature|RE|FW|TR|Merci|Pour|Voici|Paul|Hello|PAUL)$/.test(mot)) {
      return mot;
    }
  }
  return "Entreprise";
}

// ============================================================
// API JOBBINGTRACK — AUTHENTIFICATION
// ============================================================
function jbtAuthentifier() {
  try {
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ pin: CONFIG.jobbingtrackPin }),
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/auth/login", options);
    if (response.getResponseCode() !== 200) {
      Logger.log("Erreur auth JBT : HTTP " + response.getResponseCode());
      return null;
    }
    var data = JSON.parse(response.getContentText());
    if (!data.ok || !data.token) return null;
    Logger.log("JobBingTrack : connecte");
    return data.token;
  } catch (err) {
    Logger.log("Exception auth JBT : " + err);
    return null;
  }
}

function jbtGetCompanies(token) {
  try {
    var r = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/companies", {
      method: "get",
      headers: { "Authorization": "Bearer " + token },
      muteHttpExceptions: true
    });
    if (r.getResponseCode() !== 200) return [];
    return JSON.parse(r.getContentText()) || [];
  } catch (e) { return []; }
}

function jbtGetApplications(token) {
  try {
    var r = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/applications", {
      method: "get",
      headers: { "Authorization": "Bearer " + token },
      muteHttpExceptions: true
    });
    if (r.getResponseCode() !== 200) return [];
    return JSON.parse(r.getContentText()) || [];
  } catch (e) { return []; }
}

function jbtCreerEntreprise(token, nom) {
  try {
    var r = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/companies", {
      method: "post",
      contentType: "application/json",
      headers: { "Authorization": "Bearer " + token },
      payload: JSON.stringify({ name: nom, website: extraireWebsiteDepuisNom(nom), location: "Rennes, France" }),
      muteHttpExceptions: true
    });
    var code = r.getResponseCode();
    if (code !== 200 && code !== 201) {
      Logger.log("Erreur creation entreprise : " + code + " " + r.getContentText());
      return null;
    }
    return JSON.parse(r.getContentText());
  } catch (e) {
    Logger.log("Exception creation entreprise : " + e);
    return null;
  }
}

function jbtCreerCandidature(token, companyId, poste, statut, date, notes) {
  try {
    var payload = {
      companyId: companyId,
      position: poste || "Poste non specifie",
      status: statut || "CANDIDATE_PENDING",
      applicationDate: Utilities.formatDate(date || new Date(), "Europe/Paris", "yyyy-MM-dd"),
      notes: notes || "",
      jobUrl: "",
      location: "Rennes, France",
      workMode: "ON_SITE"
    };
    var r = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/applications", {
      method: "post",
      contentType: "application/json",
      headers: { "Authorization": "Bearer " + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = r.getResponseCode();
    if (code !== 200 && code !== 201) {
      Logger.log("Erreur creation candidature : " + code + " " + r.getContentText());
      return null;
    }
    return JSON.parse(r.getContentText());
  } catch (e) {
    Logger.log("Exception creation candidature : " + e);
    return null;
  }
}

function jbtMettreAJourStatut(token, appId, statut, notes) {
  try {
    var payload = { status: statut };
    if (notes) payload.notes = notes;
    var r = UrlFetchApp.fetch(CONFIG.jobbingtrackApiBase + "/applications/" + appId, {
      method: "patch",
      contentType: "application/json",
      headers: { "Authorization": "Bearer " + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    return r.getResponseCode() === 200;
  } catch (e) { return false; }
}

// ============================================================
// TRAITEMENT CANDIDATURE DANS JOBBINGTRACK
// ============================================================
function jbtTraiterCandidature(token, analyse, companies, applications) {
  var nomEntreprise = analyse.entreprise || "Entreprise inconnue";

  // Trouver l'entreprise existante (recherche souple)
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
    if (applications[j].companyId === company.id) {
      appExistante = applications[j];
      break;
    }
  }

  var action = {
    entreprise: nomEntreprise,
    poste: extrairePoste(analyse),
    type: analyse.type,
    companyCreee: companyCreee,
    companyId: company.id,
    companyNom: company.name || nomEntreprise,
    applicationCreee: false,
    applicationId: null,
    statutMaJ: false
  };

  if (appExistante) {
    // Mettre a jour seulement si c'est un changement important
    var statutsImportants = ["REJECTED", "INTERVIEW_PENDING", "OFFER_RECEIVED"];
    if (statutsImportants.indexOf(statut) >= 0) {
      var notes = "Auto - " + Utilities.formatDate(analyse.date, "Europe/Paris", "dd/MM/yyyy") + " - " + analyse.sujet;
      jbtMettreAJourStatut(token, appExistante.id, statut, notes);
      action.applicationId = appExistante.id;
      action.statutMaJ = true;
      action.ancienStatut = appExistante.status;
      action.nouveauStatut = statut;
    } else {
      action.applicationId = appExistante.id;
      action.dejaPresenteJBT = true;
    }
  } else {
    var notesCandidature = "Import auto depuis email\n" +
                           "De : " + analyse.expediteur + "\n" +
                           "Sujet : " + analyse.sujet + "\n" +
                           "Date : " + Utilities.formatDate(analyse.date, "Europe/Paris", "dd/MM/yyyy");
    var app = jbtCreerCandidature(token, company.id, action.poste, statut, analyse.date, notesCandidature);
    if (app) {
      action.applicationCreee = true;
      action.applicationId = app.id;
      action.statutFinal = statut;
    }
  }

  return action;
}

function trouverEntrepriseExistante(nom, companies) {
  var nomLow = nom.toLowerCase();
  for (var i = 0; i < companies.length; i++) {
    var c = companies[i];
    if (!c.name) continue;
    var cLow = c.name.toLowerCase();
    if (cLow === nomLow) return c;
    if (cLow.indexOf(nomLow) >= 0 || nomLow.indexOf(cLow) >= 0) return c;
  }
  return null;
}

function typeEmailVersStatutJBT(type) {
  var map = {
    "candidature_nouvelle": "CANDIDATE_PENDING",
    "refus":                "REJECTED",
    "entretien":            "INTERVIEW_PENDING",
    "reponse":              "CANDIDATE_PENDING",
    "contact_direct":       "CANDIDATE_PENDING"
  };
  return map[type] || "CANDIDATE_PENDING";
}

function extrairePoste(analyse) {
  var sujet = analyse.sujet || "";
  // "Candidatures via Indeed : POSTE H/F" → extraire le poste
  var matchIndeed = sujet.match(/Candidatures via Indeed\s*:\s*(.+)/i);
  if (matchIndeed) return matchIndeed[1].trim().substring(0, 80);

  // Nettoyer les prefixes courants
  var nettoye = sujet.replace(/^(RE:|FW:|TR:|Fwd:)\s*/i, "").trim();
  return nettoye.substring(0, 80) || "Poste non specifie";
}

function extraireWebsiteDepuisNom(nom) {
  if (!nom) return "";
  // Tentative simple pour les noms connus
  var sites = {
    "wink": "https://wink-lab.com",
    "helpline": "https://www.helpline.fr",
    "interaction": "https://www.interaction-recrutement.fr",
    "seard": "https://www.seard.fr",
    "axia": "https://www.axia-interim.fr"
  };
  var nomLow = nom.toLowerCase();
  for (var k in sites) {
    if (nomLow.indexOf(k) >= 0) return sites[k];
  }
  return "";
}

// ============================================================
// GOOGLE TASKS — VERIFICATION RETARDS
// ============================================================
function verifierTachesEnRetard() {
  try {
    var listes = TasksAPI.Tasklists.list({ maxResults: 20 });
    if (!listes.items) return [];

    var taskListId = null;
    for (var i = 0; i < listes.items.length; i++) {
      if (listes.items[i].title === CONFIG.taskListName) {
        taskListId = listes.items[i].id;
        break;
      }
    }
    if (!taskListId) return [];

    var taches = TasksAPI.Tasks.list(taskListId, {
      showCompleted: false,
      showDeleted: false,
      maxResults: 50
    });
    if (!taches.items) return [];

    var maintenant = new Date();
    var enRetard = [];
    for (var j = 0; j < taches.items.length; j++) {
      var t = taches.items[j];
      if (t.due && t.status !== "completed") {
        var dateLimite = new Date(t.due);
        if (dateLimite < maintenant) {
          // Nettoyer le titre si emojis cassees (caracteres non-ASCII en debut)
          var titre = t.title || "Tache sans titre";
          titre = titre.replace(/^[^\x20-\x7E\xA0-\xFF]+/, "").trim();
          enRetard.push({ titre: titre, dateLimit: dateLimite });
        }
      }
    }
    return enRetard;
  } catch (e) {
    Logger.log("Erreur verif retards : " + e);
    return [];
  }
}

// ============================================================
// CALENDRIER — EVENEMENTS DEMAIN
// ============================================================
function recupererEvenementsDemain() {
  try {
    var demain = new Date();
    demain.setDate(demain.getDate() + 1);
    demain.setHours(0, 0, 0, 0);
    var finDemain = new Date(demain);
    finDemain.setHours(23, 59, 59, 0);

    var cal = CalendarApp.getCalendarById(CONFIG.calendarId);
    var events = cal.getEvents(demain, finDemain);
    return events.map(function(e) {
      return { titre: e.getTitle(), debut: e.getStartTime(), fin: e.getEndTime() };
    });
  } catch (e) {
    Logger.log("Erreur calendrier : " + e);
    return [];
  }
}

// ============================================================
// GOOGLE TASKS — CREATION TACHE
// ============================================================
function creerTacheGoogleTasks(analyse) {
  try {
    var listes = TasksAPI.Tasklists.list({ maxResults: 20 });
    var taskListId = null;
    if (listes.items) {
      for (var i = 0; i < listes.items.length; i++) {
        if (listes.items[i].title === CONFIG.taskListName) {
          taskListId = listes.items[i].id;
          break;
        }
      }
    }
    if (!taskListId) {
      taskListId = TasksAPI.Tasklists.insert({ title: CONFIG.taskListName }).id;
    }

    var prefixType = {
      entretien:            "[ENTRETIEN]",
      evenement:            "[EVENEMENT]",
      offre:                "[OFFRE]",
      refus:                "[REFUS]",
      candidature_nouvelle: "[CANDIDATURE]",
      reponse:              "[REPONSE]",
      france_travail:       "[FRANCE TRAVAIL]",
      contact_direct:       "[CONTACT]"
    }[analyse.type] || "[EMAIL]";

    var demain = new Date();
    demain.setDate(demain.getDate() + 1);

    var titre = prefixType + " " + analyse.entreprise + " - " + analyse.action;
    var notes = "De : " + analyse.expediteur +
                "\nSujet : " + analyse.sujet +
                "\nDate : " + Utilities.formatDate(analyse.date, "Europe/Paris", "dd/MM/yyyy HH:mm") +
                "\nAction : " + analyse.action +
                "\n\nContexte :\n" + analyse.corps.substring(0, 400) +
                "\n\nJobBingTrack : " + CONFIG.jobbingtrackUrl;

    var tache = TasksAPI.Tasks.insert({
      title: titre,
      notes: notes,
      due: demain.toISOString()
    }, taskListId);

    Logger.log("Tache creee : " + titre);
    return tache;
  } catch (e) {
    Logger.log("Erreur creation tache : " + e);
    return null;
  }
}

// ============================================================
// CALENDRIER — CREATION EVENEMENT (ENTRETIEN / JOB DATING)
// ============================================================
function creerEvenementCalendrier(analyse) {
  try {
    var texte = analyse.corps;
    var matchDate = texte.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{4})?/);
    var matchHeure = texte.match(/(\d{1,2})[h:](\d{0,2})/i);

    var dateEv = new Date();
    dateEv.setDate(dateEv.getDate() + 1);
    dateEv.setHours(10, 0, 0, 0);

    if (matchDate) {
      var j = parseInt(matchDate[1]);
      var mo = parseInt(matchDate[2]) - 1;
      var an = matchDate[3] ? parseInt(matchDate[3]) : new Date().getFullYear();
      dateEv = new Date(an, mo, j, 10, 0, 0);
    }
    if (matchHeure) {
      dateEv.setHours(parseInt(matchHeure[1]), parseInt(matchHeure[2] || "0"), 0, 0);
    }

    var finEv = new Date(dateEv.getTime() + 60 * 60000);
    var cal = CalendarApp.getCalendarById(CONFIG.calendarId);

    var titre = analyse.type === "entretien"
      ? "[ENTRETIEN] " + analyse.entreprise
      : "[EVENEMENT] " + analyse.sujet.substring(0, 60);

    cal.createEvent(titre, dateEv, finEv, {
      description: "De : " + analyse.expediteur +
                   "\nSujet : " + analyse.sujet +
                   "\nAction : " + analyse.action +
                   "\n\nContexte :\n" + analyse.corps.substring(0, 500) +
                   "\n\nJobBingTrack : " + CONFIG.jobbingtrackUrl
    });

    Logger.log("Evenement cree : " + titre);
  } catch (e) {
    Logger.log("Erreur creation evenement : " + e);
  }
}

// ============================================================
// ENVOI RECAPITULATIF EMAIL HTML
// ============================================================
function envoyerRecapitulatif(analyses, tachesCreees, tachesEnRetard, actionsJBT, calendrier) {
  var aujourd_hui = new Date();
  var demain = new Date(); demain.setDate(demain.getDate() + 1);

  var dateAuj = dateEnFrancais(aujourd_hui);
  var dateDemain = dateEnFrancais(demain);

  // Separer urgents et normaux (on utilise les analyses deja calculees)
  var urgents = [];
  var normaux = [];
  for (var idx = 0; idx < analyses.length; idx++) {
    if (analyses[idx].urgence) urgents.push(analyses[idx]);
    else normaux.push(analyses[idx]);
  }

  // --- Bloc urgences ---
  var htmlUrgent = "";
  if (urgents.length > 0) {
    htmlUrgent = '<tr><td style="padding:20px 24px 0 24px;">' +
      '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">ALERTES URGENTES (' + urgents.length + ')</p>';
    for (var i = 0; i < urgents.length; i++) {
      htmlUrgent += carteEmail(urgents[i], true);
    }
    htmlUrgent += '</td></tr>';
  }

  // --- Bloc emails normaux ---
  var htmlEmails = "";
  if (normaux.length > 0) {
    htmlEmails = '<tr><td style="padding:20px 24px 0 24px;">' +
      '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">EMAILS EMPLOI DU JOUR (' + normaux.length + ')</p>';
    for (var j = 0; j < normaux.length; j++) {
      htmlEmails += carteEmail(normaux[j], false);
    }
    htmlEmails += '</td></tr>';
  }

  // --- Taches en retard ---
  var htmlRetard = '<tr><td style="padding:20px 24px 0 24px;">' +
    '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">TACHES EN RETARD</p>';
  if (tachesEnRetard.length > 0) {
    for (var k = 0; k < tachesEnRetard.length; k++) {
      var t = tachesEnRetard[k];
      htmlRetard += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb;border:1px solid #f59e0b;border-radius:6px;margin-bottom:8px;">' +
        '<tr><td style="padding:12px 14px;">' +
        '<p style="margin:0 0 3px 0;font-size:13px;font-weight:bold;color:#92400e;">[RETARD] ' + esc(t.titre) + '</p>' +
        '<p style="margin:0;font-size:12px;color:#b45309;">Prevue le ' + Utilities.formatDate(t.dateLimit, "Europe/Paris", "dd/MM") + ' — non realisee</p>' +
        '</td></tr></table>';
    }
  } else {
    htmlRetard += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fff4;border:1px solid #27ae60;border-radius:6px;">' +
      '<tr><td style="padding:12px 14px;"><p style="margin:0;font-size:13px;color:#065f46;">[OK] Aucune tache en retard.</p></td></tr></table>';
  }
  htmlRetard += '</td></tr>';

  // --- Programme demain ---
  var htmlTaches = '<tr><td style="padding:20px 24px 0 24px;">' +
    '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">PROGRAMME DEMAIN — ' + dateDemain.toUpperCase() + ' (apres 16h)</p>';
  if (tachesCreees.length > 0) {
    for (var l = 0; l < tachesCreees.length; l++) {
      htmlTaches += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">' +
        '<tr>' +
        '<td style="vertical-align:top;width:80px;"><span style="display:inline-block;background-color:#1a1a2e;color:#fff;font-size:11px;font-weight:bold;padding:4px 8px;border-radius:4px;">apres 16h</span></td>' +
        '<td style="vertical-align:top;padding-left:10px;font-size:13px;color:#1f2937;">' + esc(tachesCreees[l].title) + '</td>' +
        '</tr></table>';
    }
  } else {
    htmlTaches += '<p style="margin:0;font-size:13px;color:#9ca3af;">Aucune nouvelle tache creee.</p>';
  }
  htmlTaches += '</td></tr>';

  // --- Actions JobBingTrack (NOUVEAU : candidatures deja saisies, lien de validation) ---
  var htmlJBT = '<tr><td style="padding:20px 24px 0 24px;">' +
    '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">JOBBINGTRACK — CANDIDATURES SAISIES AUTOMATIQUEMENT</p>';

  if (actionsJBT.length > 0) {
    for (var m = 0; m < actionsJBT.length; m++) {
      var act = actionsJBT[m];
      var descAction = "";
      var bgColor = "#f9fafb";
      var borderColor = "#e5e7eb";
      var badgeColor = "#9ca3af";
      var badgeLabel = "";

      if (act.applicationCreee) {
        descAction = "Candidature creee — statut : " + esc(act.statutFinal);
        bgColor = "#f0fff4";
        borderColor = "#27ae60";
        badgeColor = "#27ae60";
        badgeLabel = "CREE";
      } else if (act.statutMaJ) {
        descAction = "Statut mis a jour : " + esc(act.ancienStatut) + " → " + esc(act.nouveauStatut);
        bgColor = "#fffbeb";
        borderColor = "#f59e0b";
        badgeColor = "#f59e0b";
        badgeLabel = "MAJ";
      } else if (act.dejaPresenteJBT) {
        descAction = "Deja presente dans JobBingTrack";
        badgeLabel = "EXISTANT";
      }

      // Lien direct vers la candidature specifique ou la liste
      var lienJBT = CONFIG.jobbingtrackUrl;
      if (act.applicationId) {
        lienJBT = CONFIG.jobbingtrackUrl + "/applications/" + act.applicationId;
      }

      htmlJBT += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + bgColor + ';border:1px solid ' + borderColor + ';border-radius:6px;margin-bottom:10px;">' +
        '<tr><td style="padding:14px 16px;">' +
        (badgeLabel ? '<p style="margin:0 0 6px 0;"><span style="display:inline-block;background-color:' + badgeColor + ';color:#fff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:10px;">' + badgeLabel + '</span></p>' : '') +
        '<p style="margin:0 0 3px 0;font-size:14px;font-weight:bold;color:#1f2937;">' + esc(act.entreprise) + ' — ' + esc(act.poste) + '</p>' +
        '<p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;">' + descAction + '</p>' +
        '<a href="' + lienJBT + '" style="display:inline-block;background-color:#8b5cf6;color:#fff;font-size:12px;font-weight:bold;padding:6px 14px;border-radius:4px;text-decoration:none;">Valider dans JobBingTrack</a>' +
        '</td></tr></table>';
    }
  } else {
    htmlJBT += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">' +
      '<tr><td style="padding:12px 14px;"><p style="margin:0;font-size:13px;color:#9ca3af;">Aucune candidature a traiter automatiquement ce jour.</p></td></tr></table>';
  }
  htmlJBT += '</td></tr>';

  // --- Assemblage ---
  var html =
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>' +
    '<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">' +
    '<tr><td align="center" style="padding:20px 10px;">' +
    '<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">' +

    '<tr><td style="background-color:#1a1a2e;padding:28px;text-align:center;">' +
    '<p style="margin:0 0 6px 0;font-size:20px;font-weight:bold;color:#ffffff;">Triage Emploi — ' + dateAuj + '</p>' +
    '<p style="margin:0;font-size:13px;color:#a0a8c8;">Genere automatiquement a 19h00 — v3.1</p>' +
    '</td></tr>' +

    htmlUrgent +
    htmlEmails +
    htmlRetard +
    htmlTaches +
    htmlJBT +

    '<tr><td style="background-color:#f3f4f6;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">' +
    '<p style="margin:0 0 4px 0;font-size:11px;color:#9ca3af;">Script Google Apps Script — 100% gratuit.</p>' +
    '<p style="margin:0;font-size:11px;"><a href="' + CONFIG.jobbingtrackUrl + '" style="color:#6b7280;">Ouvrir JobBingTrack</a></p>' +
    '</td></tr>' +

    '</table></td></tr></table></body></html>';

  GmailApp.sendEmail(CONFIG.email, "Triage Emploi — " + dateAuj, "", { htmlBody: html });
  Logger.log("Email envoye");
}

// ============================================================
// CARTE EMAIL (UTILISE LES ANALYSES, PAS LES EMAILS BRUTS)
// ============================================================
function carteEmail(analyse, urgent) {
  var styleMap = {
    entretien:            { bg: "#fff5f5", border: "#e74c3c", badge: "#e74c3c", label: "ENTRETIEN" },
    evenement:            { bg: "#fff5f5", border: "#e74c3c", badge: "#e74c3c", label: "EVENEMENT" },
    offre:                { bg: "#f0f7ff", border: "#3498db", badge: "#3498db", label: "OFFRE" },
    refus:                { bg: "#f9fafb", border: "#9ca3af", badge: "#9ca3af", label: "REFUS" },
    candidature_nouvelle: { bg: "#f0fff4", border: "#27ae60", badge: "#27ae60", label: "CANDIDATURE" },
    reponse:              { bg: "#fffbeb", border: "#f39c12", badge: "#f39c12", label: "REPONSE" },
    france_travail:       { bg: "#f5f0ff", border: "#8b5cf6", badge: "#8b5cf6", label: "FRANCE TRAVAIL" },
    contact_direct:       { bg: "#f0fff4", border: "#27ae60", badge: "#27ae60", label: "CONTACT RH" }
  };
  var s = styleMap[analyse.type] || { bg: "#f9fafb", border: "#9ca3af", badge: "#9ca3af", label: "EMAIL" };
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
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================
// INSTALLER LE DECLENCHEUR — UNE SEULE FOIS
// ============================================================
function installerDeclencheur() {
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === "lancerTriageQuotidien") {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }
  ScriptApp.newTrigger("lancerTriageQuotidien")
    .timeBased()
    .everyDays(1)
    .atHour(19)
    .create();
  Logger.log("Declencheur installe : chaque soir a 19h");
}

/*
================================================================
INSTALLATION (5 min)
================================================================
1. Aller sur https://script.google.com (pauldelhomme.pro@gmail.com)
2. Ouvrir le projet existant (ou Nouveau projet)
3. Remplacer TOUT le contenu de Code.gs par ce fichier
4. Services (+) > Tasks API v1 > identifiant : TasksAPI
   (si deja present, pas besoin de refaire)
5. Executer installerDeclencheur > Accepter les permissions
6. Tester : executer lancerTriageQuotidien

PERMISSIONS REQUISES :
- Gmail (lire + envoyer)
- Google Tasks
- Google Agenda
- UrlFetchApp (appels API JobBingTrack)

CORRECTIFS v3.1 :
- Plus de "INFO" : les emails sont analyses avant affichage
- L'action s'affiche correctement dans chaque carte email
- Les recaps envoyes par pauldelhomme.pro@gmail.com sont exclus
- Les taches en retard avec emojis cassees : le titre est nettoye a l'affichage
- JobBingTrack : le script cree lui-meme les candidatures
  Tu recois un bouton "Valider dans JobBingTrack" avec lien direct

COUT : 0 euro, 0 credit Perplexity.
================================================================
*/
