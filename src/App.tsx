
import { useState } from 'react'
import './App.css'

type Repository = {
  id: number
  full_name: string
  description: string | null
  stargazers_count: number
  language: string | null
  html_url: string
}

type SearchResponse = {
  items: Repository[]
  total_count: number
}

function App() {
  const [query, setQuery] = useState('react')
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('stars')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  async function searchRepositories(pageToLoad = 1) {
    if (!query.trim()) {
      setError('Please enter a search term.')
      setRepositories([])
      setTotalCount(0)
      return
    }

    setLoading(true)
    setError('')

    try {
      const url = new URL(
        'https://api.github.com/search/repositories',
      )

      const searchQuery =
        language === 'all'
          ? query.trim()
          : `${query.trim()} language:${language}`

      url.searchParams.set('q', searchQuery)
      url.searchParams.set('sort', sortBy)
      url.searchParams.set('order', 'desc')
      url.searchParams.set('per_page', '10')
      url.searchParams.set('page', String(pageToLoad))

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? 'GitHub rate limit reached. Please wait and try again.'
            : `GitHub request failed (${response.status}).`,
        )
      }

      const data: SearchResponse = await response.json()

      setRepositories(data.items)
      setTotalCount(data.total_count)
      setPage(pageToLoad)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )

      setRepositories([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.min(
    Math.ceil(totalCount / 10),
    100,
  )

  return (
    <main className="dashboard">
      <header className="header">
        <h1>OpenSource Health</h1>
        <p>Discover and explore real open-source projects.</p>
      </header>

      <section className="welcome">
        <h2>Explore open source</h2>
        <p>Search GitHub repositories, sorted by your preference.</p>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void searchRepositories(1)
          }}
        >
          <label htmlFor="project-search">
            Search repositories
          </label>

          <input
            id="project-search"
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try React, TypeScript, or Python..."
          />

          <label htmlFor="language-filter">Language</label>

          <select
            id="language-filter"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="all">All languages</option>
            <option value="JavaScript">JavaScript</option>
            <option value="TypeScript">TypeScript</option>
            <option value="Python">Python</option>
            <option value="Go">Go</option>
            <option value="Rust">Rust</option>
          </select>

          <label htmlFor="sort-filter">Sort by</label>

          <select
            id="sort-filter"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="stars">Most stars</option>
            <option value="forks">Most forks</option>
            <option value="updated">Recently updated</option>
          </select>

          <button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search GitHub'}
          </button>
        </form>

        {error && <p role="alert">{error}</p>}

        {loading && (
          <p role="status">Loading repositories...</p>
        )}

        {!loading &&
          !error &&
          repositories.length === 0 && (
            <p>Search for a topic to discover repositories.</p>
          )}

        {!loading && !error && totalCount > 0 && (
          <p className="result-count">
            Found {totalCount.toLocaleString()} repositories.
            {' '}Page {page} of {totalPages}.
          </p>
        )}

        <div className="project-list">
          {repositories.map((repository) => (
            <article
              className="project-card"
              key={repository.id}
            >
              <div className="project-heading">
                <h3>
                  <a
                    href={repository.html_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {repository.full_name}
                  </a>
                </h3>

                <span>
                  ★ {repository.stargazers_count.toLocaleString()}
                </span>
              </div>

              <p>
                {repository.description ??
                  'No description provided.'}
              </p>

              <small>
                {repository.language ??
                  'Language not specified'}
              </small>
            </article>
          ))}
        </div>

        {!loading && !error && totalCount > 0 && (
          <nav
            className="pagination"
            aria-label="Repository pages"
          >
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void searchRepositories(page - 1)}
            >
              Previous
            </button>

            <span>Page {page}</span>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => void searchRepositories(page + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </main>
  )
}

export default App
