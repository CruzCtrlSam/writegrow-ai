# WriteGrow AI Brand Voice System

WriteGrow AI keeps educational and brand language separate from UI and business logic.

## Folder Structure

- `src/content/brandPromise.ts` stores the permanent brand promise.
- `src/content/coachNotes.ts` stores context-aware Coach's Notes by writing genre.
- `src/content/encouragements.ts` stores celebration and encouragement language.
- `src/content/reflectionPrompts.ts` stores reflection questions by genre.
- `src/content/scorecardMessages.ts` stores reusable scorecard explanations.
- `src/content/growthLabels.ts` stores growth-centered product labels.
- `src/content/terminology.ts` stores preferred replacement language.
- `src/content/uiMessages.ts` stores common interface copy.
- `src/services/brandVoice.ts` is the only service consumers should call.

## Responsibilities

Content files contain educational copy only. They should not import React, call databases, or contain business rules.

The `brandVoice` service chooses the right content for grade band, writing genre, context, and future locale.

## Adding Coach's Notes

Add notes to `src/content/coachNotes.ts` under the appropriate category. Keep each note short, warm, and classroom-ready.

## Adding Encouragements

Add new lines to `src/content/encouragements.ts`. Use growth language, not perfection language.

## Adding Reflection Prompts

Add prompts to `src/content/reflectionPrompts.ts` by genre. Prompts should help students think about their writing choices.

## Localization

The service exposes a `locale` field and isolates copy in content files. Future Spanish support can add parallel content files or locale-keyed objects without changing UI components.

## Extension

Future teacher and parent summaries should be added as content files and exposed through `brandVoice`, rather than hardcoded inside pages.
