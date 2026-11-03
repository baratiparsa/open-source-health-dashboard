
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App component', () => {
  it('renders the main heading', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'OpenSource Health' }),
    ).toBeTruthy()
  })

  it('allows the user to type in the search field', async () => {
    const user = userEvent.setup()

    render(<App />)

    const searchInput = screen.getByRole('textbox', {
      name: /Search repositories/,
    })

    await user.clear(searchInput)
    await user.type(searchInput, 'typescript')

    expect(searchInput).toHaveProperty('value', 'typescript')
  })

  it('displays repositories returned by GitHub search', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total_count: 1,
          items: [
            {
              id: 1,
              full_name: 'microsoft/TypeScript',
              description:
                'TypeScript is JavaScript with syntax for types.',
              stargazers_count: 100000,
              language: 'TypeScript',
              html_url: 'https://github.com/microsoft/TypeScript',
            },
          ],
        }),
      }),
    )

    render(<App />)

    const searchInput = screen.getByRole('textbox', {
      name: /Search repositories/,
    })

    await user.clear(searchInput)
    await user.type(searchInput, 'typescript')

    await user.click(
      screen.getByRole('button', { name: /Search GitHub/i }),
    )

    expect(
      await screen.findByText('microsoft/TypeScript'),
    ).toBeTruthy()
  })

  it('displays an error when GitHub API returns a server error', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    )

    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /Search GitHub/i }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveProperty(
      'textContent',
      'GitHub request failed (500).',
    )
  })

  it('handles an empty GitHub search result', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total_count: 0,
          items: [],
        }),
      }),
    )

    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /Search GitHub/i }),
    )

    expect(screen.queryByRole('article')).toBeNull()
  })

  it('displays an error when the network request fails', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(
        new Error('Network connection failed.'),
      ),
    )

    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /Search GitHub/i }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveProperty(
      'textContent',
      'Network connection failed.',
    )
  })

  it('shows the loading state and disables the search button', async () => {
    const user = userEvent.setup()

    let resolveFetch!: (value: unknown) => void

    const pendingRequest = new Promise((resolve) => {
      resolveFetch = resolve
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(pendingRequest),
    )

    render(<App />)

    const searchButton = screen.getByRole('button', {
      name: /Search GitHub/i,
    }) as HTMLButtonElement

    await user.click(searchButton)

    expect(
      screen.getByRole('status').textContent,
    ).toBe('Loading repositories...')

    expect(searchButton.disabled).toBe(true)

    resolveFetch({
      ok: true,
      json: async () => ({
        total_count: 1,
        items: [
          {
            id: 1,
            full_name: 'microsoft/TypeScript',
            description: 'A TypeScript repository.',
            stargazers_count: 100000,
            language: 'TypeScript',
            html_url: 'https://github.com/microsoft/TypeScript',
          },
        ],
      }),
    })

    expect(
      await screen.findByText('microsoft/TypeScript'),
    ).toBeTruthy()

    expect(screen.queryByRole('status')).toBeNull()
    expect(searchButton.disabled).toBe(false)
  })

  it('applies the language filter and sorting options', async () => {
    const user = userEvent.setup()

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_count: 1,
        items: [],
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await user.selectOptions(
      screen.getByLabelText('Language'),
      'TypeScript',
    )

    await user.selectOptions(
      screen.getByLabelText('Sort by'),
      'forks',
    )

    await user.click(
      screen.getByRole('button', { name: /Search GitHub/i }),
    )

    expect(fetchMock).toHaveBeenCalled()

    const requestedUrl = new URL(
      String(fetchMock.mock.calls[0][0]),
    )

    expect(requestedUrl.searchParams.get('q')).toBe(
      'react language:TypeScript',
    )

    expect(requestedUrl.searchParams.get('sort')).toBe('forks')
  })

  it('loads the next page of repositories', async () => {
    const user = userEvent.setup()

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_count: 20,
          items: [
            {
              id: 1,
              full_name: 'example/repository-one',
              description: 'First repository',
              stargazers_count: 100,
              language: 'JavaScript',
              html_url: 'https://github.com/example/repository-one',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_count: 20,
          items: [
            {
              id: 2,
              full_name: 'example/repository-two',
              description: 'Second repository',
              stargazers_count: 90,
              language: 'TypeScript',
              html_url: 'https://github.com/example/repository-two',
            },
          ],
        }),
      })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /Search GitHub/i }),
    )

    expect(
      await screen.findByText('example/repository-one'),
    ).toBeTruthy()

    await user.click(
      screen.getByRole('button', { name: 'Next' }),
    )

    expect(
      await screen.findByText('example/repository-two'),
    ).toBeTruthy()

    expect(fetchMock).toHaveBeenCalledTimes(2)

    const secondRequestUrl = new URL(
      String(fetchMock.mock.calls[1][0]),
    )

    expect(secondRequestUrl.searchParams.get('page')).toBe('2')
  })
})
