-- Photos and videos on a recipe. The file itself is in the MEDIA R2 bucket
-- under recipes/<recipe_id>/<id>; this row is what makes it visible.
CREATE TABLE recipe_media (
  id           TEXT PRIMARY KEY,
  recipe_id    TEXT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  user_id      TEXT REFERENCES users (id) ON DELETE SET NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('photo', 'video')),
  content_type TEXT NOT NULL,
  bytes        INTEGER NOT NULL,
  width        INTEGER,
  height       INTEGER,
  position     INTEGER NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX recipe_media_recipe ON recipe_media (recipe_id, position);
