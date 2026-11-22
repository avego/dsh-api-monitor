# Catalog submission

Material for listing this plugin in the community catalog that the
[dsh-market](https://github.com/dsh-market/dsh-market) plugin and
`awesome-dsh-plugin.com` read. Nothing here ships with the plugin.

The catalog is a separate repository, **awesome-dsh-plugin/awesome-dsh-plugin**;
entries are one YAML file per plugin under `data/plugins/`.

## Opening the pull request

1. Fork `awesome-dsh-plugin/awesome-dsh-plugin` and clone it.
2. Copy `avego__dsh-api-monitor.yml` from this directory to
   `data/plugins/avego__dsh-api-monitor.yml` — the file name is
   `<owner>__<repo>.yml`, and the path must match the repository exactly.
3. Commit that one file and open the PR. Do not edit either README: both are
   generated from `data/plugins/` after the merge, and hand edits are rejected.

Preview locally only if you want to: `npm ci && node scripts/generate-readme.mjs`.

## Rules this entry is written against

Read the authoritative version at
[contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md);
in short:

- The repository has to be **more than a day old** when CI runs. It was created
  on 2026-11-22, so an earlier PR is refused automatically.
- The repository needs the **`dsh-plugin`** topic on GitHub.
- `package.json` must declare **`dsh.bundle`** — done here (`bundle.patch`).
  `dsh.client` alone is not installable, and that is the most common rejection.
- A `cordis.patch.yml` must sit in the repository root — done.
- The entry has to be the plugin's own category, and the description has to
  match what the code does; the reviewer checks each claim against the source.
- Only `description.en` is required. `description.zh` is optional — a
  maintainer adds it.

A description containing `": "` has to be quoted in YAML or the parser reads it
as a nested key. The one here contains no colon-space sequence.

## Screenshots

Storefronts show AppStore-style screenshots for a plugin. They are declared **in
this repository**, not in the catalog: a `screenshots.json` next to
`package.json` listing 1–8 image paths relative to that file.

```json
[
  "docs/shots/monitor.png",
  "docs/shots/search.png"
]
```

`{"screenshots": [...]}` is accepted too if a named field is preferred.

There is no `screenshots.json` here yet, because it needs real captures of the
running plugin, and the DSH window is not reachable from the machine that
prepared this repository. Declaring nothing is safe: storefronts then fall back
to images extracted from the README, and these READMEs contain none, so the card
shows the icon alone.

To add them later, capture 2–3 PNGs, drop them under `docs/shots/`, write the
file, and push — the next nightly catalog build picks it up with no pull
request.

Rules: 1–8 images, relative paths may not leave the plugin directory (no leading
`/`, no `..`), and absolute URLs must be https on GitHub hosting — third-party
image hosts are refused.

