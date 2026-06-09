/**
 * AGENT DE TRIAGE EMAIL — RECHERCHE D'EMPLOI
 * Compte de recherche emploi — destinataire configuré via Script Properties
 * Version 2 — corrigée (emojis UTF-8, détection améliorée, dates FR)
 *
 * INSTALLATION :
 * 1. script.google.com → Nouveau projet → coller ce code
 * 2. Services (+) → Tasks API v1 → identifiant : TasksAPI → Ajouter
 * 3. Exécuter : installerDeclencheur (accepter permissions)
 * 4. Tester : exécuter lancerTriageQuotidien
 */

// ============================================================
// CONFIGURATION — modifier ici si besoin
// ============================================================
var CONFIG = {
  taskListName: "Recherche emploi",   // sans emoji pour éviter les problèmes d'encodage
  calendarId: "primary",
  heureDebutTaches: 16,              // tâches planifiées après 16h
  jobbingtrackUrl: "https://jobbingtrack.pplx.app",

  motsClesEmploi: [
    "candidature", "emploi", "recrutement", "entretien", "alternance",
    "offre d'emploi", "offre de poste", "stage", "mission", "interim",
    "job dating", "jobdating", "salon recrutement", "forum emploi",
    "convocation", "embauche", "cdi", "cdd", "france travail", "pole emploi",
    "sup de vinci", "fastt", "agence interim", "axia", "manpower", "adecco"
  ],

  expediteursExclus: [
    "no-reply@linkedin", "noreply@indeed", "newsletter@", "marketing@",
    "promo@", "no-reply@poleemploi"
  ],

  expediteursPrioritaires: [
    "supdevinci", "sup-de-vinci", "charlene.vignon",
    "france-travail", "francetravail",
    "axia-interim", "manpower", "adecco", "fastt"
  ]
};

function getDigestRecipient() {
  var recipient = PropertiesService.getScriptProperties().getProperty("TRIAGE_DIGEST_RECIPIENT");
  if (!recipient) {
    throw new Error("TRIAGE_DIGEST_RECIPIENT manquant dans les propriétés du script. Renseigner la vraie adresse de réception hors Git.");
  }
  return recipient;
}

// Jours et mois en français (Apps Script n'a pas de locale FR)
var JOURS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
var MOIS_FR = ["janvier", "fevrier", "mars", "avril", "mai", "juin",
               "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

function dateEnFrancais(date) {
  return JOURS_FR[date.getDay()] + " " + date.getDate() + " " + MOIS_FR[date.getMonth()] + " " + date.getFullYear();
}

function heureFR(date) {
  var h = date.getHours();
  var m = date.getMinutes();
  return h + "h" + (m < 10 ? "0" + m : m);
}

// ============================================================
// POINT D'ENTREE PRINCIPAL
// ============================================================
function lancerTriageQuotidien() {
  Logger.log("=== Demarrage triage email ===");

  var emails = lireEmailsEmploi();
  var tachesEnRetard = verifierTachesEnRetard();
  var calendrier = recupererEvenementsDemain();

  var tachesCreees = [];
  var candidaturesDetectees = [];

  for (var i = 0; i < emails.length; i++) {
    var analyse = analyserEmail(emails[i]);
    if (!analyse) continue;

    var tache = creerTacheGoogleTasks(analyse);
    if (tache) tachesCreees.push(tache);

    if (analyse.type === "entretien" || analyse.type === "evenement") {
      creerEvenementCalendrier(analyse);
    }

    if (analyse.type === "candidature_nouvelle" || analyse.type === "refus" || analyse.type === "reponse") {
      candidaturesDetectees.push(analyse);
    }
  }

  envoyerRecapitulatif(emails, tachesCreees, tachesEnRetard, candidaturesDetectees, calendrier);

  Logger.log("=== Triage termine : " + emails.length + " emails, " + tachesCreees.length + " taches creees ===");
}

// ============================================================
// LECTURE DES EMAILS DES 24 DERNIERES HEURES
// ============================================================
function lireEmailsEmploi() {
  var hier = new Date();
  hier.setDate(hier.getDate() - 1);
  var dateStr = Utilities.formatDate(hier, "UTC", "yyyy/MM/dd");

  var query = "after:" + dateStr + " -in:spam -in:trash";
  var threads = GmailApp.search(query, 0, 50);

  var emailsEmploi = [];

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    var msg = messages[messages.length - 1];

    var expediteur = msg.getFrom();
    var sujet = msg.getSubject();
    var corps = msg.getPlainBody().substring(0, 1200).toLowerCase();
    var date = msg.getDate();

    // Exclure noreply sauf confirmation candidature
    var estExclu = false;
    for (var e = 0; e < CONFIG.expediteursExclus.length; e++) {
      if (expediteur.toLowerCase().indexOf(CONFIG.expediteursExclus[e]) >= 0) {
        estExclu = true;
        break;
      }
    }
    if (estExclu) {
      var estConfirmation = corps.indexOf("votre candidature") >= 0 ||
                            corps.indexOf("nous avons bien recu") >= 0 ||
                            corps.indexOf("accuse de reception") >= 0 ||
                            sujet.toLowerCase().indexOf("candidature") >= 0;
      if (!estConfirmation) continue;
    }

    // Détection emploi
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
      if (expediteur.toLowerCase().indexOf(CONFIG.expediteursPrioritaires[p]) >= 0) {
        estPrioritaire = true;
        break;
      }
    }

    emailsEmploi.push({
      expediteur: expediteur,
      sujet: sujet,
      corps: corps,
      date: date,
      prioritaire: estPrioritaire
    });
  }

  // Trier prioritaires en premier
  emailsEmploi.sort(function(a, b) {
    if (a.prioritaire && !b.prioritaire) return -1;
    if (!a.prioritaire && b.prioritaire) return 1;
    return b.date - a.date;
  });

  Logger.log(emailsEmploi.length + " emails emploi detectes");
  return emailsEmploi;
}

