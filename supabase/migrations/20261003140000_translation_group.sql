-- Link ENG/KOR translations of the same quote via a shared group id.
ALTER TABLE public.quotes ADD COLUMN translation_group uuid;
CREATE INDEX quotes_translation_group_idx ON public.quotes(translation_group);

WITH pairs(eng, kor) AS (VALUES
  ('One must live the way', '생각하는 대로'),
  ('There is nothing to fear', '두려워할 것은'),
  ('You don''t have to be great', '시작하기 위해'),
  ('Fall seven times', '일곱 번'),
  ('The impediment to action', '행동을 막는'),
  ('Do not pray for an easy', '쉬운 삶을'),
  ('In a gentle way', '온화한'),
  ('To be, or not to be', '가혹한'),
  ('Never wrestle with pigs', '나는 오래전에'),
  ('Nothing on this earth', '이 지구상에'),
  ('The secret of happiness', '행복의 비결'),
  ('Never forget that only dead fish', '단지 죽은'),
  ('The worst thing is not', '가장 나쁜'),
  ('Today is a most unusual', '오늘은 매우'),
  ('Death is not the greatest', '죽음이 인생에서'),
  ('Do not give way to useless', '쓸데없는 불안'),
  ('Smart people focus', '똑똑한'),
  ('Don''t ever promise more', '능력 이상으로'),
  ('The most beautiful people', '우리가 알고 있는'),
  ('The time to repair the roof', '지붕을'),
  ('Hypocrites are those', '위선자란'),
  ('People have a hard time', '사람들은 자신의 고통'),
  ('Transformations always occur', '변화는 항상'),
  ('God does not send us despair', '신은 우리를')
), matched AS (
  SELECT gen_random_uuid() AS g,
         (SELECT id FROM public.quotes WHERE language = 'ENG' AND quote LIKE p.eng || '%') AS eng_id,
         (SELECT id FROM public.quotes WHERE language = 'KOR' AND quote LIKE p.kor || '%') AS kor_id
  FROM pairs p
)
UPDATE public.quotes q SET translation_group = m.g
FROM matched m
WHERE q.id IN (m.eng_id, m.kor_id);
