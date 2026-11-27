-- Timers the author reviewed in the edit form: a JSON array with one array of
-- seconds per step, e.g. [[], [2400], [], [900]]. NULL means nobody has saved
-- the recipe since timers existed, so they're found in the step text instead
-- (src/lib/recipe-steps.ts).
ALTER TABLE recipes ADD COLUMN step_timers TEXT;
