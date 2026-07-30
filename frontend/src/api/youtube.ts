import api from './client'

export const importChannel = async (channelUrl: string, maxResults: number = 50, guessTmdb: boolean = true) => {
  const { data } = await api.post<{ imported: number; skipped: number; errors: string[]; total_found: number }>(
    '/youtube/import-channel',
    null,
    { params: { channel_url: channelUrl, max_results: maxResults, guess_tmdb: guessTmdb } },
  )
  return data
}
