/** Supabase/PostgREST caps every response at `db-max-rows` (1000 by default) and
 *  truncates silently — no error, no flag. Any select that can outgrow that must
 *  be paged, or the tail of the result set just disappears.
 *
 *  The paged query MUST order by a unique tiebreaker (e.g. `id`) as its last
 *  `.order()`, otherwise rows that tie on the earlier sort keys can shuffle
 *  between requests and be duplicated or skipped across page boundaries.
 */

export const PAGE_SIZE = 1000;

/**
 * @param {(from: number, to: number) => PromiseLike<{ data: any[] | null, error: any }>} buildQuery
 *        Called once per page with an inclusive range to pass to `.range(from, to)`.
 * @returns {Promise<{ data: any[], error: any }>}
 */
export async function fetchAllRows(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) return { data: [], error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}
