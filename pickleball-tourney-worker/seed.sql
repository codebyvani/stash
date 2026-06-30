-- Optional seed: the 9 approved teams from Notion as of 2026-06-30.
-- Apply with: wrangler d1 execute tournament --remote --file=seed.sql

INSERT INTO teams (id, name, player1, player1_skill, player2, player2_skill) VALUES
  (1, 'Dink ang Bato !',   'Jovin Jimenez',              2, 'Nelson Francisco Ruiz Jr.',        1),
  (2, 'Dinkadaog',         'Karl Vincent Allosada Lim',  2, 'Harris Cabacog Baldon',            1),
  (3, 'Lord of the Dinks', 'Jessah Duran',               1, 'Filadelfo Sandalo Jr.',            3),
  (4, 'D²',                'Clint Rey Duran',            3, 'Kristine Denaya',                  1),
  (5, 'Dinky Kong',        'Rhea Mae Limotan Barrita',   1, 'Chris Niven Divinagracia Meneses', 2),
  (6, 'ML NA LANG TA',     'Wesley Man-on',              3, 'Patrick Jerome Bungabong',         1),
  (7, 'Taguro Brothers',   'Crestelito Cuyno',           2, 'Paul Angelo Villarante',           2),
  (8, '4K Hi-def',         'Kayle Kristoffer Millan',    3, 'Karl Joseph Kangleon',             1),
  (9, 'Renan & Flo',       'Renan Morito Bautista',      3, 'Florence Athena Zauleck',          1);
