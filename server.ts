import express from 'express';
import {createServer as createViteServer} from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RealSongItem {
  id: string | number;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  previewUrl: string;
  duration?: number;
  durationFormatted?: string;
  isFullLength?: boolean;
  tempo: number;
  genre: string;
  year: string;
}

// In-memory cache for fast repeated queries
const liveSearchCache = new Map<string, {timestamp: number; songs: RealSongItem[]}>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// Curated full-length studio tracks and DJ mixes for instant zero-latency loading
const CURATED_FULL_TRACKS: Record<string, RealSongItem[]> = {
  'omah lay': [
    {
      id: 'omah_soso_full',
      title: 'Soso (Extended Afro House Mix - Full Song)',
      artist: 'Omah Lay',
      album: 'Boy Alone (Full Mix)',
      artworkUrl: 'https://v.monophonic.digital/content/baeaaaiqsebctf5mfpyk6lisudvz3t2gm6jlmdhpqvyutt7mqkdzn25wgnr5uu/480x480.jpg',
      previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/KdYw2BO/stream?app_name=neon_runner',
      duration: 208,
      durationFormatted: '3:28',
      isFullLength: true,
      tempo: 112,
      genre: 'Afrobeats',
      year: '2023'
    },
    {
      id: 'omah_reason_full',
      title: 'Reason (Full DJ Mix Edit)',
      artist: 'Omah Lay',
      album: 'Boy Alone (Deluxe)',
      artworkUrl: 'https://audius-creator-4.theblueprint.xyz/content/01JY5BNNFAQDFPK06SPS9JHCQ3/480x480.jpg',
      previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/RR3y6AZ/stream?app_name=neon_runner',
      duration: 83,
      durationFormatted: '1:23',
      isFullLength: true,
      tempo: 112,
      genre: 'Afrobeats',
      year: '2023'
    },
    {
      id: 'omah_bad_influence_full',
      title: 'Bad Influence (Full Extended Track)',
      artist: 'Omah Lay',
      album: 'Get Layd',
      artworkUrl: 'https://audius-01.staked.cloud/content/QmPmaftEkT3AXLhKXf7nh4a5NY3koo4qYFT3xBvDXRFCqi/480x480.jpg',
      previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/M6l1j/stream?app_name=neon_runner',
      duration: 139,
      durationFormatted: '2:19',
      isFullLength: true,
      tempo: 104,
      genre: 'Afrobeats',
      year: '2020'
    }
  ],
  'asake': [
    {
      id: 'asake_dj_megamix',
      title: 'Best Of Asake (Non-Stop DJ Megamix)',
      artist: 'Asake',
      album: 'Mr Money DJ Mix',
      artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/4e/77/4c/4e774c8d-ae67-464c-70e0-826d9c84e27f/196871378377.jpg/480x480bb.jpg',
      previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/search?query=Best%20Of%20Asake%20Mix&app_name=neon_runner',
      duration: 880,
      durationFormatted: '14:40 DJ Mix',
      isFullLength: true,
      tempo: 114,
      genre: 'Amapiano / Afrobeats',
      year: '2024'
    },
    {
      id: 'asake_omo_ope_full',
      title: 'Omo Ope (feat. Olamide - Full Song)',
      artist: 'Asake',
      album: 'Ololade Asake',
      artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/cb/ad/51/cbad5102-7a2e-5036-745a-c5ee694856f6/196626639599.jpg/480x480bb.jpg',
      previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/search?query=Asake%20Omo%20Ope&app_name=neon_runner',
      duration: 190,
      durationFormatted: '3:10',
      isFullLength: true,
      tempo: 115,
      genre: 'Amapiano',
      year: '2022'
    }
  ],
  'davido': [
    {
      id: 'davido_one_thing_full',
      title: 'One Thing (Full Song)',
      artist: 'Davido',
      album: 'A Good Time',
      artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c3/82/cf/c382cf89-a5e0-cb4d-eb28-498c44e99f43/886448028753.jpg/480x480bb.jpg',
      previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/search?query=Davido%20One%20Thing&app_name=neon_runner',
      duration: 192,
      durationFormatted: '3:12',
      isFullLength: true,
      tempo: 108,
      genre: 'Afrobeats',
      year: '2020'
    }
  ],
  'dj mix': [
    {
      id: 'afrobeats_54min_megamix',
      title: 'AFROBEATS X AMAPIANO (54 MIN NON-STOP DJ PARTY MIX)',
      artist: 'DJ JonPuff & Top Afrobeats All-Stars',
      album: 'Ultimate Party Hits Mix',
      artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b4/2c/83/b42c83c2-c516-e5c7-24a0-47b2c5d134b2/197188737353.jpg/480x480bb.jpg',
      previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/search?query=AFROBEATS%20X%20AMAPIANO%20MIX%202026&app_name=neon_runner',
      duration: 3265,
      durationFormatted: '54:25 DJ Mix',
      isFullLength: true,
      tempo: 114,
      genre: 'Afrobeats / Amapiano',
      year: '2026'
    }
  ]
};

