-- ============================================================
-- WriteGrow AI — seed writing prompts
-- Optional. Gives the prompt library starter content so the app
-- works without the OpenAI key. Run after schema.sql.
-- ============================================================

insert into public.writing_prompts (category, grade_min, grade_max, title, body, character_trait, is_seed) values
-- Narrative
('narrative', 3, 5, 'A Surprising Day', 'Write a story about a day when something completely unexpected happened. Who was there? What changed by the end?', null, true),
('narrative', 6, 8, 'The Door You Never Opened', 'Tell a story about a character who finally opens a door they have always avoided. Show how they feel before and after.', null, true),
-- Opinion / Persuasive
('opinion', 3, 5, 'Best Class Pet', 'What animal would make the best class pet? Give three reasons and try to convince your reader.', null, true),
('opinion', 6, 8, 'Screens at School', 'Should students use tablets instead of textbooks? Argue your position and answer one objection someone might raise.', null, true),
-- Informative / Expository
('informative', 3, 5, 'How To Be a Good Friend', 'Explain the steps someone can take to be a good friend. Use clear order words like first, next, and finally.', null, true),
('informative', 6, 8, 'Explain a Hobby', 'Teach your reader about a hobby or skill you know well. Define key terms and give an example for each.', null, true),
-- Creative
('creative', 3, 5, 'If My Pet Could Talk', 'Imagine your pet (or a pet you wish you had) could talk for one day. Write what happens.', null, true),
('creative', 6, 8, 'The Last Light', 'Write the opening of a story set in a world where the sun has not risen in three days. Set the mood with strong details.', null, true),
-- Summary
('summary', 3, 5, 'Retell a Favorite Story', 'Summarize a book or movie you love in your own words. Include only the most important events.', null, true),
('summary', 6, 8, 'Summarize an Article', 'Pick a short article or chapter you read recently. Summarize the main idea and two key supporting details.', null, true),

-- Character-building prompts (optional theme) -------------------
('narrative', 3, 5, 'A Kind Choice', 'Write about a time a character chose to be kind even when it was hard. What did they do?', 'kindness', true),
('opinion', 6, 8, 'Why Courage Matters', 'What does it mean to be brave? Convince your reader that courage is more than not being scared.', 'courage', true),
('informative', 3, 5, 'Being Responsible', 'Explain what it means to be responsible at home or school. Give real examples.', 'responsibility', true),
('narrative', 6, 8, 'The Long Way', 'Tell a story about a character who keeps working at something difficult and does not give up.', 'perseverance', true),
('opinion', 3, 5, 'Always Tell the Truth?', 'Is honesty always the best choice? Share your opinion with reasons.', 'honesty', true),
('informative', 6, 8, 'The Habit of Diligence', 'Explain how doing careful, steady work (diligence) helps people reach big goals.', 'diligence', true);
