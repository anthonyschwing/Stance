/* HUMIND dashboard — mock data & canned intelligence (window.HUMIND) */
window.HUMIND = (function () {
  const departments = [
    { name: 'EMEA Sales',     head: 412,  risk: 0.82, eng: 58, otime: 0.22, region: 'EMEA' },
    { name: 'Platform Eng',   head: 318,  risk: 0.71, eng: 64, otime: 0.41, region: 'AMER' },
    { name: 'Customer Success',head: 256, risk: 0.46, eng: 72, otime: 0.18, region: 'EMEA' },
    { name: 'Product',        head: 184,  risk: 0.34, eng: 78, otime: 0.20, region: 'AMER' },
    { name: 'Operations',     head: 540,  risk: 0.60, eng: 61, otime: 0.33, region: 'APAC' },
    { name: 'Marketing',      head: 132,  risk: 0.28, eng: 80, otime: 0.12, region: 'EMEA' },
    { name: 'Finance & G&A',  head: 210,  risk: 0.22, eng: 83, otime: 0.10, region: 'AMER' },
    { name: 'Data & AI',      head: 96,   risk: 0.39, eng: 76, otime: 0.26, region: 'AMER' }
  ];

  const highRisk = [
    { name: 'A. Bernard',   dept: 'EMEA Sales',   tenure: '1.4y', risk: 91, driver: 'Compensation', salary: '€72k' },
    { name: 'M. Laurent',   dept: 'EMEA Sales',   tenure: '1.1y', risk: 88, driver: 'Career path',  salary: '€68k' },
    { name: 'J. Okonkwo',   dept: 'Platform Eng', tenure: '2.0y', risk: 86, driver: 'Workload',      salary: '€95k' },
    { name: 'S. Petrov',    dept: 'Operations',   tenure: '0.9y', risk: 84, driver: 'Manager',       salary: '€54k' },
    { name: 'L. Moreau',    dept: 'EMEA Sales',   tenure: '1.7y', risk: 82, driver: 'Compensation', salary: '€70k' },
    { name: 'R. Tanaka',    dept: 'Operations',   tenure: '1.3y', risk: 79, driver: 'Workload',      salary: '€51k' },
    { name: 'D. Schmidt',   dept: 'Platform Eng', tenure: '2.2y', risk: 77, driver: 'Workload',      salary: '€92k' },
    { name: 'C. Rossi',     dept: 'Data & AI',    tenure: '1.0y', risk: 74, driver: 'Career path',  salary: '€88k' }
  ];

  const recommendations = [
    { id: 'R1', title: 'Targeted retention for 38 high-risk EMEA reps', impact: '−9% attrition · protects ~€1.4M', effort: 'Medium',
      titleFr: 'Rétention ciblée pour 38 commerciaux EMEA à haut risque', impactFr: "−9 % d'attrition · protège ~1,4 M€" },
    { id: 'R2', title: 'Rebalance on-call & after-hours load in Platform Eng', impact: '−6 pts burnout index', effort: 'Low',
      titleFr: "Rééquilibrer l'astreinte & les heures hors cadre en Platform Eng", impactFr: "−6 pts d'indice d'épuisement" },
    { id: 'R3', title: 'Manager enablement sprint for Operations APAC', impact: '+5 pts engagement (proj.)', effort: 'Medium',
      titleFr: "Sprint d'accompagnement des managers pour Operations APAC", impactFr: "+5 pts d'engagement (proj.)" },
    { id: 'R4', title: 'Compensation review for 1–2y tenure band', impact: 'Addresses 42% of risk drivers', effort: 'High',
      titleFr: 'Révision de rémunération pour la tranche 1–2 ans', impactFr: 'Adresse 42 % des facteurs de risque' }
  ];

  const retention = [99.2, 98.4, 97.6, 96.9, 96.1, 95.4, 94.8, 94.2, 93.6, 93.1, 92.6, 91.4];
  const attrition8w = [40, 46, 58, 72, 96, 124, 150, 166, 178, 184, 188, 190].map(v => 200 - v);
  const engagementTrend = [69, 70, 71, 70, 72, 73, 74, 75, 74, 76, 77, 78];

  const insights = [
    { sev: 'red',   tag: 'Attrition · Predictive', title: 'Attrition spike forming in EMEA Sales',
      body: 'The 1–2y tenure cohort shows +31% flight risk over 6 weeks, driven primarily by compensation (42%). 38 reps are above the 80-risk threshold.',
      meta: ['Confidence 94%', 'Impact ~€1.4M', '6w trend'],
      tagFr: 'Attrition · Prédictif', titleFr: "Pic d'attrition en formation aux Ventes EMEA",
      bodyFr: 'La cohorte 1–2 ans montre +31 % de risque de départ sur 6 semaines, principalement porté par la rémunération (42 %). 38 commerciaux dépassent le seuil de risque de 80.',
      metaFr: ['Confiance 94 %', 'Impact ~1,4 M€', 'tendance 6 sem.'] },
    { sev: 'amber', tag: 'Burnout · Weak signal', title: 'Burnout precursor in Platform Engineering',
      body: 'After-hours activity is up 42% over 3 weeks with PTO utilization falling. Historically precedes a 9-pt engagement drop within a quarter.',
      meta: ['Confidence 88%', 'Eng team', '3w trend'],
      tagFr: 'Épuisement · Signal faible', titleFr: "Précurseur d'épuisement en ingénierie plateforme",
      bodyFr: "L'activité hors heures est en hausse de 42 % sur 3 semaines avec une baisse de l'utilisation des congés. Précède historiquement une chute d'engagement de 9 pts en un trimestre.",
      metaFr: ['Confiance 88 %', 'Équipe Eng', 'tendance 3 sem.'] },
    { sev: 'cyan',  tag: 'Engagement · Drift', title: 'Engagement drift in Operations (APAC)',
      body: 'Pulse score down 6 points since Q3 with 1:1 cadence down 22%. Correlated with two manager transitions.',
      meta: ['Confidence 82%', 'APAC', 'Since Q3'],
      tagFr: 'Engagement · Dérive', titleFr: "Dérive d'engagement aux Operations (APAC)",
      bodyFr: 'Score de pouls en baisse de 6 points depuis le T3 avec une cadence des 1:1 en baisse de 22 %. Corrélé à deux transitions de manager.',
      metaFr: ['Confiance 82 %', 'APAC', 'Depuis le T3'] },
    { sev: 'green', tag: 'Retention · Positive', title: 'Marketing retention stabilizing',
      body: 'Targeted comp adjustments in Q2 reduced regretted attrition by 11%. Pattern is repeatable for at-risk Sales cohorts.',
      meta: ['Confidence 90%', 'Validated', 'Q2→Q4'],
      tagFr: 'Rétention · Positif', titleFr: 'La rétention Marketing se stabilise',
      bodyFr: "Les ajustements ciblés de rémunération au T2 ont réduit l'attrition regrettée de 11 %. Schéma reproductible pour les cohortes Ventes à risque.",
      metaFr: ['Confiance 90 %', 'Validé', 'T2→T4'] }
  ];

  const summaries = [
    { title: 'Q4 Workforce Review', date: 'Dec 2026', for: 'Executive Committee', status: 'Ready',
      head: 'Attrition risk is concentrated, not systemic.',
      lines: [
        ['01', 'Two units drive 64% of projected exits', 'EMEA Sales & Platform Engineering, both 1–2y tenure.'],
        ['02', 'Compensation & workload are the top drivers', '42% comp · 18% workload, explainable per cohort.'],
        ['03', 'Acting now protects ~€1.4M', 'In cost-to-replace over the next two quarters.']
      ],
      titleFr: 'Revue RH T4', dateFr: 'déc. 2026', forFr: 'Comité exécutif', statusFr: 'Prêt',
      headFr: "Le risque d'attrition est concentré, pas systémique.",
      linesFr: [
        ['01', 'Deux unités concentrent 64 % des départs projetés', 'Ventes EMEA & Platform Engineering, ancienneté 1–2 ans.'],
        ['02', 'Rémunération & charge sont les principaux facteurs', '42 % rému · 18 % charge, explicable par cohorte.'],
        ['03', 'Agir maintenant protège ~1,4 M€', 'En coût de remplacement sur les deux prochains trimestres.']
      ] },
    { title: 'Engagement Pulse — APAC', date: 'Nov 2026', for: 'Regional Leadership', status: 'Ready',
      head: 'Engagement drift traced to manager transitions.', lines: [],
      titleFr: "Pouls d'engagement — APAC", dateFr: 'nov. 2026', forFr: 'Direction régionale', statusFr: 'Prêt',
      headFr: 'Dérive d’engagement liée aux transitions de manager.', linesFr: [] },
    { title: 'Burnout Early-Warning', date: 'Nov 2026', for: 'Eng Leadership', status: 'Draft', head: 'Platform Eng after-hours load trending up.', lines: [],
      titleFr: "Alerte précoce d'épuisement", dateFr: 'nov. 2026', forFr: 'Direction Eng', statusFr: 'Brouillon', headFr: 'Charge hors heures en hausse en Platform Eng.', linesFr: [] }
  ];

  const RADAR_AXES = ['Leadership', 'Performance', 'Engagement', 'Wellbeing', 'Retention', 'Learning Agility', 'Collaboration', 'Stability'];
  const RADAR_AXES_FR = ['Leadership', 'Performance', 'Engagement', 'Bien-être', 'Rétention', "Agilité d'apprentissage", 'Collaboration', 'Stabilité'];

  const employees = [
    {
      id: 'amara', name: 'Amara Bernard', initials: 'AB', role: 'Senior Account Executive', pos: 'AE',
      dept: 'EMEA Sales', region: 'Paris · EMEA', tenure: '1.4y', age: 31, reports: 'IC',
      riskScore: 91, riskLevel: 'Critical',
      archetype: 'The Flight Risk',
      archetypeLine: 'Elite closer, quietly disengaging — a top-quartile performer whose loyalty is eroding faster than the org realises.',
      stats: [64, 86, 42, 48, 16, 74, 70, 33],
      deltas: [1, 2, -6, -4, -9, 1, 0, -5],
      summary: 'Amara is a **top-5% closer** carrying 142% of quota, but every engagement signal is bending the wrong way. Compensation sits **11% below band** for her output, her last two 1:1s were declined, and external-profile activity is up sharply. The model reads a **6–8 week window** before the decision hardens. This is a save worth making — replacing her costs an estimated **€84k** and 9 months of ramp.',
      actions: [
        { p: 'A', title: 'Off-cycle compensation correction', impact: 'Closes the 11% band gap · −38 risk pts', effort: 'Low', pr: 'hi' },
        { p: 'B', title: 'Skip-level retention conversation', impact: 'Surfaces intent · re-opens 1:1 cadence', effort: 'Low', pr: 'hi' },
        { p: 'C', title: 'Define 18-month path to Enterprise AE', impact: 'Addresses career-ceiling driver', effort: 'Medium', pr: 'md' }
      ],
      factors: [
        { label: 'Compensation gap', w: 42, trend: 'up' },
        { label: 'Career stagnation', w: 24, trend: 'up' },
        { label: 'Manager rapport', w: 18, trend: 'flat' },
        { label: 'Workload & quota strain', w: 16, trend: 'up' }
      ],
      fr: {
        archetype: 'Le risque de départ',
        archetypeLine: "Closeuse d'élite en désengagement silencieux — une performeuse du quartile supérieur dont la loyauté s'érode plus vite que l'organisation ne le perçoit.",
        summary: "Amara fait partie des **5 % de meilleurs closeurs**, à 142 % de son quota, mais tous les signaux d'engagement s'infléchissent dans le mauvais sens. Sa rémunération est **11 % sous la bande** au regard de sa production, ses deux derniers 1:1 ont été annulés et son activité sur les profils externes augmente fortement. Le modèle estime une **fenêtre de 6 à 8 semaines** avant que la décision ne se durcisse. Une rétention qui en vaut la peine — la remplacer coûterait environ **84 k€** et 9 mois de montée en compétence.",
        actions: [
          { title: 'Correction salariale hors cycle', impact: "Comble l'écart de 11 % · −38 pts de risque" },
          { title: 'Entretien de rétention en skip-level', impact: "Révèle l'intention · relance la cadence des 1:1" },
          { title: 'Définir un parcours de 18 mois vers Enterprise AE', impact: 'Traite le plafond de carrière' }
        ],
        factors: ['Écart de rémunération', 'Stagnation de carrière', 'Relation managériale', 'Charge & pression sur le quota']
      }
    },
    {
      id: 'jaden', name: 'Jaden Okonkwo', initials: 'JO', role: 'Staff Platform Engineer', pos: 'ENG',
      dept: 'Platform Engineering', region: 'Austin · AMER', tenure: '2.0y', age: 34, reports: 'IC',
      riskScore: 86, riskLevel: 'High',
      archetype: 'The Specialist',
      archetypeLine: 'Irreplaceable depth in one domain — carrying load no one else can, and the load is starting to carry him.',
      stats: [58, 90, 60, 44, 52, 82, 64, 70],
      deltas: [0, 2, -1, -7, -2, 3, 1, -1],
      summary: 'Jaden is the **single owner** of the core ingestion platform — a genuine bus-factor risk. Delivery quality is elite, but after-hours commits are up **42% over three weeks** and PTO is going unused, the same pattern that preceded his last near-exit. He is not actively looking, but **wellbeing is the failure mode here**, not poaching. Reduce the load before the engagement drop arrives, not after.',
      actions: [
        { p: 'A', title: 'Rebalance on-call & ingestion ownership', impact: 'Removes bus-factor · −6 burnout pts', effort: 'Medium', pr: 'hi' },
        { p: 'B', title: 'Backfill a second platform engineer', impact: 'Protects continuity of critical system', effort: 'High', pr: 'md' },
        { p: 'C', title: 'Staff→Principal growth conversation', impact: 'Recognises scope, renews motivation', effort: 'Low', pr: 'md' }
      ],
      factors: [
        { label: 'Workload concentration', w: 38, trend: 'up' },
        { label: 'Burnout precursor signals', w: 26, trend: 'up' },
        { label: 'Recognition gap', w: 20, trend: 'flat' },
        { label: 'Compensation vs market', w: 16, trend: 'flat' }
      ],
      fr: {
        archetype: 'Le spécialiste',
        archetypeLine: "Profondeur irremplaçable sur un domaine — il porte une charge que nul autre ne peut assumer, et cette charge commence à le porter.",
        summary: "Jaden est l'**unique propriétaire** de la plateforme d'ingestion centrale — un véritable risque de bus-factor. La qualité de livraison est élite, mais les commits hors heures sont en hausse de **42 % sur trois semaines** et les congés restent inutilisés, le même schéma qui a précédé son précédent quasi-départ. Il ne cherche pas activement, mais **le bien-être est le mode de défaillance ici**, pas le débauchage. Réduisez la charge avant l'arrivée de la baisse d'engagement, pas après.",
        actions: [
          { title: "Rééquilibrer l'astreinte & la propriété de l'ingestion", impact: "Supprime le bus-factor · −6 pts d'épuisement" },
          { title: 'Recruter un second ingénieur plateforme', impact: 'Protège la continuité du système critique' },
          { title: 'Conversation de croissance Staff→Principal', impact: 'Reconnaît le périmètre, renouvelle la motivation' }
        ],
        factors: ['Concentration de la charge', "Signes précurseurs d'épuisement", 'Manque de reconnaissance', 'Rémunération vs marché']
      }
    },
    {
      id: 'chiara', name: 'Chiara Rossi', initials: 'CR', role: 'Machine Learning Engineer', pos: 'ML',
      dept: 'Data & AI', region: 'Milan · EMEA', tenure: '1.0y', age: 27, reports: 'IC',
      riskScore: 32, riskLevel: 'Low',
      archetype: 'The Emerging Leader',
      archetypeLine: 'Steepest trajectory in the cohort — technically excellent and already pulling the team upward without the title.',
      stats: [80, 84, 82, 76, 78, 88, 85, 80],
      deltas: [5, 3, 2, 1, 2, 4, 3, 2],
      summary: 'Chiara is the **highest-trajectory profile** in Data & AI. Peers already route decisions through her, her learning velocity is top-decile, and engagement is strong across the board. Risk is **low today but not zero** — high performers like this leave when the growth ceiling appears before the opportunity does. The play is offence: give her the stretch now and you convert a flight risk you would otherwise create in 12 months.',
      actions: [
        { p: 'A', title: 'Nominate for the leadership-track cohort', impact: 'Converts trajectory into retention', effort: 'Low', pr: 'hi' },
        { p: 'B', title: 'Assign a cross-team stretch project', impact: 'Tests scope · raises growth ceiling', effort: 'Medium', pr: 'md' },
        { p: 'C', title: 'Pair as mentor for two junior MLEs', impact: 'Builds the leadership muscle early', effort: 'Low', pr: 'md' }
      ],
      factors: [
        { label: 'Growth ceiling (12m horizon)', w: 40, trend: 'up' },
        { label: 'External market demand', w: 30, trend: 'up' },
        { label: 'Compensation vs trajectory', w: 18, trend: 'flat' },
        { label: 'Workload balance', w: 12, trend: 'flat' }
      ],
      fr: {
        archetype: 'Le leader émergent',
        archetypeLine: "La trajectoire la plus forte de la cohorte — techniquement excellente et tirant déjà l'équipe vers le haut sans le titre.",
        summary: "Chiara est le **profil à plus forte trajectoire** de Data & AI. Ses pairs lui adressent déjà les décisions, sa vélocité d'apprentissage est dans le top-décile et l'engagement est solide sur tous les plans. Le risque est **faible aujourd'hui mais pas nul** — les hauts potentiels comme elle partent quand le plafond de croissance apparaît avant l'opportunité. Le bon coup est offensif : donnez-lui le défi maintenant et vous convertissez un risque de départ que vous créeriez sinon dans 12 mois.",
        actions: [
          { title: 'Nominer pour la cohorte leadership-track', impact: 'Convertit la trajectoire en rétention' },
          { title: 'Confier un projet transverse ambitieux', impact: 'Teste le périmètre · relève le plafond de croissance' },
          { title: 'Mentorat de deux MLE juniors', impact: 'Développe la fibre leadership tôt' }
        ],
        factors: ['Plafond de croissance (12 mois)', 'Demande du marché externe', 'Rémunération vs trajectoire', 'Équilibre de la charge']
      }
    },
    {
      id: 'sofia', name: 'Sofia Petrov', initials: 'SP', role: 'Operations Lead', pos: 'OPS',
      dept: 'Operations', region: 'Singapore · APAC', tenure: '0.9y', age: 29, reports: '6 reports',
      riskScore: 58, riskLevel: 'Moderate',
      archetype: 'The High Performer',
      archetypeLine: 'Dependable engine of the APAC team — strong output now wobbling under a recent manager change.',
      stats: [72, 88, 66, 58, 60, 70, 78, 64],
      deltas: [1, 1, -4, -2, -1, 1, 2, -2],
      summary: 'Sofia is the **operational backbone** of APAC — consistently high output and trusted by her six reports. The flag is **environmental, not personal**: a manager transition six weeks ago cut her 1:1 cadence by 22% and her pulse score has drifted −6. Caught early this is fully recoverable; left alone it compounds into a mid-tenure exit. The lever is **managerial, low-cost, and fast**.',
      actions: [
        { p: 'A', title: 'Restore weekly 1:1 cadence with new manager', impact: 'Reverses the −6 pulse drift', effort: 'Low', pr: 'hi' },
        { p: 'B', title: 'Clarify scope & decision rights post-reorg', impact: 'Removes ambiguity driver', effort: 'Low', pr: 'md' },
        { p: 'C', title: 'Public recognition for Q3 delivery', impact: '+4 engagement pts (modeled)', effort: 'Low', pr: 'md' }
      ],
      factors: [
        { label: 'Manager transition', w: 34, trend: 'up' },
        { label: 'Engagement drift', w: 26, trend: 'up' },
        { label: 'Workload & scope ambiguity', w: 22, trend: 'flat' },
        { label: 'Recognition gap', w: 18, trend: 'flat' }
      ],
      fr: {
        archetype: 'La haute performeuse',
        archetypeLine: "Moteur fiable de l'équipe APAC — une production solide qui vacille sous un récent changement de manager.",
        summary: "Sofia est la **colonne vertébrale opérationnelle** de l'APAC — production constamment élevée et confiance de ses six collaborateurs. Le signal est **environnemental, pas personnel** : une transition de manager il y a six semaines a réduit la cadence de ses 1:1 de 22 % et son score de pouls a dérivé de −6. Détecté tôt, c'est totalement récupérable ; laissé seul, cela se transforme en départ en milieu d'ancienneté. Le levier est **managérial, peu coûteux et rapide**.",
        actions: [
          { title: 'Rétablir la cadence hebdomadaire des 1:1 avec le nouveau manager', impact: 'Inverse la dérive de −6 du pouls' },
          { title: 'Clarifier le périmètre & les droits de décision post-réorg', impact: "Supprime le facteur d'ambiguïté" },
          { title: 'Reconnaissance publique de la livraison du T3', impact: '+4 pts d’engagement (modélisé)' }
        ],
        factors: ['Transition de manager', "Dérive d'engagement", 'Charge & ambiguïté de périmètre', 'Manque de reconnaissance']
      }
    }
  ];

  const copilot = [
    { keys: ['emea', 'sales', 'attrition', 'why', 'vente'], a: 'EMEA Sales attrition is driven by the **1–2y tenure cohort** (+31% risk over 6 weeks). Top drivers: **compensation (42%)** and **career path (24%)**. 38 reps sit above the 80-risk threshold. Recommended: targeted retention — modeled at **−9% attrition**, protecting **~€1.4M** in cost-to-replace this quarter.',
      aFr: "L'attrition des Ventes EMEA est portée par la **cohorte 1–2 ans** (+31 % de risque sur 6 semaines). Facteurs principaux : **rémunération (42 %)** et **parcours de carrière (24 %)**. 38 commerciaux dépassent le seuil de risque de 80. Recommandé : rétention ciblée — modélisée à **−9 % d'attrition**, protégeant **~1,4 M€** de coûts de remplacement ce trimestre." },
    { keys: ['burnout', 'engineer', 'overtime', 'platform', 'épuis', 'ingéni'], a: 'Platform Engineering shows a **burnout precursor**: after-hours activity **+42%** over 3 weeks with falling PTO use. This historically precedes a **9-pt engagement drop**. Recommended: rebalance on-call load + manager check-ins — modeled to cut the burnout index by **6 pts**.',
      aFr: "L'ingénierie plateforme montre un **précurseur d'épuisement** : activité hors heures **+42 %** sur 3 semaines avec baisse des congés. Cela précède historiquement une **chute d'engagement de 9 pts**. Recommandé : rééquilibrer l'astreinte + points managers — modélisé pour réduire l'indice d'épuisement de **6 pts**." },
    { keys: ['retention', 'forecast', 'next', 'quarter', 'rétention', 'prévis'], a: '12-month retention is forecast at **91.4%** (▲ vs 89.8% trailing). Risk is concentrated in 2 units; the rest of the org is stable or improving. With the recommended interventions, the forecast improves to **~93.1%**.',
      aFr: 'La rétention à 12 mois est prévue à **91,4 %** (▲ vs 89,8 % sur 12 mois). Le risque est concentré sur 2 unités ; le reste de l’organisation est stable ou en progression. Avec les interventions recommandées, la prévision passe à **~93,1 %**.' },
    { keys: ['engagement', 'pulse', 'ops', 'apac', 'pouls'], a: 'Operations APAC engagement is down **6 points** since Q3, correlated with two manager transitions and a **22% drop in 1:1 cadence**. A manager enablement sprint is modeled to recover **+5 pts** within a quarter.',
      aFr: "L'engagement Operations APAC est en baisse de **6 points** depuis le T3, corrélé à deux transitions de manager et une **baisse de 22 % de la cadence des 1:1**. Un sprint d'accompagnement des managers est modélisé pour récupérer **+5 pts** en un trimestre." },
    { keys: ['summary', 'board', 'executive', 'report', 'synthèse', 'conseil'], a: 'Here is the executive headline: **risk is concentrated, not systemic** — 2 units drive 64% of projected exits. Workforce Health is **78/100 (▲5)**. Acting on EMEA Sales retention + Engineering workload protects **~€1.4M**. Want me to generate the full one-page summary?',
      aFr: 'Voici le titre exécutif : **le risque est concentré, pas systémique** — 2 unités concentrent 64 % des départs projetés. La santé des effectifs est de **78/100 (▲5)**. Agir sur la rétention Ventes EMEA + la charge Ingénierie protège **~1,4 M€**. Voulez-vous que je génère la synthèse complète d’une page ?' }
  ];
  const copilotDefault = 'Across **12,480 employees**, risk is concentrated, not systemic: 2 units drive 64% of projected exits. Workforce Health is **78/100 (▲5)**, attrition risk **18.6% (▼1.4)**. Focus areas: EMEA Sales retention and Platform Eng workload — together modeled to protect **~€1.4M** over two quarters.';
  const copilotDefaultFr = 'Sur **12 480 employés**, le risque est concentré, pas systémique : 2 unités concentrent 64 % des départs projetés. La santé des effectifs est de **78/100 (▲5)**, le risque d’attrition **18,6 % (▼1,4)**. Priorités : rétention Ventes EMEA et charge Platform Eng — ensemble modélisées pour protéger **~1,4 M€** sur deux trimestres.';

  function isFr() { return !!(window.StanceI18N && window.StanceI18N.getLang() === 'FR'); }

  function answer(q) {
    q = (q || '').toLowerCase();
    let best = null, bestScore = 0;
    copilot.forEach(c => {
      const s = c.keys.reduce((n, k) => n + (q.indexOf(k) > -1 ? 1 : 0), 0);
      if (s > bestScore) { bestScore = s; best = c; }
    });
    if (bestScore > 0) return isFr() && best.aFr ? best.aFr : best.a;
    return isFr() ? copilotDefaultFr : copilotDefault;
  }

  function axesL() { return isFr() ? RADAR_AXES_FR : RADAR_AXES; }
  function locEmp(e) {
    if (!isFr() || !e.fr) return e;
    const f = e.fr;
    return Object.assign({}, e, {
      archetype: f.archetype || e.archetype,
      archetypeLine: f.archetypeLine || e.archetypeLine,
      summary: f.summary || e.summary,
      actions: e.actions.map((a, i) => Object.assign({}, a, f.actions && f.actions[i] ? { title: f.actions[i].title, impact: f.actions[i].impact } : {})),
      factors: e.factors.map((x, i) => Object.assign({}, x, f.factors && f.factors[i] ? { label: f.factors[i] } : {}))
    });
  }
  function insightsL() {
    if (!isFr()) return insights;
    return insights.map(it => Object.assign({}, it, { title: it.titleFr || it.title, body: it.bodyFr || it.body, tag: it.tagFr || it.tag, meta: it.metaFr || it.meta }));
  }
  function recommendationsL() {
    if (!isFr()) return recommendations;
    return recommendations.map(r => Object.assign({}, r, { title: r.titleFr || r.title, impact: r.impactFr || r.impact }));
  }
  function summariesL() {
    if (!isFr()) return summaries;
    return summaries.map(s => Object.assign({}, s, { title: s.titleFr || s.title, date: s.dateFr || s.date, for: s.forFr || s.for, head: s.headFr || s.head, lines: s.linesFr || s.lines }));
  }

  return { departments, highRisk, insights, recommendations, retention, attrition8w, engagementTrend, summaries, answer, employees, RADAR_AXES, RADAR_AXES_FR, isFr, axesL, locEmp, insightsL, recommendationsL, summariesL };
})();
