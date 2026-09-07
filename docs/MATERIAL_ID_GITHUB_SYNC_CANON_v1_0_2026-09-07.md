# MATERIAL ID + GITHUB SYNC CANON
## МАДИНА_Приложение · инструкция для обновляемых и новых материалов

**Версия:** 1.0  
**Дата фиксации:** 07.09.2026  
**Статус:** ОБЯЗАТЕЛЬНЫЙ КАНОН  
**Рекомендуемое место в репозитории:** `docs/MATERIAL_ID_GITHUB_SYNC_CANON_v1_0_2026-09-07.md`

---

# 0. ЗАЧЕМ ЭТО ПРАВИЛО

Материал в WEB-приложении — это не только T123-страница. Его идентичность одновременно живет в:

1. GitHub-реестре `book-app-data`;
2. production URL / QR URL;
3. `material_id` (`m001`, `m032` и т. п.);
4. route / metadata;
5. T123 namespace;
6. Navigator / personal layer / analytics;
7. generated data для mobile и других consumers.

Поэтому при переверстке нельзя заменять техническую идентичность материала «красивым» смысловым именем.

**Главное правило:**

> Существующий материал можно переверстать полностью, но его `material_id`, URL и связанный технический namespace остаются стабильными.

---

# 1. SOURCE OF TRUTH

Основной репозиторий:

`https://github.com/Marine-1979/book-app-data`

Source data:

- `data/materials.json`
- `data/routes.json`
- `data/editorial.json`
- другие source-файлы схемы — по текущей архитектуре репозитория.

Generated output:

- `dist/app-data.json`
- другие generated-файлы.

Правило:

> **source → validate → build → generated output**

`dist` вручную не редактировать.

---

# 2. IDENTITY PRECHECK — ОБЯЗАТЕЛЕН ДО ЛЮБОЙ ПЕРЕВЕРСТКИ

До написания нового M2/M3:

1. Найти production URL в актуальном `data/materials.json`.
2. Зафиксировать:
   - `material_id`;
   - `route`;
   - `link`;
   - `type`;
   - `status`;
   - `expert/expert_name`, если есть;
   - `publishedAt`;
   - `updatedAt/changeSummary`, если есть.
3. Найти текущий production T123 / последний принятый source-блок.
4. Зафиксировать существующий root namespace.
5. Проверить, является ли URL:
   - immutable QR `/kniga/linkNN`;
   - human-readable master;
   - Alias;
   - самостоятельной web-страницей.
6. Только после этого собирать новую верстку.

Если URL в `materials.json` не найден:

> **НЕ ПРИДУМЫВАТЬ `mXXX`.**

Сначала проверить таблицу резервов ниже и принять отдельное решение о регистрации материала.

---

# 3. СТАБИЛЬНЫЙ T123-КОНТРАКТ

Для уже зарегистрированного материала `m032`:

## M2

Рекомендуемый root:

```html
<section
  id="bapp-m032"
  data-material-id="m032"
  data-material-url="/kniga/link23">
```

CSS:

```css
#bapp-m032 { ... }
#bapp-m032 .bapp-m032__... { ... }
```

## M3

```html
<section
  id="bapp-m032-related"
  data-material-id="m032"
  data-material-url="/kniga/link23">
```

CSS:

```css
#bapp-m032-related { ... }
#bapp-m032-related .bapp-m032r__... { ... }
```

## Разрешено

Внутри стабильного root можно использовать смысловые классы:

```html
<div class="bapp-m032__hero klimovsk-hero">
```

## Запрещено

Заменять root:

```html
#bapp-m032
```

на:

```html
#bapp-klimovsk
```

если материал уже зарегистрирован как `m032`.

---

# 4. ТЕХНИЧЕСКИЙ КОММЕНТАРИЙ В НАЧАЛЕ T123

Каждый обновляемый зарегистрированный материал должен начинаться служебным комментарием:

```html
<!--
MATERIAL: Климовск
material_id: m032
route: 07
production URL: /kniga/link23
source: data/materials.json
architecture: M1 Shared Header → M2 → M3 → M4 Shared Footer
identity contract: material_id / URL / namespace — DO NOT CHANGE
-->
```

