Déploie les changements sur Vercel en suivant ces étapes :

1. Lance `git -C ~/marketball status` pour voir les fichiers modifiés
2. Lance `git -C ~/marketball diff --stat` pour un résumé des changements
3. Demande-moi un message de commit court et descriptif si je n'en ai pas fourni, sinon utilise celui fourni en argument ($ARGUMENTS)
4. Ajoute tous les fichiers modifiés : `git -C ~/marketball add -A`
5. Crée le commit avec le message choisi
6. Push : `git -C ~/marketball push`
7. Confirme que le push a réussi et rappelle-moi que Vercel va déployer automatiquement en ~1 minute
