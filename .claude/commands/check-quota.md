Vérifie l'état de l'API Football et du cache :

1. Lis le fichier `api/matches.js` pour rappeler les durées de cache actuelles (live vs scheduled)
2. Rappelle le quota API Football : 7500 requêtes/jour sur le plan PRO
3. Rappelle l'estimation d'usage quotidien (~2200 req/jour = 29% du quota)
4. Rappelle que le quota se remet à zéro à minuit UTC (2h heure française)
5. Si je décris un problème (ex: "plus de matchs"), diagnostique si c'est probablement un problème de quota, de cache, ou d'API
