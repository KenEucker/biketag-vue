import fs from 'fs/promises'
import path from 'path'

export default async (req: Request): Promise<Response> => {
  const functionsDir = path.resolve(process.cwd(), 'functions')

  let html = `<html>
    <head>
      <title>API Index</title>
      <style>
        body { font-family: sans-serif; margin: 2rem; }
        h1 { font-size: 1.5rem; }
        ul { list-style: none; padding: 0; }
        li { margin-bottom: 0.5rem; }
        code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>Available API Functions</h1>
      <ul>
  `

  try {
    const files = await fs.readdir(functionsDir)
    const functionFiles = files
      .filter((f) => f.endsWith('.ts') || f.endsWith('.mts') || f.endsWith('.mjs'))
      .filter((f) => f !== 'api.mts' && f !== 'index.ts' && f !== 'index.mts')

    for (const file of functionFiles) {
      const name = file.replace(/\.(ts|mts|mjs)$/, '')
      html += `<li><a href="/api/${name}"><code>/api/${name}</code></a></li>`
    }
  } catch (err) {
    html += `<li>Error reading functions directory: ${(err as Error).message}</li>`
  }

  html += `
      </ul>
    </body>
  </html>`

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}