// ============================================================
// ANALYSE D'UN EMAIL
// ============================================================
function analyserEmail(email) {
  var texte = (email.sujet + " " + email.corps).toLowerCase();
  var type = null;
  var action = null;
  var urgence = false;
  var entreprise = extraireEntreprise(email);

  // Entretien / convocation — PRIORITAIRE
  if (texte.indexOf("entretien") >= 0 || texte.indexOf("convocation") >= 0 ||
      texte.indexOf("rendez-vous") >= 0 || texte.indexOf("interview") >= 0) {
    type = "entretien";
    action = "Preparer l'entretien et confirmer ta presence";
    urgence = true;
  }
  // Job dating / evenement
  else if (texte.indexOf("job dating") >= 0 || texte.indexOf("jobdating") >= 0 ||
           texte.indexOf("salon") >= 0 || texte.indexOf("forum") >= 0) {
    type = "evenement";
    action = "S'inscrire a l'evenement";
    urgence = true;
  }
  // Refus
  else if (texte.indexOf("refus") >= 0 || texte.indexOf("n'avons pas retenu") >= 0 ||
           texte.indexOf("sans suite") >= 0 || texte.indexOf("ne correspond pas") >= 0 ||
           texte.indexOf("nous ne pouvons pas") >= 0 || texte.indexOf("ne donnera pas") >= 0) {
    type = "refus";
    action = "Archiver dans JobBingTrack — statut : Rejected";
  }
  // Offre d'emploi
  else if ((texte.indexOf("offre") >= 0 || texte.indexOf("recherche") >= 0) &&
           (texte.indexOf("emploi") >= 0 || texte.indexOf("poste") >= 0 ||
            texte.indexOf("alternance") >= 0 || texte.indexOf("mission") >= 0 ||
            texte.indexOf("cdi") >= 0 || texte.indexOf("cdd") >= 0)) {
    type = "offre";
    action = "Lire l'offre et postuler si pertinente";
  }
  // Confirmation / accuse de reception candidature
  else if (texte.indexOf("votre candidature") >= 0 || texte.indexOf("accuse de reception") >= 0 ||
           texte.indexOf("bien recu") >= 0 || texte.indexOf("prise en compte") >= 0) {
    type = "candidature_nouvelle";
    action = "Ajouter dans JobBingTrack — statut : Applied";
  }
  // Reponse / suivi
  else if (texte.indexOf("suite a votre") >= 0 || texte.indexOf("en reponse") >= 0 ||
           texte.indexOf("votre dossier") >= 0) {
    type = "reponse";
    action = "Repondre ou mettre a jour le statut dans JobBingTrack";
  }
  // France Travail / Pole Emploi
  else if (email.expediteur.toLowerCase().indexOf("francetravail") >= 0 ||
           email.expediteur.toLowerCase().indexOf("france-travail") >= 0 ||
           email.expediteur.toLowerCase().indexOf("pole-emploi") >= 0) {
    type = "france_travail";
    action = "Traiter : actualisation, offre ou convocation";
    urgence = texte.indexOf("convocation") >= 0 || texte.indexOf("obligatoire") >= 0;
  }
  // Agence interim / contact RH direct
  else if (email.prioritaire) {
    type = "contact_direct";
    action = "Repondre au contact professionnel";
    urgence = true;
  }

  if (!type) return null;

  return {
    expediteur: email.expediteur,
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

  var exclus = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.fr", "yahoo.com",
                "orange.fr", "free.fr", "laposte.net", "sfr.fr"];
  for (var i = 0; i < exclus.length; i++) {
    if (domaine === exclus[i]) {
      // Essayer depuis le sujet
      var mots = email.sujet.split(/[\s\-|]/);
      for (var j = 0; j < mots.length; j++) {
        var mot = mots[j].trim();
        if (mot.length > 3 && mot[0] === mot[0].toUpperCase() &&
            !/^(Votre|Notre|Suite|Nous|Bonjour|Offre|Poste|Candidature|RE:|FW:|TR:)$/.test(mot)) {
          return mot;
        }
      }
      return "Particulier";
    }
  }

  // Nettoyer le domaine
  var nom = domaine.split(".")[0];
  return nom.charAt(0).toUpperCase() + nom.slice(1);
}

