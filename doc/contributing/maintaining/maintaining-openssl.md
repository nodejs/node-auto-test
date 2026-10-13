# Maintaining OpenSSL

Node.js bundles upstream OpenSSL sources in `deps/openssl/openssl/` and generated
build files in `deps/openssl/config/`. An update has two commits: one imports the
upstream sources, and the other updates the generated files.

## Automated updates

The [OpenSSL update workflow][] runs weekly and can also be started manually.
Both triggers update every branch and OpenSSL series in the workflow matrix.
Edit the matrix when changing the series maintained on a target branch.

Each target has its own update branch and pull request, with the target branch
as the pull request base. The workflow uses the updater from its own revision,
so the target branch does not need the latest updater. It imports the latest
stable patch release in the configured series and skips targets already on that
version.

The workflow commits the upstream sources and generated files separately, then
opens or updates the pull request after generation succeeds. Release branch pull
request titles are prefixed with the release line (for example, `[v26.x]` for
`v26.x-staging`); commit messages are not prefixed. Updates targeting `main` get
`dont-land-on-v22.x`, `dont-land-on-v24.x`, and `dont-land-on-v26.x` labels.

The workflow does not build or test Node.js. Review and CI are required before
landing the update.

## Local updates

The [OpenSSL updater][] provides separate `download` and `regenerate` commands.
Run the following commands from the repository root after checking out the target
branch.

For the full procedure, use a Linux environment with:

* A Node.js executable with `fetch` support, plus `curl`, `gzip`, `tar`, and `shasum`
  for downloading and extracting sources.
* `make` and a working Docker installation for regeneration.

The updater uses `out/Release/node` if available, otherwise `node` from `PATH`.
Set `NODE` to an executable path to override that choice. Set `NODE_DIR` to an
absolute repository path to update a checkout other than the one containing the
script.

### 1. Import and commit upstream sources

Select the OpenSSL `major.minor` series for the target branch, for example:

```bash
./tools/dep_updaters/update-openssl.sh download 3.5
```

Without a series argument, `download` uses the series in the checkout's generated
OpenSSL version header. It selects the latest stable patch release, excluding
prereleases, and replaces `deps/openssl/openssl/`. If the version is unchanged,
it exits without replacing the sources; no regeneration is needed.

To import a specific release manually, replace `deps/openssl/openssl/` with the
contents of the upstream `openssl-<version>` tag, excluding the clone's `.git`
directory.

Review and commit the source changes before generating platform files:

```bash
git diff -- deps/openssl/openssl
git add -A deps/openssl/openssl
git commit
```

Use the imported version in the commit title:

```text
deps: upgrade openssl sources to openssl-<version>
```

### 2. Regenerate platform-specific files

```bash
./tools/dep_updaters/update-openssl.sh regenerate
```

The script clears the old generated files and adjusts `#ifdef` and `#endif`
directives in `crypto/perlasm/x86asm.pl` for NASM compatibility on 32-bit Windows.
It then runs `make gen-openssl`, which generates files for all supported targets
inside the container defined by `deps/openssl/config/Dockerfile`. This keeps the
generation toolchain consistent across updates.

Generated output includes assembly, headers, and `.gypi` source lists under
`deps/openssl/config/archs/`, as well as wrapper headers in `deps/openssl/config/`.
Node.js checks these files in so that ordinary builds do not need to run
OpenSSL's Perl-based generation process.

When upgrading to a new OpenSSL series, review the configuration options and
generator templates for upstream build changes. Windows generation uses the
hand-maintained `deps/openssl/config/Makefile_VC-WIN*` files, which may also need
updates when upstream sources or build rules change.

### 3. Review and commit generated files

Review the diff for added or removed sources, generated build lists, and
architecture-specific changes. Timestamp changes in `buildinf.h` are expected.

```bash
git diff -- deps/openssl
git add -A deps/openssl
git commit
```

Use the same version in the second commit title:

```text
deps: update archs files for openssl-<version>
```

Follow the [commit message guidelines][] for both commits.

### 4. Build and test

Follow [BUILDING.md][] to build Node.js with the bundled OpenSSL. A build using
shared OpenSSL does not validate the updated dependency. Check
`process.versions.openssl` in the built binary, run the crypto, Web Crypto, and TLS
tests, and complete CI across the supported platforms before landing.

[BUILDING.md]: ../../../BUILDING.md
[OpenSSL update workflow]: ../../../.github/workflows/update-openssl.yml
[OpenSSL updater]: ../../../tools/dep_updaters/update-openssl.sh
[commit message guidelines]: ../pull-requests.md#commit-message-guidelines
