import { requireSupabaseUser } from '@/lib/auth/requireSession'
import { approveAuthorization, denyAuthorization } from './actions'

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const required = ['client_id', 'response_type', 'code_challenge', 'code_challenge_method', 'state', 'redirect_uri', 'scope'] as const
  for (const k of required) {
    if (!sp[k]) return <p>Missing required parameter: {k}</p>
  }
  if (sp.response_type !== 'code') return <p>response_type must be &quot;code&quot;</p>
  if (sp.code_challenge_method !== 'S256') return <p>code_challenge_method must be S256</p>

  const here = `/oauth/authorize?${new URLSearchParams(sp as Record<string, string>).toString()}`
  const user = await requireSupabaseUser(here)

  const hidden = Object.fromEntries(required.map(k => [k, sp[k]!]))

  return (
    <main style={{ maxWidth: 480, margin: '10vh auto', padding: 24 }}>
      <h1>Authorize WorldWideView Local App</h1>
      <p>Signed in as <strong>{user.email}</strong></p>
      <p>The Local App is requesting access to scope: <code>{sp.scope}</code></p>

      <form action={approveAuthorization} style={{ display: 'inline-block', marginRight: 12 }}>
        {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <button type="submit">Approve</button>
      </form>
      <form action={denyAuthorization} style={{ display: 'inline-block' }}>
        <input type="hidden" name="redirect_uri" value={sp.redirect_uri!} />
        <input type="hidden" name="state" value={sp.state!} />
        <button type="submit">Deny</button>
      </form>
    </main>
  )
}
