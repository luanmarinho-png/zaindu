# Interface da clínica

- Todos os dropdowns devem seguir o DS SC, incluindo controles novos, telas existentes e protótipos HTML.
- No React, reutilize `src/components/ui/Select.tsx`. Não use menus de opções do `<select>` nativo.
- Em HTML independente, use os tokens e as classes `.z-dropdown`, `.z-dropdown-btn` e `.z-dropdown-pop` de `src/app/design-system.css`.
- Preserve rótulo acessível, opção selecionada, navegação por teclado, fechamento com Escape e adaptação ao celular. As listas em modais devem abrir sem serem cortadas pela rolagem.
- Valide o menu aberto no navegador em computador e celular antes de concluir.
