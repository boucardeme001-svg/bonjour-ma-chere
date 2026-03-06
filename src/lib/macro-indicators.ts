// Définitions des indicateurs macroéconomiques par module

export interface Indicateur {
  code: string;
  libelle: string;
  type: 'input' | 'calcul';
  formule?: string; // référence aux codes pour calcul
  unite: 'milliards' | 'pourcentage' | 'indice';
  categorie: string;
  signe?: 'positif' | 'negatif'; // pour affichage
}

// ===== SECTEUR RÉEL (PIB) =====
export const PIB_INDICATEURS: Indicateur[] = [
  // PIB par secteur
  { code: 'pib_primaire', libelle: 'Secteur primaire', type: 'input', unite: 'milliards', categorie: 'PIB par secteur' },
  { code: 'pib_secondaire', libelle: 'Secteur secondaire', type: 'input', unite: 'milliards', categorie: 'PIB par secteur' },
  { code: 'pib_tertiaire', libelle: 'Secteur tertiaire', type: 'input', unite: 'milliards', categorie: 'PIB par secteur' },
  { code: 'taxes_nettes', libelle: 'Taxes nettes sur produits', type: 'input', unite: 'milliards', categorie: 'PIB par secteur' },
  { code: 'pib_nominal', libelle: 'PIB nominal', type: 'calcul', formule: 'pib_primaire+pib_secondaire+pib_tertiaire+taxes_nettes', unite: 'milliards', categorie: 'PIB par secteur' },

  // PIB par la demande
  { code: 'consommation_finale', libelle: 'Consommation finale', type: 'input', unite: 'milliards', categorie: 'PIB par la demande' },
  { code: 'fbcf', libelle: 'FBCF (Investissement)', type: 'input', unite: 'milliards', categorie: 'PIB par la demande' },
  { code: 'variation_stocks', libelle: 'Variation des stocks', type: 'input', unite: 'milliards', categorie: 'PIB par la demande' },
  { code: 'exportations', libelle: 'Exportations B&S', type: 'input', unite: 'milliards', categorie: 'PIB par la demande' },
  { code: 'importations', libelle: 'Importations B&S', type: 'input', unite: 'milliards', categorie: 'PIB par la demande', signe: 'negatif' },

  // Indicateurs dérivés
  { code: 'taux_croissance', libelle: 'Taux de croissance réel (%)', type: 'input', unite: 'pourcentage', categorie: 'Indicateurs clés' },
  { code: 'deflateur_pib', libelle: 'Déflateur du PIB', type: 'input', unite: 'indice', categorie: 'Indicateurs clés' },
  { code: 'inflation', libelle: 'Inflation (IPC, %)', type: 'input', unite: 'pourcentage', categorie: 'Indicateurs clés' },
  { code: 'population', libelle: 'Population (millions)', type: 'input', unite: 'milliards', categorie: 'Indicateurs clés' },
];

// ===== TOFE =====
export const TOFE_INDICATEURS: Indicateur[] = [
  // Recettes
  { code: 'recettes_fiscales', libelle: 'Recettes fiscales', type: 'input', unite: 'milliards', categorie: 'Recettes' },
  { code: 'impots_directs', libelle: '  dont Impôts directs', type: 'input', unite: 'milliards', categorie: 'Recettes' },
  { code: 'impots_indirects', libelle: '  dont Impôts indirects', type: 'input', unite: 'milliards', categorie: 'Recettes' },
  { code: 'droits_douane', libelle: '  dont Droits de douane', type: 'input', unite: 'milliards', categorie: 'Recettes' },
  { code: 'recettes_non_fiscales', libelle: 'Recettes non fiscales', type: 'input', unite: 'milliards', categorie: 'Recettes' },
  { code: 'dons', libelle: 'Dons', type: 'input', unite: 'milliards', categorie: 'Recettes' },
  { code: 'total_recettes', libelle: 'Total recettes et dons', type: 'calcul', formule: 'recettes_fiscales+recettes_non_fiscales+dons', unite: 'milliards', categorie: 'Recettes' },

  // Dépenses
  { code: 'depenses_courantes', libelle: 'Dépenses courantes', type: 'input', unite: 'milliards', categorie: 'Dépenses' },
  { code: 'masse_salariale', libelle: '  dont Masse salariale', type: 'input', unite: 'milliards', categorie: 'Dépenses' },
  { code: 'interets_dette', libelle: '  dont Intérêts dette', type: 'input', unite: 'milliards', categorie: 'Dépenses' },
  { code: 'transferts_subventions', libelle: '  dont Transferts et subventions', type: 'input', unite: 'milliards', categorie: 'Dépenses' },
  { code: 'depenses_capital', libelle: 'Dépenses en capital', type: 'input', unite: 'milliards', categorie: 'Dépenses' },
  { code: 'invest_finances_int', libelle: '  dont Fin. intérieur', type: 'input', unite: 'milliards', categorie: 'Dépenses' },
  { code: 'invest_finances_ext', libelle: '  dont Fin. extérieur', type: 'input', unite: 'milliards', categorie: 'Dépenses' },
  { code: 'total_depenses', libelle: 'Total dépenses', type: 'calcul', formule: 'depenses_courantes+depenses_capital', unite: 'milliards', categorie: 'Dépenses' },

  // Soldes
  { code: 'solde_primaire', libelle: 'Solde primaire', type: 'calcul', formule: 'total_recettes-total_depenses+interets_dette', unite: 'milliards', categorie: 'Soldes' },
  { code: 'solde_global', libelle: 'Solde global (base engagements)', type: 'calcul', formule: 'total_recettes-total_depenses', unite: 'milliards', categorie: 'Soldes' },

  // Financement
  { code: 'financement_interieur', libelle: 'Financement intérieur', type: 'input', unite: 'milliards', categorie: 'Financement' },
  { code: 'financement_exterieur', libelle: 'Financement extérieur', type: 'input', unite: 'milliards', categorie: 'Financement' },
];

