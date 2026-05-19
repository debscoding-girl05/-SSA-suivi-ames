# -SSA-suivi-ames
App react progressive web app pour la suivie des âmes 

# Chaque matin — récupérer les dernières modifs
git checkout dev
git pull origin dev
git checkout ma-feature-branch
git merge dev

# Pendant la journée — commiter souvent (toutes les 1-2h)
git add .
git commit -m "feat: description courte et claire"
git push origin ma-feature-branch

# Feature terminée → ouvrir une Pull Request sur GitHub
# dev ← feature/ma-branche
# Dev C relit → approuve → merge
