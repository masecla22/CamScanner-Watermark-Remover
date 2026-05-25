<div align="center">
    <img alt="License" height="26" src="https://img.shields.io/github/license/masecla22/CamScanner-Watermark-Remover?style=for-the-badge">
    <img alt="GitHub forks" height="26" src="https://img.shields.io/github/forks/masecla22/CamScanner-Watermark-Remover?style=for-the-badge">
    <img alt="GitHub stars" height="26" src="https://img.shields.io/github/stars/masecla22/CamScanner-Watermark-Remover?style=for-the-badge">
    <img alt="Docker" height="26" src="https://img.shields.io/badge/ghcr.io-masecla22%2Fcamscanner--watermark--remover-blue?style=for-the-badge&logo=github">
</div>

<div align="center">
    <img alt="github" height="56" src="https://cdn.jsdelivr.net/npm/@intergrav/devins-badges@3/assets/cozy/available/github_vector.svg">
    <img alt="git" height="56" src="https://cdn.jsdelivr.net/npm/@intergrav/devins-badges@3/assets/cozy/available/git_vector.svg">
    <img alt="generic" height="56" src="https://cdn.jsdelivr.net/npm/@intergrav/devins-badges@3/assets/cozy/documentation/generic_vector.svg">
    <img alt="pc" height="56" src="https://cdn.jsdelivr.net/npm/@intergrav/devins-badges@3/assets/cozy/supported/pc_vector.svg">
<img alt="ps3" height="56" src="https://cdn.jsdelivr.net/npm/@intergrav/devins-badges@3/assets/cozy/supported/ps3_vector.svg">
</div>

<br>

<p align="center">
  <img src="https://github.com/masecla22/CamScanner-Watermark-Remover/blob/master/assets/logo.png?raw=true" width="30%">
</p>

# CamScanner Watermark Remover

A browser-only tool that strips CamScanner watermarks from PDF files. No server, no uploads, no accounts. The file never leaves your machine.

## What it does

