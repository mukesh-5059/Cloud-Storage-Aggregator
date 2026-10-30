#!/bin/bash
echo "=== Applying Failover Configuration & Starting backend2 ==="
cp nginx/nginx-failover.conf nginx/nginx.conf
docker compose start backend2
docker compose restart nginx
sleep 2
echo "=== Running Test WITH Failover ==="
(sleep 2 && docker kill backend2) &
docker run --rm -i --network=host grafana/k6 run - < k6/failover_test.js
