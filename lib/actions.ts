'use server'

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { supabaseAdmin } from './supabase'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fdfd88837332d96c810a9b2b528b9cc674ee6f06a1fbd7c372f88cf5d9f10a8c'
)

// ----------------------------------------------------
// Authentication Actions
// ----------------------------------------------------

export async function loginAction(usernameInput: string, passwordInput: string) {
  const adminUsername = process.env.ADMIN_USERNAME
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminUsername || !adminPassword) {
    return { success: false, error: 'Server authentication configuration is missing.' }
  }

  if (usernameInput === adminUsername && passwordInput === adminPassword) {
    const token = await new SignJWT({ authenticated: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return { success: true }
  }

  return { success: false, error: 'Invalid username or password' }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  return { success: true }
}

export async function checkAuth() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value

    if (!token) return false

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return !!payload.authenticated
  } catch (error) {
    return false
  }
}

// ----------------------------------------------------
// Watchlist Database CRUD Actions
// ----------------------------------------------------

export async function getWatchlist(filters: {
  status?: string
  type?: string
  search?: string
}) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    throw new Error('Unauthorized')
  }

  try {
    let query = supabaseAdmin.from('watchlist').select('*')

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.type && filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }

    // Sort by most recently added first
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Database query error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('Fetch error:', err)
    return { success: false, error: err.message || 'An unexpected error occurred' }
  }
}

export async function addToWatchlist(item: {
  title: string
  type: 'movie' | 'tv' | 'anime'
  status: 'watching' | 'plan_to_watch' | 'completed'
  poster_url?: string
  rating?: number
  notes?: string
  api_id?: string
  release_year?: string
}) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    throw new Error('Unauthorized')
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('watchlist')
      .insert([
        {
          title: item.title,
          type: item.type,
          status: item.status,
          poster_url: item.poster_url || null,
          rating: item.rating ?? 0,
          notes: item.notes || '',
          api_id: item.api_id || null,
          release_year: item.release_year || null,
        },
      ])
      .select()

    if (error) {
      console.error('Database insert error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data?.[0] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add item' }
  }
}

export async function updateWatchlistItem(
  id: string,
  updates: {
    status?: 'watching' | 'plan_to_watch' | 'completed'
    rating?: number
    notes?: string
  }
) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    throw new Error('Unauthorized')
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('watchlist')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) {
      console.error('Database update error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data?.[0] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update item' }
  }
}

export async function deleteFromWatchlist(id: string) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    throw new Error('Unauthorized')
  }

  try {
    const { error } = await supabaseAdmin
      .from('watchlist')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete item' }
  }
}

// ----------------------------------------------------
// TMDB & AniList External Search Action
// ----------------------------------------------------

export async function searchMedia(query: string, searchType: 'movie_tv' | 'anime') {
  const isAuth = await checkAuth()
  if (!isAuth) {
    throw new Error('Unauthorized')
  }

  if (!query || query.trim().length === 0) {
    return { success: true, results: [] }
  }

  try {
    if (searchType === 'movie_tv') {
      const tmdbKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY
      if (!tmdbKey) {
        return {
          success: false,
          error: 'TMDB_KEY_MISSING',
          message: 'Missing TMDB API Key. Please add it to your .env file.',
        }
      }

      const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
        query
      )}&api_key=${tmdbKey}&include_adult=false`
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`TMDB API returned HTTP ${res.status}`)
      }
      const data = await res.json()

      const results = (data.results || [])
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((item: any) => {
          const title = item.title || item.name
          const releaseDate = item.release_date || item.first_air_date || ''
          const releaseYear = releaseDate ? releaseDate.split('-')[0] : ''
          const posterUrl = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null

          return {
            api_id: String(item.id),
            title,
            type: item.media_type as 'movie' | 'tv',
            release_year: releaseYear,
            poster_url: posterUrl,
          }
        })

      return { success: true, results }
    } else {
      // Anime search using AniList GraphQL API
      const graphQLQuery = `
        query ($search: String) {
          Page(page: 1, perPage: 15) {
            media(search: $search, type: ANIME) {
              id
              title {
                english
                romaji
                native
              }
              coverImage {
                large
              }
              startDate {
                year
              }
            }
          }
        }
      `

      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: graphQLQuery,
          variables: { search: query },
        }),
      })

      if (!res.ok) {
        throw new Error(`AniList API returned HTTP ${res.status}`)
      }

      const body = await res.json()
      const list = body?.data?.Page?.media || []

      const results = list.map((item: any) => {
        const title = item.title.english || item.title.romaji || item.title.native || 'Unknown Anime'
        const releaseYear = item.startDate?.year ? String(item.startDate.year) : ''
        const posterUrl = item.coverImage?.large || null

        return {
          api_id: String(item.id),
          title,
          type: 'anime' as 'anime',
          release_year: releaseYear,
          poster_url: posterUrl,
        }
      })

      return { success: true, results }
    }
  } catch (err: any) {
    console.error('Media search error:', err)
    return { success: false, error: 'SEARCH_FAILED', message: err.message || 'API query failed' }
  }
}
