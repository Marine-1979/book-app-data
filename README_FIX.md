# M1 data publish fix

Причина 404:
предыдущий workflow проверял `git diff` до `git add`.
Новый `dist/mobile-app-data.json` был untracked, поэтому считался «без изменений»
и не попадал в GitHub.

Fix:
- workflow отслеживает изменение самого `mobile-data.yml`;
- `git add -f dist/mobile-app-data.json` выполняется ДО проверки;
- проверка идет по staged diff;
- новый dataset публикуется bot-коммитом.

Commit:
`fix(mobile-data): publish generated mobile dataset`
