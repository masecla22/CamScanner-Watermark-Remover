# remover-frontend

The Next.js frontend for the CamScanner Watermark Remover. All processing runs entirely in the browser using [pdf-lib](https://github.com/Hopding/pdf-lib). No data is sent to any server.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build (static export)

```bash
npm run build
```

Output lands in `out/`. The site is fully static -- no Node.js server is required at runtime. Serve `out/` with any static file host or web server.

To build with a base path (required for GitHub Pages subdirectory hosting):

```bash
BASE_PATH=/CamScanner-Watermark-Remover npm run build
```

## Stack

- Next.js 16 with `output: "export"` for fully static output
- React 19
- Tailwind CSS v4
- shadcn/ui component primitives
- pdf-lib for PDF parsing and manipulation