Комментарий не виден читателю, но снижает риск потери связи при следующей переверстке.

---

# 5. ЧТО НЕЛЬЗЯ МЕНЯТЬ ПРИ ОБЫЧНОЙ ПЕРЕВЕРСТКЕ

Без отдельного DATA / URL решения запрещено:

- менять существующий `material_id`;
- создавать новый ID вместо существующего;
- переиспользовать старый ID для другого материала;
- менять registered URL;
- менять QR `/kniga/linkNN`;
- менять route;
- менять `publishedAt`;
- менять analytics event names;
- менять query/deep-link contract;
- вручную редактировать `dist`;
- регистрировать один и тот же материал двумя `material_id`.

---

# 6. КОГДА НУЖНО ОБНОВЛЯТЬ GITHUB ПОСЛЕ WEB-ПРАВКИ

## A. Только дизайн / CSS / верстка

Примеры:
- отступы;
- Poiret One;
- фото;
- сетка;
- цвет;
- accordion;
- подпись изображения без изменения смысла.

GitHub metadata:

**не менять автоматически.**

`MOBILE SYNC REQUIRED: NO`

---

## B. Существенно обновлен текст материала

Обязательно проверить:

- `title`;
- `desc`;
- `tags`;
- `tasks`;
- `audiences`;
- `bookTheme`;
- `expert/expert_name`;
- `updatedAt`;
- `changeSummary`.

После фактической редакционной приемки:

- `reviewedAt` в `data/editorial.json`.

`publishedAt` остается датой первой публикации.

`MOBILE SYNC REQUIRED: YES — CONTENT/METADATA REVIEW`

---

## C. Изменена metadata / классификация

Если меняются:
- title;
- desc;
- tags;
- task;
- audience;
- theme;
- route;
- expert;
- link;
- status;
- locale;

править **source data**, затем:

1. validate;
2. build;
3. GitHub Actions PASS;
4. проверить generated output;
5. проверить production consumer.

`MOBILE SYNC REQUIRED: YES`

---

## D. URL / canonical / master / Alias

Это отдельный класс:

**URL/SEO CHANGE**

До внедрения проверить:
- Карту URL;
- QR;
- canonical;
- Alias;
- sitemap;
- redirects;
- GitHub `link`.

Нельзя менять URL «заодно с переверсткой».

---

# 7. ПОСЛЕ PUSH В GITHUB

Обязательный порядок:

1. Изменить source data.
2. Commit / push.
3. Проверить GitHub Actions.
4. При FAIL — не считать обновление завершенным.
5. При PASS — проверить `dist/app-data.json`.
6. Убедиться, что `material_id` не изменился.
7. Убедиться, что `link` совпадает с production.
8. Проверить Navigator.
9. Если материал участвует в mobile dataset — проверить generated mobile data.

---

# 8. SMOKE-TEST ДЛЯ ЗАРЕГИСТРИРОВАННОГО МАТЕРИАЛА

После существенного обновления проверить:

- [ ] поиск в `/navigator`;
- [ ] карточка открывает правильный URL;
- [ ] фильтры / route видят материал;
- [ ] `material_id` тот же;
- [ ] сохранение / «Мой маршрут», если применимо;
- [ ] «Недавно открытые», если применимо;
- [ ] analytics не получает новый ложный ID;
- [ ] Related ведет на боевые URL;
- [ ] mobile dataset не потерял материал;
- [ ] old ID не появился дублем;
- [ ] Console без новых ошибок.

---

# 9. MASTER / ALIAS / QR

Если есть human-readable master и QR Alias:

1. `material_id` не меняется.
2. QR URL не меняется.
3. В GitHub `link` не переключается на другой адрес без отдельного решения.
4. Контент редактируется в одном source/master.
5. Alias не становится вторым независимым источником.
6. После правки проверяются обе точки входа.

Все `/kniga/linkNN` рассматриваются как immutable QR-points, если Карта URL не зафиксировала иное.

---

# 10. НОВЫЕ МАТЕРИАЛЫ: ПРАВИЛО ВЫДАЧИ ID

Новый ID выдается **до production-внедрения**, а не после.

Порядок:

