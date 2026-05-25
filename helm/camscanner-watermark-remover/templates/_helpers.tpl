{{/*
Expand the name of the chart.
*/}}
{{- define "camscanner-watermark-remover.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "camscanner-watermark-remover.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart label.
*/}}
{{- define "camscanner-watermark-remover.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "camscanner-watermark-remover.labels" -}}
helm.sh/chart: {{ include "camscanner-watermark-remover.chart" . }}
{{ include "camscanner-watermark-remover.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "camscanner-watermark-remover.selectorLabels" -}}
app.kubernetes.io/name: {{ include "camscanner-watermark-remover.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
The image tag to use — falls back to .Chart.AppVersion.
*/}}
{{- define "camscanner-watermark-remover.imageTag" -}}
{{- .Values.image.tag | default .Chart.AppVersion }}
{{- end }}
