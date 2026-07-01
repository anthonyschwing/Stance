/* =========================================================================
   HUMIND — StanceI18N  (landing page + dashboard bilingual engine)
   Exports: window.StanceI18N  { setLang, getLang, t, T, applyStatic, wire }
            window.T(key, fallback)  — global shorthand used across all JSX
   Dispatches: CustomEvent 'stance:lang' on <html> whenever lang changes
   ========================================================================= */
;(function (global) {
  'use strict';

  /* ---- dictionary ---- */
  const FR = {
    /* nav */
    'nav.product':    'Produit',
    'nav.use-cases':  "Cas d'usage",
    'nav.pricing':    'Tarifs',
    'nav.company':    'À propos',
    'nav.login':      'Connexion',
    'nav.cta':        'Demander une démo',

    /* hero */
    'hero.eyebrow':   'People Analytics · IA Workforce',
    'hero.h1a':       'Votre Workforce,',
    'hero.h1b':       'en Temps Réel',
    'hero.lead':      "Stance transforme vos données RH en intelligence prédictive. Anticipez l'attrition, identifiez les signaux faibles et prenez des décisions éclairées — avant que les problèmes n'escaladent.",
    'hero.cta1':      'Démarrer gratuitement',
    'hero.cta2':      'Voir la démo',
    'hero.trust1':    'RGPD conforme',
    'hero.trust2':    'SSO entreprise',
    'hero.trust3':    'SOC 2 Type II',

    /* stage */
    'stage.live':     'Données en direct',
    'stage.url':      'app.humind.ai/exec',

    /* kpi labels */
    'kpi.health':     'Indice de Santé RH',
    'kpi.attrition':  'Attrition 12M',
    'kpi.engagement': 'Engagement',
    'kpi.risk':       'Indice de Risque',

    /* exec scores */
    'exec.health-label': 'Santé Globale',
    'exec.risk-label':   'Indice de Risque',
    'exec.good':         'SOLIDE',
    'exec.warn':         'SURVEILLER',
    'exec.sig1t':        'Attrition Q3 en hausse',
    'exec.sig1s':        'Engineering +9% vs trimestre précédent.',
    'exec.sig2t':        'Action recommandée',
    'exec.sig2s':        "Lancer des entretiens de rétention ciblés — 14 profils prioritaires identifiés.",

    /* copilot */
    'copilot.label':  'Stance AI',
    'copilot.ph':     "Demandez Stance… ex : Quels sont les risques d'attrition dans notre équipe Ventes ?",
    'copilot.demo':   "Risque d'attrition en EMEA — analyse en cours…",

    /* ask stance */
    'ask.eyebrow':    'Interrogez vos données RH',
    'ask.h2a':        'Posez la question.',
    'ask.h2b':        'Obtenez la réponse.',
    'ask.lead':       "Stance comprend votre organisation. Posez n'importe quelle question sur votre workforce en langage naturel — et recevez une réponse précise, avec les données qui la soutiennent.",
    'ask.q0':         'Attrition Ventes EMEA',
    'ask.q1':         'Risque de burnout',
    'ask.q2':         'Rétention toptalent',

    /* how it works */
    'hiw.eyebrow':    'Mise en place en 48h',
    'hiw.h2':         'Simple. Rapide. Immédiat.',
    'hiw.lead':       "Stance se connecte à vos SIRH en quelques clics. L'IA fait le reste.",
    'hiw.s1.num':     '01',
    'hiw.s1.title':   'Connectez vos sources',
    'hiw.s1.desc':    'Workday, SAP, BambooHR, Personio ou votre propre SIRH.',
    'hiw.s1.meta':    'Intégrations certifiées',
    'hiw.s2.num':     '02',
    'hiw.s2.title':   "L'IA structure et enrichit",
    'hiw.s2.desc':    'Normalisation automatique et calcul des 40+ métriques Workforce.',
    'hiw.s2.meta':    'Traitement en continu',
    'hiw.s3.num':     '03',
    'hiw.s3.title':   'Décidez avec confiance',
    'hiw.s3.desc':    'Tableaux de bord exécutifs, alertes proactives et rapports CODIR.',
    'hiw.s3.meta':    'Rapport CODIR inclus',

    /* use cases */
    'uc.eyebrow':     "Cas d'usage",
    'uc.h2':          'Une réponse pour chaque enjeu RH',
    'uc.lead':        'Des équipes de 50 à 50 000 collaborateurs. Stance s\'adapte.',
    'uc.0.title':     'Rétention des Talents',
    'uc.0.desc':      "Identifiez les collaborateurs à risque avant qu'ils ne partent.",
    'uc.0.stat':      '-34%',
    'uc.0.unit':      "d'attrition non planifiée",
    'uc.1.title':     'Intelligence Managériale',
    'uc.1.desc':      'Détectez les signaux faibles dans vos équipes.',
    'uc.1.stat':      '+28%',
    'uc.1.unit':      "d'engagement équipe",
    'uc.2.title':     'Planification Stratégique',
    'uc.2.desc':      'Modélisez vos scénarios de croissance RH à 12–24 mois.',
    'uc.2.stat':      '2.4×',
    'uc.2.unit':      'meilleure précision prédictive',

    /* features */
    'feat.eyebrow':   'La plateforme',
    'feat.h2a':       'Tout ce dont vos RH',
    'feat.h2b':       'ont besoin',
    'feat.0.title':   'Prédictions en Temps Réel',
    'feat.0.desc':    'Modèles ML entraînés sur 10M+ profils RH.',
    'feat.1.title':   'Rapports Exécutifs',
    'feat.1.desc':    "Tableaux de bord CODIR prêts à l'emploi.",
    'feat.2.title':   'Stance AI Copilot',
    'feat.2.desc':    'Votre analyste RH disponible 24/7.',

    /* stats */
    'stat.0.val':     '98%',
    'stat.0.label':   "précision des prédictions d'attrition",
    'stat.1.val':     '48h',
    'stat.1.label':   'pour un déploiement complet',
    'stat.2.val':     '10M+',
    'stat.2.label':   'profils analysés',
    'stat.3.val':     '3×',
    'stat.3.label':   'ROI moyen constaté',

    /* cta final */
    'cta.eyebrow':    'Commencer maintenant',
    'cta.h2':         'Prêt à voir votre workforce en temps réel ?',
    'cta.lead':       'Rejoignez les équipes RH qui prennent de l\'avance.',
    'cta.btn1':       'Demander une démo',
    'cta.btn2':       'Créer un compte gratuit',

    /* footer */
    'foot.tagline':   'Intelligence RH nouvelle génération',
    'foot.product':   'Produit',
    'foot.company':   'Société',
    'foot.resources': 'Ressources',
    'foot.legal':     'Légal',
    'foot.copy':      '© 2025 Stance. Tous droits réservés.',
    'foot.legal1':    'Confidentialité',
    'foot.legal2':    'CGU',

    /* sidebar nav */
    'd.nav.overview':    'Briefing Exécutif',
    'd.nav.attrition':   'Analytics Hub',
    'd.nav.engagement':  'Workforce Pulse',
    'd.nav.retention':   'Risk Intelligence',
    'd.nav.employee':    'Employee Intelligence',
    'd.nav.heatmaps':    'Pipelines',
    'd.nav.insights':    'Rapports sauvegardés',
    'd.nav.reports':     'Configuration',
    'd.group.Analytics': 'Analytique',
    'd.group.People':    'Personnes',
    'd.group.Workspace': 'Espace de travail',
    'd.title.overview':  'Briefing Exécutif',
    'd.title.attrition': 'Analytics Hub',
    'd.title.engagement':'Workforce Pulse',
    'd.title.retention': 'Risk Intelligence',
    'd.title.employee':  'Employee Intelligence',
    'd.title.heatmaps':  'Pipelines',
    'd.title.insights':  'Rapports sauvegardés',
    'd.title.reports':   'Configuration',
    'd.crumb.cockpit':   'Cockpit',
    'd.crumb.workspace': 'Espace de travail',

    /* kpi strip (briefing) */
    'kpi.headcount':  'Effectif total',
    'kpi.risk':       'Indice de risque',
    'kpi.retention':  'Rétention 12M',
    'kpi.enps':       'eNPS',

    /* risk categories (briefing) */
    'risk.comp':     'Rémunération',
    'risk.career':   'Parcours carrière',
    'risk.workload': 'Charge de travail',
    'risk.manager':  'Management',
    'risk.other':    'Autre',

    /* Analytics Hub (attrition) */
    'attr.kpi.exits':      'Départs projetés (12M)',
    'attr.kpi.exits.d':    '▼ 132 vs. sans action',
    'attr.kpi.highrisk':   'Employés à haut risque',
    'attr.kpi.highrisk.d': '▲ 32 signalés',
    'attr.kpi.regret':     'Attrition regrettable',
    'attr.kpi.regret.d':   '▼ 0,8 vs. N-1',
    'attr.kpi.cost':       'Coût de remplacement à risque',
    'attr.kpi.cost.d':     'adressable maintenant',
    'attr.p1.sub':         'Employés à haut risque',
    'attr.p1.title':       'Classés par score de risque modèle',
    'attr.p1.chip':        'Top 8 sur 847',
    'attr.th.emp':         'Employé',
    'attr.th.dept':        'Département',
    'attr.th.tenure':      'Ancienneté',
    'attr.th.driver':      'Facteur principal',
    'attr.th.risk':        'Risque',
    'attr.p2.sub':         'Risque par département',
    'attr.p2.title':       'Où réside le risque',
    'attr.p3.sub':         'Analyse par cohorte',
    'attr.p3.title':       "Risque par tranche d'ancienneté",
    'attr.band.1':         '< 1 an',
    'attr.band.2':         '1–2 ans',
    'attr.band.3':         '2–4 ans',
    'attr.band.4':         '4–8 ans',
    'attr.band.5':         '8 ans et +',
    'attr.p4.sub':         'Recommandations',
    'attr.p4.title':       'Actions prioritaires',
    'attr.effort':         'effort',

    /* Workforce Pulse (engagement) */
    'eng.kpi.enps':       'eNPS',
    'eng.kpi.enps.d':     '▲ 6 vs T3',
    'eng.kpi.pulse':      'Score Pulse',
    'eng.kpi.pulse.d':    '▲ 3 pts',
    'eng.kpi.part':       'Participation',
    'eng.kpi.part.d':     '▲ 4 pts',
    'eng.kpi.atrisk':     'Équipes à risque',
    'eng.kpi.atrisk.d':   'Ops · APAC',
    'eng.p1.sub':         'Tendance Pulse · 12 mois',
    'eng.p1.title':       "L'engagement se redresse",
    'eng.p2.sub':         'Par département',
    'eng.p2.title':       "Score d'engagement",
    'eng.p3.sub':         'Facteurs',
    'eng.p3.title':       "Ce qui fait bouger l'engagement",
    'eng.lg.recognition': 'Reconnaissance',
    'eng.lg.manager':     'Manager',
    'eng.lg.growth':      'Évolution',
    'eng.lg.workload':    'Charge',
    'eng.p4.sub':         'Signal faible',
    'eng.p4.title':       'Dérive engagement · Ops APAC',
    'eng.p4.body':        'Pulse −6 pts depuis T3, cadence 1:1 −22 %, corrélé avec deux transitions managériales.',
    'eng.chip.pulse':     'Pulse −6',
    'eng.chip.cadence':   '1:1 −22 %',
    'eng.chip.pto':       'Congés non pris ↑',

    /* Risk Intelligence (retention) */
    'ret.kpi.proj':     'Rétention 12M (proj.)',
    'ret.kpi.proj.d':   '▲ vs 89,8 % tendance',
    'ret.kpi.interv':   'Avec interventions',
    'ret.kpi.interv.d': '▲ +1,7 pts',
    'ret.kpi.ci':       'Intervalle de confiance',
    'ret.kpi.ci.d':     'modèle 94 %',
    'ret.kpi.stab':     'Stabilité de la workforce',
    'ret.kpi.stab.v':   'Haute',
    'ret.kpi.stab.d':   '2 unités à risque',
    'ret.p1.sub':       'Prévision · 12 mois',
    'ret.p1.title':     'Projection de la stabilité des effectifs',
    'ret.lg.projected': 'Projeté',
    'ret.lg.baseline':  'Référence (sans action)',

    /* Pipelines (heatmaps) */
    'hm.p1.sub':   "Risque d'attrition",
    'hm.p1.title': 'Risque × région',
    'hm.p2.sub':   'Charge horaire',
    'hm.p2.title': 'Heures × région',
    'hm.p3.sub':   'Engagement',
    'hm.p3.title': 'Pulse × région (inversé)',
    'hm.p4.sub':   'Écart de rémunération',
    'hm.p4.title': '% sous-bande × région',

    /* Saved Reports (insights) */
    'ins.kpi.active':    'Signaux actifs',
    'ins.kpi.active.d':  '3 haute sévérité',
    'ins.kpi.week':      'Détectés cette semaine',
    'ins.kpi.week.d':    '▲ 4 vs semaine préc.',
    'ins.kpi.conf':      'Confiance moyenne',
    'ins.kpi.conf.d':    'santé modèle : bonne',
    'ins.kpi.actions':   'Actions générées',
    'ins.kpi.actions.d': '9 priorisées',
    'ins.rec.sub':       'Recommandations générées',
    'ins.rec.title':     'Que faire ensuite',
    'ins.impact':        'Impact',
    'ins.effort':        'Effort',

    /* Config (reports) */
    'rep.intro':     "Synthèses exécutives prêtes pour le conseil, générées depuis vos données RH en temps réel. Chaque chiffre est explicable et sourcé.",
    'rep.generate':  'Générer une synthèse',

    /* Upload steps */
    'd.up.s0': 'Analyse de 12 480 lignes',
    'd.up.s1': 'Mapping des champs et nettoyage',
    'd.up.s2': 'Clustering des cohortes',
    'd.up.s3': "Score de risque d'attrition",
    'd.up.s4': 'Génération des insights',

    /* Employee back button */
    'emp.back': 'Retour au tableau de bord',

    /* dashboard */
    'd.live':               'En direct',
    'd.synced':             'Synchronisé il y a 2 min',
    'd.search':             'Rechercher personnes, équipes, signaux…',
    'd.upload':             'Importer CSV',
    'd.density.calm':       'Calm',
    'd.density.cockpit':    'Cockpit',
    'd.userrole':           'Directrice des Ressources Humaines',
    'd.fab':                'Demander à Stance',
    'd.up.title':           'Importer des données RH',
    'd.up.done':            'Analyse terminée',
    'd.up.toast':           'Analyse terminée · 7 nouveaux signaux détectés',
    'd.up.drop':            'Déposez votre CSV RH ici',
    'd.up.browse':          'ou cliquez pour parcourir — Stance mappe et analyse automatiquement',
    'd.cop.greeting':       "Bonjour — je suis votre Copilote Stance. Posez-moi n'importe quelle question sur vos données RH.",
    'd.cop.sub':            '12 480 dossiers employés lus',
    'd.cop.ph':             "Demandez sur l'attrition, l'engagement, la rétention…",
    'd.cop.ask':            'Demander',
    'd.cop.s1':             "Pourquoi l'attrition augmente-t-elle aux Ventes EMEA ?",
    'd.cop.s2':             'Prévoir la rétention prochain trimestre',
    'd.cop.s3':             "Où le risque d'épuisement est-il le plus élevé ?",
    'd.cop.s4':             'Rédiger le résumé pour le conseil',
    'd.sum.ai':             'Généré par IA',
    'd.sum.for':            'PRÉPARÉ POUR',
    'd.sum.emp':            '12 480 EMPLOYÉS',
    'd.sum.export':         'Exporter PDF',
    'd.sum.close':          'Fermer',

    /* briefing */
    'bf.metaline':          'Briefing exécutif · déc. 2026 · 12 480 employés',
    'bf.gauge':             'Score de Santé de la Workforce',
    'bf.healthStatus':      'Sain · en amélioration',
    'bf.narr':              "Le risque est concentré, pas systémique — 2 unités sur 14 concentrent 64 % des départs projetés. Agir maintenant protège ~1,4 M€ de coûts de remplacement.",
    'bf.confSub':           'Fiabilité du briefing',
    'bf.confTitle':         'Confiance IA',
    'bf.conf1':             "Confiance de l'analyse",
    'bf.conf2':             'Fiabilité de la prévision',
    'bf.stabSub':           '12 dernières semaines',
    'bf.stabTitle':         'La stabilité de la Workforce s\'améliore',
    'bf.stab.note':         "IA Insight : Supprimer les 3 principaux facteurs d'attrition est modélisé pour maintenir la tendance améliorée au T2.",
    'bf.retSub':            'Prévision · 12 mois',
    'bf.retTitle':          'Projection de rétention',
    'bf.retLabel':          'Rétention',
    'bf.ret.with':          'Avec actions : 93,1 %',
    'bf.topRiskSub':        "Répartition des facteurs de départ",
    'bf.topRiskTitle':      'Top catégories de risque',
    'bf.heatSub':           'Risque attrition · région × département',
    'bf.heatTitle':         'Attrition par région',
    'bf.critSub':           'Signaux critiques',
    'bf.needsTitle':        'Nécessite attention',
    'bf.spotSub':           'Focus employé',
    'bf.spotTitle':         'Risque de départ le plus élevé',
    'bf.spotLine':          'Closeuse top-5%, signaux d\'engagement en baisse. Fenêtre de 6–8 semaines pour agir.',
    'bf.recSub':            'Généré par IA',
    'bf.recTitle':          'Recommandations stratégiques',
    'bf.wcSub':             'Depuis le mois dernier',
    'bf.wcTitle':           'Ce qui a changé',
    'bf.wc.attrition':      'Risque d\'attrition',
    'bf.wc.engagement':     'Engagement',
    'bf.wc.promo':          'Vélocité de promotion',
    'bf.wc.overtime':       'Charge horaire',

    /* employee */
    'emp.shortlist':        'Sélection',
    'emp.dna':              'ADN Employé · archétype IA',
    'emp.dept':             'Département',
    'emp.role':             'Poste',
    'emp.base':             'Lieu',
    'emp.tenure':           'Ancienneté',
    'emp.profile':          'Profil',
    'emp.riskScore':        'Score de risque',
    'emp.risklevel':        'Niveau de risque',
    'emp.radar.sub':        'Profil Workforce',
    'emp.radar.title':      'Radar performance & rétention',
    'emp.radar.chip':       'Modèle 8 dimensions',
    'emp.summary.sub':      'Synthèse IA',
    'emp.summary.title':    'Lecture scouting',
    'emp.summary.conf':     'Confiance 92 %',
    'emp.summary.model':    'Modèle · Stance People-Intelligence v4',
    'emp.summary.updated':  'Mis à jour il y a 2h',
    'emp.actions.sub':      'Actions recommandées',
    'emp.actions.title':    'Le plan de rétention',
    'emp.actions.moves':    'actions',
    'emp.factors.sub':      'Facteurs de risque principaux',
    'emp.factors.title':    'Ce qui influence le score',
    'emp.effort':           'Effort',

    /* values */
    'val.risk.Critical':    'Critique',
    'val.risk.High':        'Élevé',
    'val.risk.Moderate':    'Modéré',
    'val.risk.Low':         'Faible',
    'val.effort.Low':       'Faible',
    'val.effort.Medium':    'Moyen',
    'val.effort.High':      'Élevé',
    'val.pri.hi':           'Élevé',
    'val.pri.md':           'Moyen',
    'val.status.Ready':     'Prêt',
    'val.status.Draft':     'Brouillon',
    'val.driver.Compensation': 'Rémunération',
    'val.driver.Career path':  'Parcours',
    'val.driver.Workload':     'Charge',
    'val.driver.Manager':      'Manager',

    /* ---- landing page nav ---- */
    'nav.ask':      'Demandez à Stance',
    'nav.how':      'Comment ça marche',
    'nav.usecases': "Cas d'usage",
    'nav.signin':   'Connexion',
    'nav.demo':     'Demander une démo',
    'nav.lang':     'Langue',
    'nav.lightmode': 'Mode clair',
    'nav.darkmode':  'Mode sombre',

    /* ---- hero ---- */
    'hero.pill':  'Intelligence RH Executive',
    'hero.h1':    'Le Copilote IA<br><span class="grad">pour les Décisions<br>RH Stratégiques.</span>',
    'hero.lead':  "Stance analyse chaque signal RH et fournit les prévisions dont votre direction a besoin pour agir. Pas un tableau de bord. Un moteur de décision.",
    'hero.cta1':  'Essayer la démo',
    'hero.cta2':  'Voir Stance en action',

    /* ---- stage (dashboard preview) ---- */
    'stage.health':       'Score de Santé de la Workforce',
    'stage.healthy':      'Sain',
    'stage.health.delta': '▲ 3 pts vs. trimestre précédent',
    'stage.risk':         'Indice de Risque de la Workforce',
    'stage.moderate':     'Modéré',
    'stage.risk.delta':   '▼ 5 pts — risque en baisse',
    'stage.fc.label':     'Prévision de la Workforce · 12 mois',
    'stage.fc.title':     "Attrition projetée à 14 % au T4",
    'stage.now':          'MAINTENANT',
    'stage.exec':         'Résumé Exécutif',
    'stage.exec.narr':    'La santé de la workforce est <b>stable et en amélioration</b>. Le risque reste concentré sur <b>2 des 14 unités</b>. Agir maintenant permettrait de protéger <span class="pos">4,2 M€</span> de coûts de remplacement et <b>140 postes</b> sur les 12 prochains mois.',
    'stage.rec':          'Recommandations IA',
    'stage.rec1.t':       'Prioriser la rétention Ventes EMEA',
    'stage.rec1.s':       'Révision ciblée des rémunérations · ~140 postes à risque.',
    'stage.rec2.t':       'Rééquilibrer la charge Engineering',
    'stage.rec2.s':       'Heures supp. +42 % · cluster d\'épuisement en formation.',
    'stage.ph':           'Posez votre question ici',
    'stage.ask':          'Demander',

    /* ---- ask stance section ---- */
    'ask.eyebrow': 'Interrogez Stance',
    'ask.h2':      'Posez la question. <span class="grad">Obtenez la décision.</span>',
    'ask.lead':    "Stance analyse chaque signal RH et répond en langage naturel — avec le raisonnement, la confiance et l'action recommandée derrière chaque réponse.",
    'ask.query':   'Question exécutive',

    /* ---- how it works ---- */
    'how.eyebrow':  'Comment ça marche',
    'how.h2':       'De données éparses aux <span class="grad">décisions stratégiques.</span>',
    'how.lead':     'Trois étapes de la donnée brute aux recommandations exécutives — sans équipe data, sans projets trimestriels.',
    'how.s1.t':     'Connectez',
    'how.s1.p':     'Synchronisez votre SIRH, enquêtes, paie et tableurs en quelques minutes. Stance cartographie et unifie vos données RH automatiquement.',
    'how.s1.meta':  'SIRH · <b>40+ connecteurs</b>',
    'how.s2.t':     'Analysez',
    'how.s2.p':     "L'IA détecte les tendances, risques et opportunités cachés à travers les unités — en scorant chaque signal et en expliquant les facteurs sous-jacents.",
    'how.s2.meta':  'Moteur IA · <b>explicable</b>',
    'how.s3.t':     'Décidez',
    'how.s3.p':     'Recevez des recommandations exécutives, des prévisions et des briefings prêts pour le conseil — avec la confiance et le raisonnement pour agir maintenant.',
    'how.s3.meta':  'Livrable · <b>prêt à décider</b>',

    /* ---- use cases ---- */
    'uc.eyebrow': "Cas d'usage",
    'uc.h2':      'Conçu pour les décisions <span class="grad">qui font avancer l\'entreprise.</span>',
    'uc.lead':    "Du risque talent à la succession, Stance transforme les données RH en résultats stratégiques sur lesquels le leadership est évalué.",
    'uc1.t':  "Réduire l'Attrition",
    'uc1.p':  "Identifiez les départs regrettés avant qu'ils n'arrivent et agissez sur les leviers de rémunération, charge et management.",
    'uc1.v':  '−4,2 M€',
    'uc1.s':  'de coûts de remplacement protégés',
    'uc2.t':  "Détecter l'Épuisement",
    'uc2.p':  "Détectez les clusters d'épuisement depuis les heures supplémentaires, les congés et la charge — des semaines avant qu'ils n'apparaissent dans les enquêtes.",
    'uc2.s':  'de pic de suractivité détecté',
    'uc3.t':  'Améliorer la Rétention',
    'uc3.p':  "Modélisez l'impact des interventions avant d'investir, et allouez le budget de rétention là où il fait la différence.",
    'uc3.s':  'de rétention projetée sur 12 mois',
    'uc4.t':  'Prévision de la Workforce',
    'uc4.p':  'Projetez effectifs, attrition et coûts sur 3–24 mois, avec modélisation de scénarios pour chaque plan stratégique.',
    'uc4.v':  '24 mois',
    'uc4.s':  "d'horizon prédictif",
    'uc5.t':  'Détection du Risque Talent',
    'uc5.p':  'Scorez le risque de départ dans chaque unité et cohorte — classé, expliqué et prêt pour la revue de direction.',
    'uc5.s':  'unités scorées en continu',
    'uc6.t':  'Planification de la Succession',
    'uc6.p':  "Identifiez l'exposition aux rôles critiques et la profondeur du banc pour que les transitions de leadership ne surprennent jamais le conseil.",
    'uc6.v':  '2 sur 14',
    'uc6.s':  'unités signalées à risque',

    /* ---- features ---- */
    'feat.eyebrow': 'Les capacités',
    'feat.h2':      'Intelligence RH, <span class="grad" style="font-family:Sora">de bout en bout.</span>',
    'feat.lead':    "Stance s'intègre au-dessus de votre SIRH, enquêtes et tableurs — transformant les signaux qui influencent la rétention, la performance et les coûts en décisions actionnables.",
    'feat1.t':  'Détecter le risque RH',
    'feat1.p':  "Identifiez les risques d'attrition, d'épuisement et d'engagement avant qu'ils n'impactent votre P&L — avec un scoring IA explicable sur chaque signal.",
    'feat2.t':  'Générer des insights exécutifs',
    'feat2.p':  "Posez n'importe quelle question RH en langage naturel. Stance lit vos données et retourne des réponses prêtes pour le conseil — avec raisonnement et sources.",
    'feat3.t':  'Agir sur les prévisions',
    'feat3.p':  'Déclenchez des interventions, alertes et briefings prêts pour le conseil à partir des signaux qui comptent — sur calendrier ou en temps réel.',

    /* ---- final CTA ---- */
    'cta.eyebrow': 'Intelligence RH Executive',
    'cta.h2':      'Pilotez la stratégie RH avec <span class="grad">une aide à la décision.</span>',
    'cta.lead':    "Rejoignez les équipes de direction qui utilisent Stance pour anticiper les risques RH, agir sur les recommandations IA et décider avec confiance — des trimestres à l'avance.",
    'cta.see':     'Voir Stance en action',
    'cta.demo':    'Demander une démo',

    /* ---- footer ---- */
    'foot.features':  'Fonctionnalités',
    'foot.dashboard': 'Tableau de bord',
    'foot.meta':      '© 2026 Stance · SOC 2 Type II · RGPD · ISO 27001',
  };

  /* ---- state ---- */
  let _lang = 'EN';

  /* ---- core ---- */
  function getLang() { return _lang; }

  function t(key, fallback) {
    if (_lang === 'FR' && FR[key] !== undefined) return FR[key];
    return fallback !== undefined ? fallback : key;
  }

  /* Walk the DOM and apply [data-i18n], [data-i18n-html], [data-i18n-ph] */
  function applyStatic(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function(el) {
      var k = el.getAttribute('data-i18n');
      if (!el.hasAttribute('data-orig')) el.setAttribute('data-orig', el.textContent);
      var v = (_lang === 'EN') ? el.getAttribute('data-orig') : t(k);
      if (v !== null && v !== undefined) el.textContent = v;
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function(el) {
      var k = el.getAttribute('data-i18n-html');
      if (!el.hasAttribute('data-orig-html')) el.setAttribute('data-orig-html', el.innerHTML);
      var v = (_lang === 'EN') ? el.getAttribute('data-orig-html') : t(k);
      if (v !== null && v !== undefined) el.innerHTML = v;
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
      var k = el.getAttribute('data-i18n-ph');
      if (!el.hasAttribute('data-orig-ph')) el.setAttribute('data-orig-ph', el.getAttribute('placeholder') || '');
      var v = (_lang === 'EN') ? el.getAttribute('data-orig-ph') : t(k);
      if (v !== null && v !== undefined) el.setAttribute('placeholder', v);
    });
  }

  function wire(el, key, prop) {
    prop = prop || 'textContent';
    var update = function() { el[prop] = t(key); };
    window.addEventListener('stance:lang', update);
    update();
    return function() { window.removeEventListener('stance:lang', update); };
  }

  /* Sync .on class on every .lang-opt[data-lang] button in the page */
  function syncButtons() {
    document.querySelectorAll('.lang-opt[data-lang]').forEach(function(btn) {
      btn.classList.toggle('on', btn.dataset.lang.toUpperCase() === _lang);
    });
  }

  function setLang(lang) {
    lang = String(lang).toUpperCase();
    if (lang !== 'EN' && lang !== 'FR') return;
    if (lang === _lang) return;
    _lang = lang;
    try { localStorage.setItem('stance_lang', lang); } catch(e) {}
    applyStatic();
    syncButtons();
    window.dispatchEvent(
      new CustomEvent('stance:lang', { detail: lang, bubbles: false })
    );
  }

  /* Wire all .lang-opt[data-lang] buttons — works on landing AND dashboard */
  function wireButtons() {
    document.querySelectorAll('.lang-opt[data-lang]').forEach(function(btn) {
      btn.addEventListener('click', function() { setLang(btn.dataset.lang); });
    });
    syncButtons();
  }

  /* Snapshot original EN content before any translation */
  function snapshotOriginals(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function(el) {
      if (!el.hasAttribute('data-orig')) el.setAttribute('data-orig', el.textContent);
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function(el) {
      if (!el.hasAttribute('data-orig-html')) el.setAttribute('data-orig-html', el.innerHTML);
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
      if (!el.hasAttribute('data-orig-ph')) el.setAttribute('data-orig-ph', el.getAttribute('placeholder') || '');
    });
  }

  /* ---- init ---- */
  (function init() {
    var stored;
    try { stored = localStorage.getItem('stance_lang'); } catch(e) {}
    if (stored === 'FR') { _lang = 'FR'; }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { snapshotOriginals(); applyStatic(); wireButtons(); });
    } else {
      snapshotOriginals();
      applyStatic();
      wireButtons();
    }
  })();

  /* ---- public API ---- */
  function T(key, fallback) {
    if (_lang === 'FR') {
      var val = FR[key];
      if (val !== undefined) return val;
    }
    return fallback !== undefined ? fallback : key;
  }

  global.StanceI18N = { setLang: setLang, getLang: getLang, t: t, T: T, applyStatic: applyStatic, wire: wire };

  /* window.T — global shorthand consumed by all JSX components */
  global.T = T;

}(window));
