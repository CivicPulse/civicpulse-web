# Inactive validation workflow

`validate.yml.example` lives outside `.github/workflows` and cannot execute as an
Actions workflow from this location. It has not been activated or run on GitHub.
Review and lead coordination are required before any future installation/push.

The template uses a disposable hosted runner, a 20-minute limit, read-only
repository permission and checkout without persisted credentials. No production
environment, secret references, OIDC permission, write token, privileged PR
trigger, caches, artifact handoff or provider/deployment commands are present.
PR code and dependency lifecycle scripts are untrusted: the future workflow
caller must supply **no production secrets**. Neither the YAML nor the validation
script establishes a sandbox or trusted production origin.

## Verified source pins

Verified against official repositories on 2026-10-16 using `git ls-remote --tags`:

| Action | Release tag | Full commit pin / reviewed action metadata |
| --- | --- | --- |
| `actions/checkout` | [`v7.0.1`](https://github.com/actions/checkout/releases/tag/v7.0.1) | [`3d3c42e5aac5ba805825da76410c181273ba90b1`](https://github.com/actions/checkout/blob/3d3c42e5aac5ba805825da76410c181273ba90b1/action.yml) |
| `actions/setup-node` | [`v6.5.0`](https://github.com/actions/setup-node/releases/tag/v6.5.0) | [`249970729cb0ef3589644e2896645e5dc5ba9c38`](https://github.com/actions/setup-node/blob/249970729cb0ef3589644e2896645e5dc5ba9c38/action.yml) |

```sh
git ls-remote --tags https://github.com/actions/checkout.git refs/tags/v7.0.1
git ls-remote --tags https://github.com/actions/setup-node.git refs/tags/v6.5.0
actionlint docs/workflow-templates/validate.yml.example
```

The official pinned metadata defines `persist-credentials` and
`package-manager-cache`; the template disables both. Both actions use Node 24
internally. The separate project runtime is fixed to Node 22.23.2, meeting the
locked Astro requirement `>=22.22.0`. Developer M1 validation used the existing
cached official `node:22-bookworm-slim` linux/amd64 image, immutable local image ID
`sha256:6e6261159fd399ebe5a3d556b7d89da9c85c873f3f270918aad6c8107da8b411`,
measured `node --version` = `v22.23.2`. It ran with network disabled, read-only
container root and writable temporary HOME/source/dependency copies; SELinux
remained enabled. The 71 focused tests, normal local build and private-output
checks passed. Dependencies were copied from the locked installed tree, not
freshly installed in this run. This is local runtime evidence, not a GitHub-hosted
execution or activated workflow. No global runtime installation was performed.

Full action SHAs follow GitHub's
[secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).
Pin verification and input review are not a complete action implementation audit.
Reverify pins, runtime compatibility and caller isolation during activation review.
