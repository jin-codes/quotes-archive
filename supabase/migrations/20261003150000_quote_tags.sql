-- Multi-tag classification (Korean tags) alongside the legacy single category.
ALTER TABLE public.quotes ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.pending_quotes ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX quotes_tags_idx ON public.quotes USING gin (tags);

-- 1) Tag Korean quotes by prefix (translations inherit below through translation_group).
WITH tagmap(key, tags) AS (VALUES
  ('생각하는 대로', ARRAY['삶','자기성찰','태도']),
  ('두려워할 것은', ARRAY['두려움','용기']),
  ('시작하기 위해', ARRAY['시작','도전','성장']),
  ('일곱 번', ARRAY['끈기','실패','용기','속담']),
  ('행동을 막는', ARRAY['역경','끈기','태도']),
  ('쉬운 삶을', ARRAY['역경','끈기','삶']),
  ('온화한', ARRAY['변화','태도']),
  ('가혹한', ARRAY['고통','삶']),
  ('나는 오래전에', ARRAY['지혜','인간관계']),
  ('이 지구상에', ARRAY['성장','삶','변화']),
  ('행복의 비결', ARRAY['행복','삶','의미']),
  ('단지 죽은', ARRAY['태도','용기']),
  ('가장 나쁜', ARRAY['자기성찰','겸손','지혜']),
  ('오늘은 매우', ARRAY['시간','삶','현재']),
  ('죽음이 인생에서', ARRAY['죽음','삶','의미']),
  ('쓸데없는 불안', ARRAY['두려움','마음','준비']),
  ('똑똑한', ARRAY['집중','지혜','일']),
  ('능력 이상으로', ARRAY['약속','신뢰','일']),
  ('우리가 알고 있는', ARRAY['고통','극복','성장']),
  ('지붕을', ARRAY['준비','지혜']),
  ('위선자란', ARRAY['위선','인간관계','진실']),
  ('사람들은 자신의 고통', ARRAY['고통','두려움','변화']),
  ('변화는 항상', ARRAY['위기','변화','성장']),
  ('신은 우리를', ARRAY['희망','고통']),
  ('최고의 성취는', ARRAY['성취','일','즐거움']),
  ('신이시여, 비록', ARRAY['용기','희망','신념']),
  ('실패하면 실망', ARRAY['실패','도전','후회']),
  ('하루에 한 번도 춤', ARRAY['삶','행복','즐거움']),
  ('어부들은', ARRAY['용기','두려움','도전']),
  ('별에 닿으려', ARRAY['행복','현재','마음']),
  ('올바른 마음가짐', ARRAY['태도','마음','성공']),
  ('아무도 과거로', ARRAY['시작','변화','희망']),
  ('어떤 일이라도', ARRAY['일','시작','지혜']),
  ('한 번의 패배', ARRAY['실패','끈기','극복']),
  ('비참하게 실패할', ARRAY['실패','도전','용기']),
  ('인생의 낭비는', ARRAY['삶','사랑','후회']),
  ('우리는 다른 사람을', ARRAY['자기성찰','인간관계','진실']),
  ('성공하는 사람은', ARRAY['성공','인간관계','일']),
  ('우리의 삶은 위험을', ARRAY['용기','성장','자기성찰']),
  ('성공의 주요 열쇠', ARRAY['성공','역경','끈기']),
  ('필요한 것부터', ARRAY['시작','도전','끈기']),
  ('모든 시련에는', ARRAY['역경','마음','지혜']),
  ('기회는 언제나', ARRAY['기회','끈기','희망']),
  ('희망은 절대', ARRAY['희망','마음']),
  ('여기에는 낯선', ARRAY['인간관계','마음']),
  ('진실은 당신에게', ARRAY['진실','지혜']),
  ('나는 때때로', ARRAY['마음','인간관계','문학']),
  ('시간이 부족하다고', ARRAY['시간','태도','성공']),
  ('우리가 기도할 때', ARRAY['마음','삶','행복']),
  ('인생에는 두 가지', ARRAY['선택','삶','책임']),
  ('간단한 일을', ARRAY['끈기','일','배움']),
  ('측정할 수 없다면', ARRAY['일','성장','지혜']),
  ('시간은 가장 희소', ARRAY['시간','일','리더십']),
  ('아침에 일어날 때', ARRAY['삶','감사','현재']),
  ('우리는 어떤 질문의 답', ARRAY['배움','끈기']),
  ('나는 정신 나간', ARRAY['변화','지혜','자기성찰'])
)
UPDATE public.quotes q SET tags = m.tags
FROM tagmap m
WHERE q.language = 'KOR' AND q.quote LIKE m.key || '%';

-- 2) English translations inherit the tags of their Korean twin.
UPDATE public.quotes q SET tags = k.tags
FROM public.quotes k
WHERE q.translation_group IS NOT NULL
  AND q.translation_group = k.translation_group
  AND q.language = 'ENG' AND k.language = 'KOR';

-- 3) English-only quotes.
WITH tagmap(key, tags) AS (VALUES
  ('Brilliant thinking is rare', ARRAY['용기','지혜']),
  ('Competition is for losers', ARRAY['성공','일']),
  ('It always seems impossible', ARRAY['도전','끈기','용기'])
)
UPDATE public.quotes q SET tags = m.tags
FROM tagmap m
WHERE q.language = 'ENG' AND q.quote LIKE m.key || '%';

-- 4) Fold the old category into tags where it carried meaning.
UPDATE public.quotes SET tags = array_append(tags, '철학')
WHERE category = 'Philosophy' AND NOT ('철학' = ANY(tags));
UPDATE public.quotes SET tags = array_append(tags, '문학')
WHERE category = 'Literature' AND NOT ('문학' = ANY(tags));

-- 5) Translation pairs share the union of their tags.
WITH u AS (
  SELECT translation_group g, array_agg(DISTINCT t ORDER BY t) tags
  FROM public.quotes, unnest(tags) t WHERE translation_group IS NOT NULL GROUP BY 1
)
UPDATE public.quotes q SET tags = u.tags FROM u WHERE q.translation_group = u.g AND q.tags IS DISTINCT FROM u.tags;
