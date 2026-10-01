# Security Policy

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security problems.

Report vulnerabilities in this integration privately to **<security-contact@example.com>**
<!-- TODO: replace with the mailbox monitored by the maintainers, e.g. the Adyen or
     commercetools responsible-disclosure address, and/or enable GitHub private
     vulnerability reporting for this repository (Settings > Code security). -->

Include the affected module (`extension` or `notification`), the version or commit, and
steps to reproduce. You should receive an acknowledgement within **5 business days**.
<!-- TODO: confirm the SLA with the maintainers. -->

Vulnerabilities in Adyen's own platform or APIs should be reported through
[Adyen's responsible disclosure programme](https://www.adyen.com/policies-and-disclaimer/responsible-disclosure),
and vulnerabilities in commercetools through
[commercetools' security contact](https://commercetools.com/security).

## Supported versions

Only the latest minor release line receives security fixes. Older lines are not patched.

| Version | Supported |
| ------- | --------- |
| 11.11.x | yes       |
| < 11.11 | no        |

<!-- TODO: keep this table in sync with releases. -->

## Supply-chain safeguards in this repository

- Dependencies are installed from lock files only (`npm ci`), validated with `lockfile-lint`,
  and audited in CI (`npm audit --omit=dev --audit-level=high`).
- Dependency updates are opened by Renovate after a 30-day release age and are not auto-merged
  for production dependencies.
- GitHub Actions are pinned to commit SHAs; container base images are pinned by digest.
- Release images are scanned with Trivy before publishing and ship with provenance and SBOM
  attestations. Verify a release with:

  ```
  gh attestation verify oci://index.docker.io/commercetools/commercetools-adyen-integration-extension@<digest> --repo Adyen/adyen-commercetools
  ```
