import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4317', // Jaeger connection
});

export const otelSDK = new NodeSDK({
  serviceName: 'madlen-backend', // Simple configuration without manual Resource creation
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

// Graceful shutdown
process.on('SIGTERM', () => {
  otelSDK.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error: any) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});