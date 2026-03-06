// Barème cotisations sociales Sénégal 2026
export const TAUX = {
  // IPRES Régime Général
  IPRES_RG_SAL: 0.056,   // 5.6% salarié
  IPRES_RG_PAT: 0.084,   // 8.4% employeur
  IPRES_RG_PLAFOND: 432000, // Plafond mensuel FCFA

  // IPRES CRC (cadres uniquement)
  IPRES_CRC_SAL: 0.024,  // 2.4% salarié
  IPRES_CRC_PAT: 0.036,  // 3.6% employeur
  IPRES_CRC_PLAFOND: 1296000,

  // CSS
  CSS_AT: 0.01,           // Accidents du travail 1% (variable selon risque)
  CSS_PF: 0.07,           // Prestations familiales 7%
  CSS_PLAFOND: 63000,     // Plafond journalier

  // CFCE
  CFCE: 0.03,             // 3% du salaire brut

  // TRIMF (barème annuel, converti mensuel)
  TRIMF_TRANCHES: [
    { min: 0, max: 600000, montant: 900 },
    { min: 600001, max: 1200000, montant: 3600 },
    { min: 1200001, max: 1800000, montant: 6000 },
    { min: 1800001, max: 2400000, montant: 9600 },
    { min: 2400001, max: 3600000, montant: 18000 },
    { min: 3600001, max: Infinity, montant: 36000 },
  ],
};

// Barème IR Sénégal (annuel)
const IR_TRANCHES = [
  { min: 0, max: 630000, taux: 0 },
  { min: 630001, max: 1500000, taux: 0.20 },
  { min: 1500001, max: 4000000, taux: 0.25 },
  { min: 4000001, max: 8000000, taux: 0.30 },
  { min: 8000001, max: 13500000, taux: 0.35 },
  { min: 13500001, max: Infinity, taux: 0.37 },
];

// Parts fiscales selon situation familiale
export function getPartsFiscales(situation: string, nbEnfants: number): number {
  let parts = 1;
  if (situation === 'marie') parts = 2;
  parts += nbEnfants * 0.5;
  return Math.min(parts, 5); // Plafond 5 parts
}

// Calcul IR annuel
function calculIRAnnuel(revenuImposableAnnuel: number, parts: number): number {
  const quotient = revenuImposableAnnuel / parts;
  let irParPart = 0;

  for (const tranche of IR_TRANCHES) {
    if (quotient <= tranche.min) break;
    const base = Math.min(quotient, tranche.max) - tranche.min;
    irParPart += base * tranche.taux;
  }

  return irParPart * parts;
}

// TRIMF mensuel
function calculTRIMF(salaireAnnuel: number): number {
  for (const tranche of TAUX.TRIMF_TRANCHES) {
    if (salaireAnnuel >= tranche.min && salaireAnnuel <= tranche.max) {
      return Math.round(tranche.montant / 12);
    }
  }
  return 3000;
}

export interface BulletinCalcul {
  salaire_brut: number;
  ipres_rg_sal: number;
  ipres_crc_sal: number;
  ir: number;
  trimf: number;
  total_retenues_sal: number;
  ipres_rg_pat: number;
  ipres_crc_pat: number;
  css_at: number;
  css_pf: number;
  cfce: number;
  total_charges_pat: number;
  net_a_payer: number;
}

export function calculerBulletin(
  salaireBase: number,
  sursalaire: number,
  primeAnciennete: number,
  primeTransport: number,
  autresPrimes: number,
  heuresSupMontant: number,
  isCadre: boolean,
  situation: string,
  nbEnfants: number
): BulletinCalcul {
  const salaireBrut = salaireBase + sursalaire + primeAnciennete + primeTransport + autresPrimes + heuresSupMontant;

  // IPRES RG (plafonné)
  const baseIpresRG = Math.min(salaireBrut, TAUX.IPRES_RG_PLAFOND);
  const ipresRgSal = Math.round(baseIpresRG * TAUX.IPRES_RG_SAL);
  const ipresRgPat = Math.round(baseIpresRG * TAUX.IPRES_RG_PAT);

  // IPRES CRC (cadres uniquement, plafonné)
  const baseIpresCRC = isCadre ? Math.min(salaireBrut, TAUX.IPRES_CRC_PLAFOND) : 0;
  const ipresCrcSal = Math.round(baseIpresCRC * TAUX.IPRES_CRC_SAL);
  const ipresCrcPat = Math.round(baseIpresCRC * TAUX.IPRES_CRC_PAT);

  // Revenu imposable = brut - cotisations salariales
  const cotisationsSal = ipresRgSal + ipresCrcSal;
  const revenuImposableMensuel = salaireBrut - cotisationsSal;
  const revenuImposableAnnuel = revenuImposableMensuel * 12;

  // IR
  const parts = getPartsFiscales(situation, nbEnfants);
  const irAnnuel = calculIRAnnuel(revenuImposableAnnuel, parts);
  const ir = Math.round(irAnnuel / 12);

  // TRIMF
  const trimf = calculTRIMF(revenuImposableAnnuel);

  const totalRetenuesSal = ipresRgSal + ipresCrcSal + ir + trimf;

  // Cotisations patronales
  const cssAt = Math.round(salaireBrut * TAUX.CSS_AT);
  const cssPf = Math.round(salaireBrut * TAUX.CSS_PF);
  const cfce = Math.round(salaireBrut * TAUX.CFCE);
  const totalChargesPat = ipresRgPat + ipresCrcPat + cssAt + cssPf + cfce;

  const netAPayer = salaireBrut - totalRetenuesSal;

  return {
    salaire_brut: salaireBrut,
    ipres_rg_sal: ipresRgSal,
    ipres_crc_sal: ipresCrcSal,
    ir,
    trimf,
    total_retenues_sal: totalRetenuesSal,
    ipres_rg_pat: ipresRgPat,
    ipres_crc_pat: ipresCrcPat,
    css_at: cssAt,
    css_pf: cssPf,
    cfce,
    total_charges_pat: totalChargesPat,
    net_a_payer: netAPayer,
  };
}