CamScanner embeds its watermark as a PDF XObject drawn via a `Do` operator inside a `q ... Q` graphics state block at the bottom of each page. This tool parses the raw PDF content streams using [pdf-lib](https://github.com/Hopding/pdf-lib), identifies those XObject draw calls by name (the conventional name is `/X1`) and by geometry (a `cm` matrix block with a small scaled height at the bottom strip of the page), then removes the entire `q ... Q` block containing the draw call. The XObject resource itself is also dropped from the page's resource dictionary. The resulting PDF is byte-for-byte identical to the original except those blocks are gone.

All of this runs in WebAssembly-capable browsers with no native dependencies. There is no backend.

## Live demo

Deployed via GitHub Pages: https://masecla22.github.io/CamScanner-Watermark-Remover/

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Drop a PDF on the page, click Process, download the result.

## Docker

A pre-built image is published to the GitHub Container Registry on every push to `master` and on version tags.

```bash
docker pull ghcr.io/masecla22/camscanner-watermark-remover:latest
docker run -p 8080:80 ghcr.io/masecla22/camscanner-watermark-remover:latest
```

The image is a multi-stage build: Node 20 compiles the Next.js static export, then nginx serves the resulting `out/` directory. There is no Node process running at runtime.

To build the image yourself:

```bash
docker build -t camscanner-watermark-remover .
docker run -p 8080:80 camscanner-watermark-remover
```

## Helm chart

The Helm chart deploys the nginx container into a Kubernetes cluster. It is published to the GHCR OCI registry alongside the Docker image.

### Prerequisites

- Helm 3.8 or later (OCI registry support is enabled by default from 3.8)
- A running Kubernetes cluster

### Install

Add the registry and install:

```bash
helm install camscanner-watermark-remover \
  oci://ghcr.io/masecla22/charts/camscanner-watermark-remover \
  --version 0.1.0
```

To install into a specific namespace:

```bash
helm install camscanner-watermark-remover \
  oci://ghcr.io/masecla22/charts/camscanner-watermark-remover \
  --version 0.1.0 \
  --namespace watermark-tools \
  --create-namespace
```

### Upgrade

```bash
helm upgrade camscanner-watermark-remover \
  oci://ghcr.io/masecla22/charts/camscanner-watermark-remover \
  --version <new-version>
```

### Uninstall

```bash
helm uninstall camscanner-watermark-remover
```

### Configuration

All configurable values and their defaults:

| Value | Default | Description |
|---|---|---|
| `replicaCount` | `1` | Number of pod replicas |
| `image.repository` | `ghcr.io/masecla22/camscanner-watermark-remover` | Container image repository |
| `image.tag` | `""` | Image tag. Defaults to the chart's `appVersion` when empty |
| `image.pullPolicy` | `IfNotPresent` | Kubernetes image pull policy |
| `imagePullSecrets` | `[]` | List of image pull secret names for private registries |
| `nameOverride` | `""` | Override the chart name component of generated resource names |
| `fullnameOverride` | `""` | Override the full name of generated resources entirely |
| `service.type` | `ClusterIP` | Kubernetes Service type (`ClusterIP`, `NodePort`, `LoadBalancer`) |
| `service.port` | `80` | Port the Service exposes |
| `ingress.enabled` | `false` | Create an Ingress resource |
| `ingress.className` | `""` | `ingressClassName` on the Ingress object |
| `ingress.annotations` | `{}` | Annotations added to the Ingress (e.g. cert-manager, nginx rewrites) |
| `ingress.hosts` | see values.yaml | List of host/path rules |
| `ingress.tls` | `[]` | TLS configuration for the Ingress |
| `resources` | `{}` | CPU and memory requests/limits for the container |
| `autoscaling.enabled` | `false` | Enable a HorizontalPodAutoscaler |
| `autoscaling.minReplicas` | `1` | Minimum replica count when autoscaling is on |
| `autoscaling.maxReplicas` | `5` | Maximum replica count when autoscaling is on |
| `autoscaling.targetCPUUtilizationPercentage` | `80` | CPU target for the HPA |
| `nodeSelector` | `{}` | Node selector constraints for pod scheduling |
| `tolerations` | `[]` | Toleration rules for pod scheduling |
| `affinity` | `{}` | Affinity rules for pod scheduling |

### Common deployment examples

**Expose via LoadBalancer (quick cluster test):**

```bash
helm install camscanner-watermark-remover \
  oci://ghcr.io/masecla22/charts/camscanner-watermark-remover \
  --set service.type=LoadBalancer
```

**Expose via Ingress with nginx and TLS:**

```yaml
# values-prod.yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: watermark.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: watermark-tls
      hosts:
        - watermark.example.com
```

```bash
helm install camscanner-watermark-remover \
  oci://ghcr.io/masecla22/charts/camscanner-watermark-remover \
  -f values-prod.yaml
```

**Pin a specific image tag:**

```bash
helm install camscanner-watermark-remover \
  oci://ghcr.io/masecla22/charts/camscanner-watermark-remover \
  --set image.tag=sha-abc1234
```

**Set resource limits:**

```bash
helm install camscanner-watermark-remover \
  oci://ghcr.io/masecla22/charts/camscanner-watermark-remover \
  --set resources.requests.cpu=50m \
  --set resources.requests.memory=64Mi \
  --set resources.limits.cpu=200m \
  --set resources.limits.memory=128Mi
```

**Enable horizontal autoscaling:**

```bash
helm install camscanner-watermark-remover \
  oci://ghcr.io/masecla22/charts/camscanner-watermark-remover \
  --set autoscaling.enabled=true \
  --set autoscaling.minReplicas=2 \
  --set autoscaling.maxReplicas=10 \
  --set autoscaling.targetCPUUtilizationPercentage=60
```

### Pulling the chart locally

To inspect or modify the chart before installing:

```bash
helm pull oci://ghcr.io/masecla22/charts/camscanner-watermark-remover \
  --version 0.1.0 \
  --untar
```

This extracts the chart into a local `camscanner-watermark-remover/` directory.

## CI/CD

Three GitHub Actions workflows run on push to `master` and on `v*` tags:

- **docker.yml** -- builds the Docker image and pushes it to `ghcr.io/masecla22/camscanner-watermark-remover`. Tags produced: `latest` (master only), `sha-<short>`, and semver tags when a `v*` tag is pushed.
- **helm.yml** -- packages the Helm chart and pushes it to `ghcr.io/masecla22/charts` as an OCI artifact. Chart version follows the git tag (e.g. `v1.2.3` becomes chart version `1.2.3`), or `0.0.0-<sha>` for branch pushes.
- **pages.yml** -- builds the Next.js static site with `BASE_PATH=/CamScanner-Watermark-Remover` and deploys it to GitHub Pages.

## License