// ============================================================
// VERIFIER TACHES EN RETARD
// ============================================================
function verifierTachesEnRetard() {
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
        enRetard.push({ titre: t.title, dateLimit: dateLimite });
      }
    }
  }

  return enRetard;
}

// ============================================================
// EVENEMENTS DE DEMAIN
// ============================================================
function recupererEvenementsDemain() {
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
}

// ============================================================
// CREER TACHE GOOGLE TASKS
// ============================================================
function creerTacheGoogleTasks(analyse) {
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
    var nouvelle = TasksAPI.Tasklists.insert({ title: CONFIG.taskListName });
    taskListId = nouvelle.id;
  }

  var prefixType = {
    entretien:          "[ENTRETIEN]",
    evenement:          "[EVENEMENT]",
    offre:              "[OFFRE]",
    refus:              "[REFUS]",
    candidature_nouvelle: "[CANDIDATURE]",
    reponse:            "[REPONSE]",
    france_travail:     "[FRANCE TRAVAIL]",
    contact_direct:     "[CONTACT]"
  }[analyse.type] || "[EMAIL]";

  var demain = new Date();
  demain.setDate(demain.getDate() + 1);

  var titre = prefixType + " " + analyse.entreprise + " - " + analyse.action;
  var notes = "De : " + analyse.expediteur +
              "\nSujet : " + analyse.sujet +
              "\nDate : " + Utilities.formatDate(analyse.date, "Europe/Paris", "dd/MM/yyyy HH:mm") +
              "\n\nContexte :\n" + analyse.corps.substring(0, 400) +
              "\n\nJobBingTrack : " + CONFIG.jobbingtrackUrl;

  var tache = TasksAPI.Tasks.insert({
    title: titre,
    notes: notes,
    due: demain.toISOString()
  }, taskListId);

  Logger.log("Tache creee : " + titre);
  return tache;
}

// ============================================================
// CREER EVENEMENT CALENDRIER (ENTRETIEN)
// ============================================================
function creerEvenementCalendrier(analyse) {
  var texte = analyse.corps;

  // Extraire date
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
    : "[EVENEMENT] " + analyse.sujet;

  cal.createEvent(titre, dateEv, finEv, {
    description: "De : " + analyse.expediteur +
                 "\nSujet : " + analyse.sujet +
                 "\n\nContexte :\n" + analyse.corps.substring(0, 500) +
                 "\n\nJobBingTrack : " + CONFIG.jobbingtrackUrl
  });

  Logger.log("Evenement cree : " + titre);
}