// Search Audius for full-length tracks and DJ mixes
async function searchAudiusTracks(cleanQuery: string): Promise<RealSongItem[]> {
  try {
    const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(cleanQuery)}&app_name=neon_runner`;
    const res = await fetch(audiusUrl, {
      headers: {'User-Agent': 'Mozilla/5.0'}
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        const fullSongs: RealSongItem[] = data.data
          .filter((t: any) => t.id && t.title && (t.duration === undefined || t.duration > 45))
          .map((t: any) => {
            const durationSec = t.duration || 180;
            const mins = Math.floor(durationSec / 60);
            const secs = Math.floor(durationSec % 60);
            const durationFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

            let cleanTitle = t.title
              .replace(/\.mp3/gi, '')
              .replace(/\[Official Video\]/gi, '')
              .replace(/\(Official Video\)/gi, '')
              .replace(/\[Lyrics Video\]/gi, '')
              .replace(/\(Lyrics Video\)/gi, '')
              .replace(/\(JustNaija\.com\)/gi, '')
              .replace(/\(TrendyBeatz\.com\)/gi, '')
              .replace(/Official Video/gi, '')
              .replace(/\[MP3_160K\]/gi, '')
              .trim();

            const artwork = t.artwork?.['480x480'] || t.artwork?.['150x150'] || t.artwork?.['1000x1000'] || '';
            const streamUrl = `https://discoveryprovider.audius.co/v1/tracks/${t.id}/stream?app_name=neon_runner`;

            return {
              id: `audius_${t.id}`,
              title: cleanTitle,
              artist: t.user?.name || cleanQuery,
              album: durationSec > 600 ? 'DJ Non-Stop Megamix' : (t.genre || 'Full Studio Track'),
              artworkUrl: artwork,
              previewUrl: streamUrl,
              duration: durationSec,
              durationFormatted: durationSec > 600 ? `${durationFormatted} DJ Mix` : durationFormatted,
              isFullLength: true,
              tempo: 112,
              genre: t.genre || 'Afrobeats',
              year: '2024'
            };
          });

        if (fullSongs.length > 0) return fullSongs;
      }
    }
  } catch (err) {
    console.error('Audius search error:', err);
  }
  return [];
}

