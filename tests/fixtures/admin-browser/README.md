# Local mocked admin browser surface

These files are **test-only**, outside Astro's source/public trees. They are not
runtime flags, a backend authorization test, a second deployment artifact, or a
provider integration. The existing API v1 methods are represented only to drive
ordinary browser interactions without credentials or hosted mutations. Actual
controller/serialization tests live in `tests/admin-controller.mjs` and
`tests/admin-fields.mjs`; hosted backend guards have separate evidence.

After committing the UI, create a disposable archive:

```
node tests/prepare-admin-browser-fixture.mjs FULL_WEB_COMMIT /absolute/locked/source/node_modules
```

The script requires an identical lockfile for declared dependency reuse (not a
fresh install), replaces the two API/Auth modules only inside that archive, adds
an unmistakable local fixture banner, and writes fake browser-safe configuration.
It does not read or copy any ignored config or session. In the printed `source`
directory run the normal `npm run build`, then Astro preview on a free local port.
The normal prebuild privacy preparation runs against the archive's reviewed input.

Never upload this fixture output. Release artifacts must come from a separate,
clean archive with the real public configuration and no fixture module/banner.
