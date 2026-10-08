import { expect, mock, test } from 'claude-code/testing'

const KEY = '94fe81e25925b71b56c5080f2e3369e0'
const PROG = {
  step: 3,
  steps: ['Your business', 'Your video', 'Your routes', 'Your questions', 'Your page', 'Live', 'Video links'].map((name, i) => ({ n: i + 1, name, done: i < 2 })),
  business: { sells: 'Golf lessons', price: '$300' },
  video: { video: 'Why you three-putt', scorecard: 'The putting scorecard' },
  routes: [],
  sums: { line: '5,000 views → about 90 leads' },
  live_link: null,
  verified: false,
  editor: 'https://lewiswjackson.com/scorecards/edit/x',
}
const withKey = { options: { workshop_key: '94fe81e25925b71b56c5080f2e3369e0' } }
const PANE = {
  plugin: 'money-magnet',
  component: 'Pane',
  requestId: 'money-magnet',
  viewport: { columns: 100, rows: 30 },
  props: { title: 'Money Magnet', isFocused: true, bodyColumns: 60, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

function stubs(on, seen) {
  seen.clock = mock.clock(on)
  on('http.fetch', ($, e) => {
    seen.urls.push(e.url)
    return { value: { ok: true, status: 200, headers: {}, text: JSON.stringify(PROG) } }
  })
  on('command.register', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', () => ({ cwd: '/work' }))
  on('prompt.submit', ($, e) => {
    seen.prompts.push(e)
    return { text: e.text }
  })
  on('tool.call', () => ({ result: 'ran' }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['drawn by Claude Code'] }))
}

test('pane shows the steps, and the button starts the next step', withKey, async ($, on) => {
  const seen = { urls: [], prompts: [] }
  stubs(on, seen)
  await $.session.start({})
  expect(seen.urls[0]).toBe(`https://lewiswjackson.com/scorecards/edit/${KEY}/progress`)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: '3  Your routes' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '2 of 7' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '\u2588'.repeat(7) })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Why you three-putt' })).toBeDefined()
    await ui.press({ key: 'next' })
    await seen.clock.settle()
    await ui.unmount()
  }
  expect(seen.prompts.filter((p) => /step 3 of my Money Magnet: Your routes/.test(p.text)).length).toBe(2)
})

test('each prompt tells Claude the step and to offer choices', withKey, async ($, on) => {
  const seen = { urls: [], prompts: [] }
  stubs(on, seen)
  await $.session.start({})
  await $.prompt.submit({ text: 'hi' })
  const ctx = seen.prompts.find((p) => p.text === 'hi').context.join('\n')
  expect(ctx).toMatch(/step 3 of 7: Your routes/)
  expect(ctx).toMatch(/AskUserQuestion/)
})

test('an API key can not be written into a project file', withKey, async ($, on) => {
  const seen = { urls: [], prompts: [] }
  stubs(on, seen)
  const bad = await $.tool.call({ tool: 'Write', file_path: '/work/my-scorecard/api/submit.js', content: 'const k = "kit_0123456789abcdef0123456789abcdef"' })
  expect(bad.deny).toMatch(/vercel env add/)
  const ok = await $.tool.call({ tool: 'Write', file_path: '/work/my-scorecard/.env.local', content: 'KIT_API_KEY=kit_0123456789abcdef0123456789abcdef' })
  expect(ok.deny).toBeUndefined()
})
