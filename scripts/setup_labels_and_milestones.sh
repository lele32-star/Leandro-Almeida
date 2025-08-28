#!/usr/bin/env bash
set -euo pipefail

# Requer GitHub CLI autenticado: gh auth login
REPO="${1:-origin}"

# Labels
gh label create "fase" --color FFD700 --description "Itens por fase" || true
gh label create "feature" --color 0E8A16 || true
gh label create "bug" --color D73A4A || true
gh label create "chore" --color 5319E7 || true

# Milestones (Fase 0..8)
for i in 0 1 2 3 4 5 6 7 8; do
  gh milestone create "Fase $i" --description "Entrega fase $i" || true
done

# Project (V2)
# gh project create --owner $GITHUB_OWNER --title "Velocidade & Hora de Voo" || true
echo "Labels e milestones preparados."
#!/usr/bin/env bash
set -euo pipefail

# Requer GitHub CLI autenticado: gh auth login
REPO="${1:-origin}"

# Labels
gh label create "fase" --color FFD700 --description "Itens por fase" || true
gh label create "feature" --color 0E8A16 || true
gh label create "bug" --color D73A4A || true
gh label create "chore" --color 5319E7 || true

# Milestones (Fase 0..8)
for i in 0 1 2 3 4 5 6 7 8; do
  gh milestone create "Fase $i" --description "Entrega fase $i" || true
done

# Project (V2)
# gh project create --owner $GITHUB_OWNER --title "Velocidade & Hora de Voo" || true
echo "Labels e milestones preparados."