// ============================================================
// ENVOI RECAPITULATIF EMAIL HTML
// ============================================================
function envoyerRecapitulatif(emails, tachesCreees, tachesEnRetard, candidaturesDetectees, calendrier) {
  var aujourd_hui = new Date();
  var demain = new Date(); demain.setDate(demain.getDate() + 1);

  var dateAuj = dateEnFrancais(aujourd_hui);
  var dateDemain = dateEnFrancais(demain);

  var emailsUrgents = emails.filter(function(e) { return e.urgence; });
  var emailsNormaux = emails.filter(function(e) { return !e.urgence; });

  // --- Bloc urgences ---
  var htmlUrgent = "";
  if (emailsUrgents.length > 0) {
    htmlUrgent = '<tr><td style="padding:20px 24px 0 24px;">' +
      '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">ALERTES URGENTES</p>';
    for (var i = 0; i < emailsUrgents.length; i++) {
      var e = emailsUrgents[i];
      htmlUrgent += carteEmail(e, true);
    }
    htmlUrgent += '</td></tr>';
  }

  // --- Bloc emails normaux ---
  var htmlEmails = "";
  if (emailsNormaux.length > 0) {
    htmlEmails = '<tr><td style="padding:20px 24px 0 24px;">' +
      '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">EMAILS EMPLOI DU JOUR (' + emailsNormaux.length + ')</p>';
    for (var j = 0; j < emailsNormaux.length; j++) {
      htmlEmails += carteEmail(emailsNormaux[j], false);
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
        '<p style="margin:0;font-size:12px;color:#b45309;">Prevue le ' + Utilities.formatDate(t.dateLimit, "Europe/Paris", "dd/MM") + ' - non realisee</p>' +
        '</td></tr></table>';
    }
  } else {
    htmlRetard += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fff4;border:1px solid #27ae60;border-radius:6px;">' +
      '<tr><td style="padding:12px 14px;"><p style="margin:0;font-size:13px;color:#065f46;">[OK] Aucune tache en retard - bien joue !</p></td></tr></table>';
  }
  htmlRetard += '</td></tr>';

  // --- Taches du lendemain ---
  var htmlTaches = '<tr><td style="padding:20px 24px 0 24px;">' +
    '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">PROGRAMME DEMAIN - ' + dateDemain.toUpperCase() + ' (apres 16h)</p>';
  if (tachesCreees.length > 0) {
    for (var l = 0; l < tachesCreees.length; l++) {
      htmlTaches += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">' +
        '<tr>' +
        '<td style="vertical-align:top;width:80px;"><span style="display:inline-block;background-color:#1a1a2e;color:#fff;font-size:11px;font-weight:bold;padding:4px 8px;border-radius:4px;">apres 16h</span></td>' +
        '<td style="vertical-align:top;padding-left:10px;font-size:13px;color:#1f2937;">' + esc(tachesCreees[l].title) + '</td>' +
        '</tr></table>';
    }
  } else {
    htmlTaches += '<p style="margin:0;font-size:13px;color:#9ca3af;">Aucune nouvelle tache cree aujourd\'hui.</p>';
  }
  htmlTaches += '</td></tr>';

  // --- A saisir dans JobBingTrack ---
  var htmlJBT = "";
  if (candidaturesDetectees.length > 0) {
    htmlJBT = '<tr><td style="padding:20px 24px 0 24px;">' +
      '<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">A SAISIR DANS JOBBINGTRACK</p>';
    for (var m2 = 0; m2 < candidaturesDetectees.length; m2++) {
      var c = candidaturesDetectees[m2];
      var statut = c.type === "refus" ? "Rejected" : c.type === "candidature_nouvelle" ? "Applied" : "Reponse recue";
      htmlJBT += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f0ff;border:1px solid #8b5cf6;border-radius:6px;margin-bottom:8px;">' +
        '<tr><td style="padding:12px 14px;">' +
        '<p style="margin:0 0 3px 0;font-size:13px;font-weight:bold;color:#1f2937;">' + esc(c.entreprise) + ' - [' + statut + ']</p>' +
        '<p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;">' + esc(c.sujet) + '</p>' +
        '<p style="margin:0;"><a href="' + CONFIG.jobbingtrackUrl + '" style="font-size:12px;color:#8b5cf6;">Ouvrir JobBingTrack</a></p>' +
        '</td></tr></table>';
    }
    htmlJBT += '</td></tr>';
  }

  // --- Assemblage final ---
  var html =
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>' +
    '<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">' +
    '<tr><td align="center" style="padding:20px 10px;">' +
    '<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">' +

    // EN-TETE
    '<tr><td style="background-color:#1a1a2e;padding:28px;text-align:center;">' +
    '<p style="margin:0 0 6px 0;font-size:20px;font-weight:bold;color:#ffffff;">Triage Emploi - ' + dateAuj + '</p>' +
    '<p style="margin:0;font-size:13px;color:#a0a8c8;">Genere automatiquement a 19h00</p>' +
    '</td></tr>' +

    htmlUrgent +
    htmlEmails +
    htmlRetard +
    htmlTaches +
    htmlJBT +

    // PIED DE PAGE
    '<tr><td style="background-color:#f3f4f6;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">' +
    '<p style="margin:0 0 4px 0;font-size:11px;color:#9ca3af;">Script Google Apps Script - 100% gratuit.</p>' +
    '<p style="margin:0;font-size:11px;"><a href="' + CONFIG.jobbingtrackUrl + '" style="color:#6b7280;">Ouvrir JobBingTrack</a></p>' +
    '</td></tr>' +

    '</table></td></tr></table></body></html>';

  var sujet = "Triage Emploi - " + dateAuj;
  var recipient = getDigestRecipient();
  GmailApp.sendEmail(recipient, sujet, "", { htmlBody: html });
  Logger.log("Email recapitulatif envoye au destinataire configure.");
}

