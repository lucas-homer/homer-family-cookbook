-- A regular FTS table supports reliable trigger updates without application hooks.
CREATE VIRTUAL TABLE recipe_search USING fts5(
  recipe_id UNINDEXED, title, ingredients, instructions, background,
  tokenize = 'unicode61 remove_diacritics 2'
);
INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, '') FROM recipes r;

CREATE TRIGGER search_recipes_insert AFTER INSERT ON recipes BEGIN
  DELETE FROM recipe_search WHERE recipe_id = NEW.id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, '') FROM recipes r WHERE r.id = NEW.id;
END;

CREATE TRIGGER search_recipes_update AFTER UPDATE ON recipes BEGIN
  DELETE FROM recipe_search WHERE recipe_id = OLD.id OR recipe_id = NEW.id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, '') FROM recipes r WHERE r.id = OLD.id OR r.id = NEW.id;
END;

CREATE TRIGGER search_recipes_delete AFTER DELETE ON recipes BEGIN
  DELETE FROM recipe_search WHERE recipe_id = OLD.id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, '') FROM recipes r WHERE r.id = OLD.id;
END;

CREATE TRIGGER search_ingredients_insert AFTER INSERT ON ingredients BEGIN
  DELETE FROM recipe_search WHERE recipe_id = NEW.recipe_id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, '') FROM recipes r WHERE r.id = NEW.recipe_id;
END;

CREATE TRIGGER search_ingredients_update AFTER UPDATE ON ingredients BEGIN
  DELETE FROM recipe_search WHERE recipe_id = OLD.recipe_id OR recipe_id = NEW.recipe_id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, '') FROM recipes r WHERE r.id = OLD.recipe_id OR r.id = NEW.recipe_id;
END;

CREATE TRIGGER search_ingredients_delete AFTER DELETE ON ingredients BEGIN
  DELETE FROM recipe_search WHERE recipe_id = OLD.recipe_id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, '') FROM recipes r WHERE r.id = OLD.recipe_id;
END;
