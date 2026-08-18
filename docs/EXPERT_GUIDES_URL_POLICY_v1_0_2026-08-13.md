# Expert Guides URL Policy

Version: 1.0  
Date: 2026-08-13  
Stage: 5B.6A  
Branch: `stage5-p1-expert-guides`

## Status

Approved owner decision for the expert-guide address model.

This document mirrors the Stage 5B.6A decision recorded in
`Main_URL_Map_v1_7_2026-08-13.md`.

## Core rule

For an expert guide that is already encoded in a QR code in the printed book,
keep two public address scenarios:

1. `/kniga/linkNN` — permanent printed-book entry point;
2. a human-readable public URL — external linking, search and expert-guide promotion.

Do not rename, unpublish or redirect any printed QR URL.

Do not maintain two independent editorial versions manually.

Target architecture:

`one content master -> two address scenarios`

The exact Tilda implementation must first be validated on one pilot pair before
mass rollout. Until that pilot passes, do not add redirects between the two URLs.

## Existing expert-guide pairs

| Expert | Human-readable URL | Printed QR URL |
|---|---|---|
| Ярослав Мешалкин | `/ot-pr-k-industrii-doveriya/reinzhiniring-kommunikaciy-yaroslav-meshalkin` | `/kniga/link21` |
| Иван Афанасьев | `/informacionnaya-ataka-chek-list-kommunikatora-afanasev` | `/kniga/link13` |
| Тимур Асланов | `/timur-aslanov-guide-algoritm-mediatizacii` | `/kniga/link12` |
| Сергей Половников | `/polovnikov-remerky-na-polyach` | `/kniga/link15` |
| Евгений Темпераментов | `/gaid-kommunikacionnyy-menedzhment-temperamentov` | `/kniga/link17` |
| Ника Комарова | `/antikrizisnaya-strategiya-nika-komarova` | `/kniga/link30` |
| Матасова — имя требуется сверить перед публикацией | `/8-trust-triggers-grafic-dizaign` | `/kniga/link25` |
| Антон Дубинчин | `/10-pravil-anton-dubinchin` | `/kniga/link8` |

## New expert guides without a printed QR

Create only a human-readable public URL.

Do not invent a new `/kniga/linkNN` address and do not show a
`Книга, с. NN` label unless the guide actually exists in the printed book.

This applies to new guides such as the planned materials by Maria Vasilieva
and Yulia Shevchenko unless a printed QR source is confirmed.

## `/expert-guides`

Keep `/expert-guides` as the public expert-guide hub.

Target content model:

- primary section: invited experts;
- separate section/filter for author materials by Madina Malova if they remain
  on the page;
- Nika Komarova must be restored to the invited-experts set;
- do not present an author material as if it were an invited-expert guide.

## Indexing

- `/kniga/link*`: `index, follow`;
- `/expert-guides`: `index, follow`;
- human-readable expert-guide URLs: `index, follow`.

Canonical handling for duplicate content across QR/human-readable pairs is not
changed globally until the pilot of the single-content-source architecture passes.

## Pilot before rollout

Use the first existing guide pair as a technical pilot.

Acceptance:
- both public URLs work;
- printed QR URL remains unchanged;
- no duplicate manual content maintenance;
- no Tilda conflict;
- correct desktop/mobile rendering;
- correct author attribution;
- correct SEO/canonical behavior after the chosen implementation is verified;
- rollback is obvious.

Only after this pilot passes may the same architecture be rolled out to the
remaining expert guides.