1. Утвердить, что материал должен войти в `book-app-data`.
2. Определить категорию резерва.
3. Назначить следующий свободный ID внутри закрепленного диапазона.
4. Добавить source record в `data/materials.json`.
5. Добавить editorial record.
6. Validate/build.
7. Только после PASS использовать этот ID в production T123.
8. M2/M3 сразу строить на `bapp-mXXX`.
9. Новый ID после назначения не переиспользовать для другого материала.

Если запланированный материал отменен после регистрации — ID считается retired/unused и не отдается другому материалу автоматически.

---

# 11. ОФИЦИАЛЬНЫЙ РЕЗЕРВ MATERIAL_ID

Проверка актуального `data/materials.json` на 07.09.2026 подтверждает:

- зарегистрированные материалы идут от `m001` до `m038`;
- `m038` — последний занятый ID;
- диапазон `m039+` на момент фиксации свободен.

С этого документа закрепляется:

| Диапазон | Назначение | Статус |
|---|---|---|
| `m039–m048` | Избранные материалы блога, включаемые в приложение | **RESERVED** |
| `m049–m051` | Три новых экспертных гайда | **RESERVED** |
| `m052+` | Не распределено | **FREE — до отдельного решения** |

---

# 12. ПРАВИЛА РЕЗЕРВА `m039–m048`

Десять номеров предназначены **только** для избранных материалов блога, которые будут официально включены в data-layer приложения.

До выбора конкретной десятки:

- не создавать пустые записи в `materials.json`;
- не ставить фиктивные title/link;
- не занимать номера другими типами материалов.

После утверждения списка:

- назначать `m039`, затем `m040` и т. д. последовательно;
- один материал = один ID;
- если материал уже существует в реестре под другим ID, новый ID не создавать.

---

# 13. ПРАВИЛА РЕЗЕРВА `m049–m051`

Три номера предназначены **только** для трех новых экспертных гайдов.

После утверждения авторов/URL:

- первый зарегистрированный новый гайд → `m049`;
- второй → `m050`;
- третий → `m051`.

До фактической регистрации:

- диапазон считается зарезервированным;
- номера не использовать для блогов, кейсов или сервисов.

Если один из трех гайдов не будет опубликован, освобождение номера возможно только отдельным решением владельца. Автоматически переиспользовать номер нельзя.

---

# 14. КАК «ОФИЦИАЛЬНО» ХРАНИТЬ РЕЗЕРВ В GITHUB

Чтобы резерв не жил только в чате, положить в репозиторий два docs-файла:

1. этот Канон:
   `docs/MATERIAL_ID_GITHUB_SYNC_CANON_v1_0_2026-09-07.md`
2. машинно-читаемую таблицу:
   `docs/MATERIAL_ID_RESERVATIONS_v1_0_2026-09-07.json`

JSON находится в `docs/`, а не `data/`, поэтому **не меняет текущую data schema и build**.

До отдельной задачи не подключать этот JSON к runtime.

---

# 15. ПЕРЕДАЧА В НОВЫЙ ЧАТ

Короткая формула:

> Перед любой переверсткой сначала выполни IDENTITY PRECHECK в `book-app-data`. Если материал уже зарегистрирован, сохрани его `material_id`, production URL, route и T123 namespace `bapp-mXXX`; не заменяй их смысловым именем. Для существенной текстовой правки после WEB-приемки синхронизируй source metadata (`updatedAt`, `changeSummary`, при необходимости title/desc/tags/tasks/audiences/bookTheme, затем `reviewedAt`), запусти build и проверь Navigator/mobile. `dist` вручную не редактируй. Резерв IDs: `m039–m048` — избранные материалы блога; `m049–m051` — три новых экспертных гайда; `m052+` свободны до отдельного решения.

---

# 16. КРИТЕРИЙ ПРИЕМКИ ОБНОВЛЯЕМОГО МАТЕРИАЛА

Материал принят только если одновременно:

- WEB-страница визуально принята;
- stable URL сохранен;
- `material_id` сохранен;
- namespace сохранен;
- source metadata актуальна;
- generated output собран;
- GitHub Actions PASS;
- Navigator smoke-test PASS;
- mobile sync закрыт, если требовался;
- нет дубля ID;
- нет второго source для master/Alias.
