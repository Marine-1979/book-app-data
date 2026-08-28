# M1 Core Product Beta · book-app-data patch

Добавляет отдельный mobile contract, не изменяя `dist/app-data.json`.

После копирования в `book-app-data` commit:
`feat(mobile): add bilingual mobile data pipeline v1`

GitHub Actions `Mobile data build` создаст/обновит `dist/mobile-app-data.json`.
Дождаться зеленого gate перед push mobile patch.

EN title/description/tags in `translations.en.json` are editorial beta translations, not author-approved publication copy. Full materials remain `contentLocales: ["ru"]`.