// Fallback search via iTunes
async function searchItunes(cleanQuery: string): Promise<RealSongItem[]> {
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=15`;
    const response = await fetch(itunesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results
          .filter((t: any) => t.previewUrl && t.trackName && t.artistName)
          .map((t: any) => ({
            id: t.trackId || Math.random(),
            title: t.trackName,
            artist: t.artistName,
            album: t.collectionName || 'Single',
            artworkUrl: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '300x300bb') : '',
            previewUrl: t.previewUrl,
            duration: 180,
            durationFormatted: '3:00',
            isFullLength: false,
            tempo: 112,
            genre: t.primaryGenreName || 'Afrobeats',
            year: t.releaseDate ? t.releaseDate.substring(0, 4) : '2023'
          }));
      }
    }
  } catch (err) {
    console.error('iTunes live search error:', err);
  }
  return [];
}

async function searchLiveMusic(query: string): Promise<RealSongItem[]> {
  const cleanQuery = (query || 'Omah Lay').trim();
  const lower = cleanQuery.toLowerCase();

  // Check cache
  const cached = liveSearchCache.get(lower);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.songs;
  }

  // Check curated full tracks
  for (const [key, list] of Object.entries(CURATED_FULL_TRACKS)) {
    if (lower.includes(key)) {
      liveSearchCache.set(lower, {timestamp: Date.now(), songs: list});
      return list;
    }
  }

  // 1. Search Audius for full-length tracks and DJ mixes
  const audiusSongs = await searchAudiusTracks(cleanQuery);
  if (audiusSongs.length > 0) {
    liveSearchCache.set(lower, {timestamp: Date.now(), songs: audiusSongs});
    return audiusSongs;
  }

  // 2. Fallback to iTunes
  const itunesSongs = await searchItunes(cleanQuery);
  if (itunesSongs.length > 0) {
    liveSearchCache.set(lower, {timestamp: Date.now(), songs: itunesSongs});
    return itunesSongs;
  }

  return [];
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Audio Streaming Proxy with range headers and support for full-length streams
  app.get('/api/audio-proxy', async (req, res) => {
    let rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    if (!rawUrl) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      // If it is an audius search url or dynamic endpoint, resolve first
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase();

      const isAllowed =
        host.includes('audius.co') ||
        host.includes('apple.com') ||
        host.includes('mzstatic.com') ||
        host.includes('monophonic.digital') ||
        host.includes('theblueprint.xyz') ||
        host.includes('figment.io') ||
        host.includes('staked.cloud') ||
        host.includes('open-audio-validator') ||
        host.includes('zeogrid.com') ||
        host.includes('audiusindex.org') ||
        host.includes('audius-content');

      if (!isAllowed) {
        return res.status(403).send('Forbidden audio domain');
      }

      // If it's an Audius search redirect URL, resolve track ID
      if (rawUrl.includes('/v1/tracks/search?')) {
        const searchRes = await fetch(rawUrl, {headers: {'User-Agent': 'Mozilla/5.0'}});
        if (searchRes.ok) {
          const sData = await searchRes.json();
          if (Array.isArray(sData?.data) && sData.data.length > 0) {
            rawUrl = `https://discoveryprovider.audius.co/v1/tracks/${sData.data[0].id}/stream?app_name=neon_runner`;
          }
        }
      }

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const audioResponse = await fetch(rawUrl, {
        headers,
        redirect: 'follow'
      });

      if (!audioResponse.ok && audioResponse.status !== 206) {
        return res.status(audioResponse.status).send('Upstream error');
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');

      const upstreamType = audioResponse.headers.get('content-type');
      res.setHeader('Content-Type', upstreamType || 'audio/mpeg');

      const contentRange = audioResponse.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);

      const contentLength = audioResponse.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      res.status(audioResponse.status);

      if (audioResponse.body) {
        const reader = audioResponse.body.getReader();
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          if (!res.write(value)) {
            await new Promise((resolve) => res.once('drain', resolve));
          }
        }
        res.end();
      } else {
        res.end();
      }
    } catch (err: any) {
      console.error('Audio proxy error:', err);
      res.status(500).send('Proxy streaming failed');
    }
  });

  // Real Studio Songs & Full DJ Mixes Endpoint
  app.post('/api/gemini/songs', async (req, res) => {
    const rawArtist = typeof req.body?.artist === 'string' ? req.body.artist.trim() : '';
    const query = rawArtist || 'Omah Lay';

    const songs = await searchLiveMusic(query);
    if (songs.length > 0) {
      return res.json({songs, artist: query, source: 'full_tracks_live'});
    }

    // Secondary fallback
    const secondaryQuery = query.replace(/[^\w\s]/gi, '');
    const fallbackSongs = await searchLiveMusic(secondaryQuery);
    return res.json({songs: fallbackSongs, artist: query, source: 'fallback'});
  });

  const distPath = path.resolve(__dirname, 'dist');
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is already in use (another server instance is running).`);
    } else {
      console.error('Server error:', err);
    }
  });
}

process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled Rejection caught:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception caught:', err);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
