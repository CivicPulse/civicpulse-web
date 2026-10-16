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
internally. The separate project runtime is fixed to Node 22.22.0, matching the
locked Astro package's `engines.node: >=22.22.0`. The official
[Node 22.22.0 release](https://nodejs.org/en/blog/release/v22.22.0) confirms that
runtime exists. Earlier 22.12 guidance is insufficient for this lockfile. Local
validation evidence so far used Node 26.11.1; this inactive template is not proof
of a GitHub-hosted or Node 22.22.0 execution.

Full action SHAs follow GitHub's
[secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).
Pin verification and input review are not a complete action implementation audit.
Reverify pins, runtime compatibility and caller isolation during activation review.
