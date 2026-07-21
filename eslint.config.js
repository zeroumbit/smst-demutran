import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import requireDoubleConfirm from "./eslint-rules/require-double-confirm.js";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["src/**/*.tsx"],
    plugins: {
      "custom-rules": {
        rules: {
          "require-double-confirm": requireDoubleConfirm,
        },
      },
    },
    rules: {
      "custom-rules/require-double-confirm": "error",
    },
  },
  {
    // Estas telas carregam dados por chaves primitivas explícitas (usuário, setor,
    // filtro ou token). Incluir a função local no array recriaria ciclos de busca.
    // A regra continua ativa nos hooks e módulos novos.
    files: [
      "src/pages/PublicConcessionarioDemutran.tsx",
      "src/pages/admin/Configuracoes.tsx",
      "src/pages/admin/Dashboard.tsx",
      "src/pages/admin/DemutranConcessionarios.tsx",
      "src/pages/admin/DemutranConteudos.tsx",
      "src/pages/admin/DemutranCredenciais.tsx",
      "src/pages/admin/DemutranLiberacao.tsx",
      "src/pages/admin/DemutranRecursos.tsx",
      "src/pages/admin/DemutranVeiculosMunicipais.tsx",
      "src/pages/admin/Documentos.tsx",
      "src/pages/admin/Eventos.tsx",
      "src/pages/admin/Galeria.tsx",
      "src/pages/admin/MinhasIrosGestor.tsx",
      "src/pages/admin/Noticias.tsx",
      "src/pages/admin/Usuarios.tsx",
      "src/pages/admin/guarda/Dashboard.tsx",
      "src/pages/admin/guarda/Iros.tsx",
      "src/pages/admin/guarda/Perfil.tsx",
      "src/pages/guardas/Cadastro.tsx",
      "src/pages/guardas/CadastroConcessionario.tsx",
    ],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
);