// ============================================================
// CARTE EMAIL INDIVIDUELLE
// ============================================================
function carteEmail(email, urgent) {
  var styles = {
    entretien:          { bg: "#fff5f5", border: "#e74c3c", badge: "#e74c3c", label: "ENTRETIEN" },
    evenement:          { bg: "#fff5f5", border: "#e74c3c", badge: "#e74c3c", label: "EVENEMENT" },
    offre:              { bg: "#f0f7ff", border: "#3498db", badge: "#3498db", label: "OFFRE" },
    refus:              { bg: "#f9fafb", border: "#9ca3af", badge: "#9ca3af", label: "REFUS" },
    candidature_nouvelle: { bg: "#f0fff4", border: "#27ae60", badge: "#27ae60", label: "CANDIDATURE" },
    reponse:            { bg: "#fffbeb", border: "#f39c12", badge: "#f39c12", label: "REPONSE" },
    france_travail:     { bg: "#f5f0ff", border: "#8b5cf6", badge: "#8b5cf6", label: "FRANCE TRAVAIL" },
    contact_direct:     { bg: "#f0fff4", border: "#27ae60", badge: "#27ae60", label: "CONTACT RH" }
  }[email.type] || { bg: "#f9fafb", border: "#9ca3af", badge: "#9ca3af", label: "INFO" };

  var borderWidth = urgent ? "2px" : "1px";

  return '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + styles.bg + ';border:' + borderWidth + ' solid ' + styles.border + ';border-radius:6px;margin-bottom:10px;">' +
    '<tr><td style="padding:14px 16px;">' +
    '<p style="margin:0 0 6px 0;"><span style="display:inline-block;background-color:' + styles.badge + ';color:#fff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:10px;">' + styles.label + '</span></p>' +
    '<p style="margin:0 0 3px 0;font-size:14px;font-weight:bold;color:#1f2937;">' + esc(email.entreprise) + ' - ' + esc(email.sujet) + '</p>' +
    '<p style="margin:0 0 3px 0;font-size:12px;color:#9ca3af;">' + esc(email.expediteur) + ' - ' + Utilities.formatDate(email.date, "Europe/Paris", "dd/MM HH:mm") + '</p>' +
    '<p style="margin:0;font-size:13px;color:#374151;">Action : ' + esc(email.action) + '</p>' +
    '</td></tr></table>';
}

// ============================================================
// UTILITAIRE — echapper HTML
// ============================================================
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================
// INSTALLER LE DECLENCHEUR — executer UNE SEULE FOIS
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
1. Aller sur https://script.google.com avec le compte Google de recherche configuré hors Git
2. Nouveau projet — coller ce fichier complet
3. Services (+) > Tasks API v1 > identifiant : TasksAPI > Ajouter
4. Selectionner installerDeclencheur > Executer > Accepter permissions
5. Tester : selectionner lancerTriageQuotidien > Executer

MIGRATION NOUVEL APPAREIL :
- Aller sur script.google.com avec le bon compte Google
- Le projet y est deja (lie au compte, pas a l'appareil)
- Aucune reinstallation necessaire

COUT : 0 euro, 0 credit Perplexity.
================================================================
*/
