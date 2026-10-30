import http from 'k6/http';
import { check } from 'k6';

const ENDPOINTS = [
  'http://localhost:8080/healthz',
  'http://localhost:8080/files/room/1',
  'http://localhost:8080/files/1/download',
];

export const options = {
  scenarios: {
    peak_demand_test: {
      executor: 'shared-iterations',
      vus: 20,
      iterations: 1000,
      maxDuration: '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const url = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const res = http.get(url, {
    responseCallback: http.expectedStatuses(200, 401),
  });
  check(res, {
    'successful backend response': (r) => r.status === 200 || r.status === 401,
  });
}
