# Guide d'installation de SysCompta

## Prérequis système

| Outil | Version minimale | Installation |
|-------|-----------------|--------------|
| **Node.js** | v18+ | [nvm](https://github.com/nvm-sh/nvm) (recommandé) ou [nodejs.org](https://nodejs.org/) |
| **npm** | v9+ | Inclus avec Node.js |
| **Git** | v2+ | [git-scm.com](https://git-scm.com/) |

### Vérifier les versions installées

```bash
node --version    # doit afficher v18.x.x ou supérieur
npm --version     # doit afficher v9.x.x ou supérieur
git --version     # doit afficher v2.x.x ou supérieur
```

---

## 1. Cloner le projet

```bash
git clone <URL_GIT_DU_PROJET>
cd syscompta
```

---

## 2. Installer les dépendances

```bash
npm install
```

> Cette commande installe toutes les dépendances listées dans `package.json` (React, Vite, Tailwind CSS, Supabase, etc.)

---

## 3. Configurer l'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
VITE_SUPABASE_PROJECT_ID="votre_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="votre_anon_key"
VITE_SUPABASE_URL="https://votre_projet.supabase.co"
```

> **Important** : Ces clés sont des clés publiques (anon key) et peuvent être stockées dans le fichier `.env`. Ne stockez jamais de clés privées (service_role) dans ce fichier.

### Où trouver ces valeurs ?

Si vous utilisez **Lovable Cloud**, ces valeurs sont automatiquement configurées. Pour un projet Supabase externe, rendez-vous dans **Settings > API** de votre projet Supabase.

---

## 4. Démarrer le serveur de développement

### Mode Web (navigateur)

```bash
npm run dev
```

L'application sera accessible à l'adresse : **http://localhost:8080**

### Mode Desktop (Electron)

```bash
npm run electron:dev
```

> Le mode Electron compile d'abord l'application web puis lance la fenêtre desktop.

---

## 5. Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement Vite |
| `npm run build` | Compile l'application pour la production |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm run test` | Exécute les tests unitaires (Vitest) |
| `npm run test:watch` | Exécute les tests en mode watch |
| `npm run electron:dev` | Lance en mode Electron (développement) |
| `npm run electron:build:win` | Génère l'installateur Windows (.exe) |
| `npm run electron:build:mac` | Génère l'installateur macOS (.dmg) |
| `npm run electron:build:linux` | Génère l'installateur Linux (.AppImage) |

---

## 6. Structure du projet

```
syscompta/
├── electron/              # Configuration Electron (mode desktop)
│   └── main.cjs
├── public/                # Fichiers statiques (icônes, manifest PWA)
├── src/
│   ├── components/        # Composants React réutilisables
│   │   └── ui/            # Composants UI (shadcn/ui)
│   ├── contexts/          # Contextes React (Auth)
│   ├── hooks/             # Hooks personnalisés
│   ├── integrations/      # Intégration Supabase (auto-généré)
│   ├── lib/               # Utilitaires et logique métier
│   ├── pages/             # Pages de l'application
│   └── test/              # Tests unitaires
├── supabase/              # Configuration et migrations Supabase
├── .env                   # Variables d'environnement (à créer)
├── package.json           # Dépendances et scripts
├── tailwind.config.ts     # Configuration Tailwind CSS
└── vite.config.ts         # Configuration Vite
```

---

## 7. Fonctionnalités principales

- **Comptabilité SYSCOHADA** : Plan comptable, saisie d'écritures, grand livre, balance
- **États financiers** : Bilan, Compte de résultat, TAFIRE
- **Gestion de la paie** : Employés, bulletins de paie, états de paie (normes sénégalaises)
- **Transfert paie → compta** : Génération automatique des écritures comptables depuis la paie
- **Multi-exercices** : Gestion de plusieurs exercices comptables
- **Mode hors-ligne** : PWA avec Service Worker
- **Mode desktop** : Application Electron pour Windows, macOS et Linux

---

## 8. Première utilisation

1. **Créer un compte** : Accédez à l'application et inscrivez-vous via la page d'authentification
2. **Vérifier votre email** : Confirmez votre adresse email avant de vous connecter
3. **Plan comptable** : Le plan comptable SYSCOHADA s'initialise automatiquement à la première visite
4. **Créer un exercice** : Allez dans Exercices et créez votre premier exercice comptable
5. **Configurer les journaux** : Créez vos journaux (Achats, Ventes, Banque, OD, etc.)
6. **Commencer la saisie** : Saisissez vos écritures comptables

---

## 9. Compilation pour la production

### Build web

```bash
npm run build
```

Les fichiers compilés se trouvent dans le dossier `dist/`.

### Build desktop (Electron)

```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux
```

Les installateurs générés se trouvent dans le dossier `electron-dist/`.

---

## 10. Technologies utilisées

| Technologie | Usage |
|-------------|-------|
| **React 18** | Framework UI |
| **TypeScript** | Typage statique |
| **Vite** | Bundler et serveur de développement |
| **Tailwind CSS** | Styles utilitaires |
| **shadcn/ui** | Composants UI |
| **Supabase** | Backend (BDD, Auth, Edge Functions) |
| **React Router** | Navigation |
| **React Query** | Gestion du cache et des requêtes |
| **Recharts** | Graphiques et visualisations |
| **Electron** | Application desktop |
| **Vitest** | Tests unitaires |

---

## Résolution de problèmes

### Le serveur ne démarre pas

- Vérifiez que le port 8080 n'est pas déjà utilisé
- Supprimez `node_modules` et relancez `npm install`

### Erreur de connexion à la base de données

- Vérifiez que le fichier `.env` existe et contient les bonnes valeurs
- Vérifiez votre connexion internet

### Le plan comptable ne s'initialise pas

- Assurez-vous d'être connecté avec un compte vérifié
- Accédez à la page Plan Comptable pour déclencher l'initialisation automatique
