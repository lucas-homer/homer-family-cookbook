-- Categories become grouped tags. The tables keep their names (categories,
-- recipe_categories) so existing ids, links and favorites stay valid; the UI
-- calls them tags. Every existing category starts in the 'course' group.
ALTER TABLE categories ADD COLUMN tag_group TEXT NOT NULL DEFAULT 'course'
  CHECK (tag_group IN ('course', 'ingredient', 'kind', 'occasion', 'family', 'source', 'practical'));
CREATE INDEX categories_tag_group ON categories (tag_group, name COLLATE NOCASE);

-- Search also matches tag names, so rebuild the FTS table with a tags column.
DROP TRIGGER IF EXISTS search_recipes_insert;
DROP TRIGGER IF EXISTS search_recipes_update;
DROP TRIGGER IF EXISTS search_recipes_delete;
DROP TRIGGER IF EXISTS search_ingredients_insert;
DROP TRIGGER IF EXISTS search_ingredients_update;
DROP TRIGGER IF EXISTS search_ingredients_delete;
DROP TABLE recipe_search;
CREATE VIRTUAL TABLE recipe_search USING fts5(
  recipe_id UNINDEXED, title, ingredients, instructions, background, tags,
  tokenize = 'unicode61 remove_diacritics 2'
);
INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background, tags) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, ''), COALESCE((SELECT group_concat(c.name, ' ') FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id WHERE rc.recipe_id = r.id), '') FROM recipes r;

CREATE TRIGGER search_recipes_insert AFTER INSERT ON recipes BEGIN
  DELETE FROM recipe_search WHERE recipe_id = NEW.id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background, tags) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, ''), COALESCE((SELECT group_concat(c.name, ' ') FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id WHERE rc.recipe_id = r.id), '') FROM recipes r WHERE r.id = NEW.id;
END;

CREATE TRIGGER search_recipes_update AFTER UPDATE ON recipes BEGIN
  DELETE FROM recipe_search WHERE recipe_id = OLD.id OR recipe_id = NEW.id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background, tags) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, ''), COALESCE((SELECT group_concat(c.name, ' ') FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id WHERE rc.recipe_id = r.id), '') FROM recipes r WHERE r.id = OLD.id OR r.id = NEW.id;
END;

CREATE TRIGGER search_recipes_delete AFTER DELETE ON recipes BEGIN
  DELETE FROM recipe_search WHERE recipe_id = OLD.id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background, tags) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, ''), COALESCE((SELECT group_concat(c.name, ' ') FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id WHERE rc.recipe_id = r.id), '') FROM recipes r WHERE r.id = OLD.id;
END;

CREATE TRIGGER search_ingredients_insert AFTER INSERT ON ingredients BEGIN
  DELETE FROM recipe_search WHERE recipe_id = NEW.recipe_id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background, tags) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, ''), COALESCE((SELECT group_concat(c.name, ' ') FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id WHERE rc.recipe_id = r.id), '') FROM recipes r WHERE r.id = NEW.recipe_id;
END;

CREATE TRIGGER search_ingredients_update AFTER UPDATE ON ingredients BEGIN
  DELETE FROM recipe_search WHERE recipe_id = OLD.recipe_id OR recipe_id = NEW.recipe_id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background, tags) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, ''), COALESCE((SELECT group_concat(c.name, ' ') FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id WHERE rc.recipe_id = r.id), '') FROM recipes r WHERE r.id = OLD.recipe_id OR r.id = NEW.recipe_id;
END;

CREATE TRIGGER search_ingredients_delete AFTER DELETE ON ingredients BEGIN
  DELETE FROM recipe_search WHERE recipe_id = OLD.recipe_id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background, tags) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, ''), COALESCE((SELECT group_concat(c.name, ' ') FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id WHERE rc.recipe_id = r.id), '') FROM recipes r WHERE r.id = OLD.recipe_id;
END;

CREATE TRIGGER search_recipe_tags_insert AFTER INSERT ON recipe_categories BEGIN
  DELETE FROM recipe_search WHERE recipe_id = NEW.recipe_id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background, tags) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, ''), COALESCE((SELECT group_concat(c.name, ' ') FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id WHERE rc.recipe_id = r.id), '') FROM recipes r WHERE r.id = NEW.recipe_id;
END;

CREATE TRIGGER search_recipe_tags_delete AFTER DELETE ON recipe_categories BEGIN
  DELETE FROM recipe_search WHERE recipe_id = OLD.recipe_id;
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background, tags) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, ''), COALESCE((SELECT group_concat(c.name, ' ') FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id WHERE rc.recipe_id = r.id), '') FROM recipes r WHERE r.id = OLD.recipe_id;
END;

CREATE TRIGGER search_tags_rename AFTER UPDATE OF name ON categories BEGIN
  DELETE FROM recipe_search WHERE recipe_id IN (SELECT recipe_id FROM recipe_categories WHERE category_id = NEW.id);
  INSERT INTO recipe_search(recipe_id, title, ingredients, instructions, background, tags) SELECT r.id, r.title, COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = r.id), ''), r.instructions, COALESCE(r.background, ''), COALESCE((SELECT group_concat(c.name, ' ') FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id WHERE rc.recipe_id = r.id), '') FROM recipes r WHERE r.id IN (SELECT recipe_id FROM recipe_categories WHERE category_id = NEW.id);
END;