// ===== BALANCE DES PAIEMENTS =====
export const BDP_INDICATEURS: Indicateur[] = [
  // Compte courant
  { code: 'balance_commerciale', libelle: 'Balance commerciale', type: 'input', unite: 'milliards', categorie: 'Compte courant' },
  { code: 'export_biens', libelle: '  Exportations de biens', type: 'input', unite: 'milliards', categorie: 'Compte courant' },
  { code: 'import_biens', libelle: '  Importations de biens', type: 'input', unite: 'milliards', categorie: 'Compte courant', signe: 'negatif' },
  { code: 'balance_services', libelle: 'Balance des services', type: 'input', unite: 'milliards', categorie: 'Compte courant' },
  { code: 'revenus_primaires', libelle: 'Revenus primaires (net)', type: 'input', unite: 'milliards', categorie: 'Compte courant' },
  { code: 'revenus_secondaires', libelle: 'Revenus secondaires (transferts)', type: 'input', unite: 'milliards', categorie: 'Compte courant' },
  { code: 'solde_courant', libelle: 'Solde du compte courant', type: 'calcul', formule: 'balance_commerciale+balance_services+revenus_primaires+revenus_secondaires', unite: 'milliards', categorie: 'Compte courant' },

  // Compte de capital et financier
  { code: 'compte_capital', libelle: 'Compte de capital', type: 'input', unite: 'milliards', categorie: 'Compte capital & financier' },
  { code: 'ide', libelle: 'Investissements directs étrangers', type: 'input', unite: 'milliards', categorie: 'Compte capital & financier' },
  { code: 'investissements_portefeuille', libelle: 'Investissements de portefeuille', type: 'input', unite: 'milliards', categorie: 'Compte capital & financier' },
  { code: 'autres_investissements', libelle: 'Autres investissements', type: 'input', unite: 'milliards', categorie: 'Compte capital & financier' },

  // Réserves
  { code: 'erreurs_omissions', libelle: 'Erreurs et omissions', type: 'input', unite: 'milliards', categorie: 'Solde global' },
  { code: 'variation_reserves', libelle: 'Variation des réserves', type: 'calcul', formule: 'solde_courant+compte_capital+ide+investissements_portefeuille+autres_investissements+erreurs_omissions', unite: 'milliards', categorie: 'Solde global' },
];

// ===== SITUATION MONÉTAIRE =====
export const MONETAIRE_INDICATEURS: Indicateur[] = [
  // Actifs
  { code: 'avoirs_ext_nets', libelle: 'Avoirs extérieurs nets', type: 'input', unite: 'milliards', categorie: 'Actifs' },
  { code: 'credit_interieur', libelle: 'Crédit intérieur', type: 'input', unite: 'milliards', categorie: 'Actifs' },
  { code: 'png_etat', libelle: '  dont PNG État', type: 'input', unite: 'milliards', categorie: 'Actifs' },
  { code: 'credit_economie', libelle: '  dont Crédit à l\'économie', type: 'input', unite: 'milliards', categorie: 'Actifs' },

  // Passifs
  { code: 'masse_monetaire', libelle: 'Masse monétaire (M2)', type: 'calcul', formule: 'avoirs_ext_nets+credit_interieur', unite: 'milliards', categorie: 'Passifs' },
  { code: 'circulation_fiduciaire', libelle: 'Circulation fiduciaire', type: 'input', unite: 'milliards', categorie: 'Passifs' },
  { code: 'depots_vue', libelle: 'Dépôts à vue', type: 'input', unite: 'milliards', categorie: 'Passifs' },
  { code: 'quasi_monnaie', libelle: 'Quasi-monnaie', type: 'input', unite: 'milliards', categorie: 'Passifs' },
  { code: 'autres_postes_nets', libelle: 'Autres postes nets', type: 'input', unite: 'milliards', categorie: 'Passifs' },

  // Indicateurs
  { code: 'vitesse_circulation', libelle: 'Vitesse de circulation', type: 'input', unite: 'indice', categorie: 'Indicateurs' },
  { code: 'taux_liquidite', libelle: 'Taux de liquidité (M2/PIB %)', type: 'input', unite: 'pourcentage', categorie: 'Indicateurs' },
];

export const MODULES = {
  pib: { label: 'Secteur réel (PIB)', indicateurs: PIB_INDICATEURS, icon: '📊' },
  tofe: { label: 'TOFE', indicateurs: TOFE_INDICATEURS, icon: '🏛️' },
  bdp: { label: 'Balance des paiements', indicateurs: BDP_INDICATEURS, icon: '🌍' },
  monetaire: { label: 'Situation monétaire', indicateurs: MONETAIRE_INDICATEURS, icon: '💰' },
} as const;

export type ModuleKey = keyof typeof MODULES;

// Évalue une formule simple (somme/soustraction de codes)
export function evalFormule(formule: string, valeurs: Record<string, number>): number {
  const tokens = formule.match(/[+-]?[a-z_]+/g) || [];
  let result = 0;
  for (const token of tokens) {
    const isNeg = token.startsWith('-');
    const code = isNeg ? token.slice(1) : token.replace(/^\+/, '');
    const val = valeurs[code] ?? 0;
    result += isNeg ? -val : val;
  }
  return result;
}
