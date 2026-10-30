#!/bin/bash
echo "=== Running Test WITHOUT Failover ==="
(sleep 2 && docker kill backend2) &
docker run --rm -i --network=host grafana/k6 run - < k6/failover_test.js
