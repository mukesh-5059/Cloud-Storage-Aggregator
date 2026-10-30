import http from 'k6/http';
import { check, sleep } from 'k6';

const ENDPOINTS = [
  'http://localhost:8080/healthz',
  'http://localhost:8080/files/room/1',
  'http://localhost:8080/files/1/download',
];

export const options = {
  scenarios: {
    failover_demo: {
      executor: 'constant-vus',
      vus: 10,
      duration: '8s',
    },
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
  sleep(0.02); // 20ms pause for smooth 8-second traffic stream
}
