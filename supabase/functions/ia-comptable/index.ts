import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(body: any) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });

  if (resp.status === 429) {
    return { _error: "Trop de requêtes, réessayez dans quelques instants.", _status: 429 };
  }
  if (resp.status === 402) {
    return { _error: "Crédits IA épuisés. Ajoutez des fonds dans Lovable AI.", _status: 402 };
  }
  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI gateway error:", resp.status, t);
    return { _error: "Erreur du service IA", _status: 500 };
  }
  return await resp.json();
}

function extractToolArgs(data: any): any {
  const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) return null;
  try { return JSON.parse(tc.function.arguments); } catch { return null; }
}

// === Action 1: suggérer un compte SYSCOHADA selon un libellé ===
async function suggestAccount(libelle: string, comptes: any[]) {
  const liste = comptes.map((c) => `${c.numero} - ${c.libelle}`).join("\n");
  const data = await callAI({
    messages: [
      {
        role: "system",
        content:
          "Tu es un expert-comptable SYSCOHADA (Sénégal). Choisis le compte le plus pertinent dans la liste fournie pour un libellé donné. Renvoie le numéro de compte exact et une justification courte.",
      },
      {
        role: "user",
        content: `Libellé: "${libelle}"\n\nComptes disponibles:\n${liste}\n\nPropose le compte le plus pertinent.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "suggest_account",
          description: "Renvoie le compte SYSCOHADA suggéré",
          parameters: {
            type: "object",
            properties: {
              numero: { type: "string", description: "Numéro de compte exact tiré de la liste" },
              justification: { type: "string" },
              confiance: { type: "string", enum: ["faible", "moyenne", "elevee"] },
            },
            required: ["numero", "justification", "confiance"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "suggest_account" } },
  });
  if (data?._error) return data;
  return extractToolArgs(data) ?? { _error: "Pas de suggestion" };
}

// === Action 2: extraire une écriture depuis une facture (image) ===
async function extractInvoice(imageBase64: string, mimeType: string, comptes: any[]) {
  const liste = comptes.map((c) => `${c.numero} - ${c.libelle}`).join("\n");
  const data = await callAI({
    messages: [
      {
        role: "system",
        content:
          "Tu es un expert-comptable SYSCOHADA (Sénégal). À partir d'une facture, extrait les informations clés et propose une écriture comptable équilibrée (débit = crédit). Utilise UNIQUEMENT les comptes fournis. Les montants sont en FCFA.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Comptes disponibles:\n${liste}\n\nAnalyse cette facture et propose l'écriture.` },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "extract_invoice",
          parameters: {
            type: "object",
            properties: {
              fournisseur: { type: "string" },
              numero_piece: { type: "string" },
              date_facture: { type: "string", description: "Format YYYY-MM-DD" },
              libelle: { type: "string" },
              montant_ht: { type: "number" },
              montant_tva: { type: "number" },
              montant_ttc: { type: "number" },
              type_journal: { type: "string", enum: ["AC", "VT", "BQ", "CA", "OD"], description: "AC=Achats, VT=Ventes, BQ=Banque, CA=Caisse, OD=Opérations diverses" },
              lignes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    compte_numero: { type: "string" },
                    libelle: { type: "string" },
                    debit: { type: "number" },
                    credit: { type: "number" },
                  },
                  required: ["compte_numero", "libelle", "debit", "credit"],
                  additionalProperties: false,
                },
              },
              confiance: { type: "string", enum: ["faible", "moyenne", "elevee"] },
            },
            required: ["fournisseur", "date_facture", "libelle", "montant_ttc", "type_journal", "lignes", "confiance"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "extract_invoice" } },
  });
  if (data?._error) return data;
  return extractToolArgs(data) ?? { _error: "Extraction impossible" };
}

// === Action 3: classer les opérations d'un relevé bancaire ===
async function parseBankStatement(texte: string, comptes: any[]) {
  const liste = comptes.map((c) => `${c.numero} - ${c.libelle}`).join("\n");
  const data = await callAI({
    messages: [
      {
        role: "system",
        content:
          "Tu es un expert-comptable SYSCOHADA (Sénégal). Analyse un relevé bancaire (texte ou CSV) et propose pour chaque opération une écriture comptable équilibrée. Le compte de banque (52*) est utilisé en contrepartie. Utilise UNIQUEMENT les comptes fournis.",
      },
      {
        role: "user",
        content: `Comptes disponibles:\n${liste}\n\nRelevé bancaire:\n${texte}\n\nPropose une écriture par ligne.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "parse_statement",
          parameters: {
            type: "object",
            properties: {
              compte_banque: { type: "string", description: "Numéro du compte de banque utilisé (ex: 521)" },
              operations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string", description: "YYYY-MM-DD" },
                    libelle: { type: "string" },
                    montant: { type: "number" },
                    sens: { type: "string", enum: ["debit", "credit"], description: "Sens de l'opération sur la banque" },
                    compte_contrepartie: { type: "string" },
                    confiance: { type: "string", enum: ["faible", "moyenne", "elevee"] },
                  },
                  required: ["date", "libelle", "montant", "sens", "compte_contrepartie", "confiance"],
                  additionalProperties: false,
                },
              },
            },
            required: ["compte_banque", "operations"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "parse_statement" } },
  });
  if (data?._error) return data;
  return extractToolArgs(data) ?? { _error: "Analyse impossible" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, payload } = await req.json();

    let result: any;
    switch (action) {
      case "suggest_account":
        result = await suggestAccount(payload.libelle, payload.comptes || []);
        break;
      case "extract_invoice":
        result = await extractInvoice(payload.imageBase64, payload.mimeType, payload.comptes || []);
        break;
      case "parse_bank_statement":
        result = await parseBankStatement(payload.texte, payload.comptes || []);
        break;
      default:
        return new Response(JSON.stringify({ error: "action inconnue" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (result?._error) {
      return new Response(JSON.stringify({ error: result._error }), {
        status: result._status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ia-comptable error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});